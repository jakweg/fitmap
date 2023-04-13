<script lang="ts">
	import { openIndexedDatabase, promiseWrapRequest } from '../../lib/idb'

	const openDb = () =>
		openIndexedDatabase('fitmap', 1, db => {
			const store = db.createObjectStore('recordedActivities', { keyPath: 'logId' })
			store.createIndex('missingTcxData', 'missingTcxData', { unique: false })
		})

	const makeApiCall = async (
		options: ({ fullUrl: string } | { endpoint: string; params: { [key: string]: string } }) & {
			asText?: boolean
		},
	) => {
		const accessToken = localStorage.getItem('accessToken')
		if (!accessToken) throw new Error('Missing access token')

		let fullUrl = 'fullUrl' in options ? options.fullUrl : ''
		if (!fullUrl) {
			const params = new URLSearchParams((options as any).params)

			fullUrl = `https://api.fitbit.com/1/user/-/${(options as any).endpoint}?${params}`
		}

		const response = await fetch(fullUrl, {
			headers: {
				Authorization: 'Bearer ' + accessToken,
			},
		})
		if (!response.ok) throw new Error()
		if (options.asText) return await response.text()
		return await response.json()
	}

	const downloadList = async () => {
		const userId = localStorage.getItem('userId')
		const allActivities: any[] = []
		const response = await makeApiCall({
			endpoint: 'activities/list.json',
			params: {
				beforeDate: new Date().toISOString().substring(0, 19),
				limit: '100',
				sort: 'asc',
				offset: '0',
			},
		})
		allActivities.push(...response.activities)
		let next = response.pagination.next
		while (next) {
			const response = await makeApiCall({ fullUrl: next })
			next = response.pagination.next
			allActivities.push(...response.activities)
		}

		const normalizedActivities = allActivities
			.filter(a => a.activityTypeId === 90009 || a.activityTypeId === 90001) // only runs or bikes
			.filter(a => a.logType !== 'auto_detected') // exclude auto walks
			.filter(a => !!a.tcxLink) // ignore if missing location data
			.map(a => ({
				logId: a.logId,
				userId,
				tcxLink: a.tcxLink,
				missingTcxData: 'T',
			}))

		const db = await openDb()

		const transaction = db.transaction(['recordedActivities'], 'readwrite')
		const store = transaction.objectStore('recordedActivities')
		await Promise.allSettled(
			normalizedActivities.map(a =>
				promiseWrapRequest(store.add(a)).catch(e => e.preventDefault()),
			),
		)

		db.close()
	}

	const downloadTcx = async () => {
		const userId = localStorage.getItem('userId')
		const db = await openDb()

		const transaction = db.transaction(['recordedActivities'], 'readonly')
		const values = (
			await promiseWrapRequest(
				transaction
					.objectStore('recordedActivities')
					.index('missingTcxData')
					.getAll(IDBKeyRange.only('T')),
			)
		).filter(v => v.userId === userId)

		const parser = new DOMParser()

		await Promise.allSettled(
			values.map(async v => {
				const content = await makeApiCall({ fullUrl: v.tcxLink, asText: true })
				const document = parser.parseFromString(content, 'text/xml')
				const points = Array.from(document.querySelectorAll('Position'))
				const positionPoints = new Float64Array(points.length * 2)

				let i = 0
				for (const position of points) {
					const lat = +(position.querySelector('LatitudeDegrees')?.textContent ?? 0)
					const lng = +(position.querySelector('LongitudeDegrees')?.textContent ?? 0)
					positionPoints[i * 2] = lat
					positionPoints[i * 2 + 1] = lng
					i++
				}

				const transaction = db.transaction('recordedActivities', 'readwrite')
				await promiseWrapRequest(
					transaction
						.objectStore('recordedActivities')
						.put({ ...v, missingTcxData: 'F', tcxData: positionPoints }),
				)
			}),
		)

		db.close()
	}
</script>

<button on:click={downloadList}>Download activities list</button>
<button on:click={downloadTcx}>Download tcx data</button>
