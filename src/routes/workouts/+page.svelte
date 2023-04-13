<script lang="ts">
	import { onMount } from 'svelte'

	import { openIndexedDatabase, promiseWrapRequest } from '../../lib/idb'
	import Libre from './libre.svelte'

	let firstFetched: string = '?'
	let status = 'idle'

	const openDb = () =>
		openIndexedDatabase('fitmap', 1, db => {
			const store = db.createObjectStore('recordedActivities', { keyPath: 'logId' })
			store.createIndex('missingTcxData', 'missingTcxData', { unique: false })
		})

	const updateStats = async () => {
		firstFetched = localStorage.getItem('first-workout-fetched') || 'never'

		const db = await openDb()
		const transaction = db.transaction(['recordedActivities'], 'readonly')
		const readyWorkouts = await promiseWrapRequest(
			transaction
				.objectStore('recordedActivities')
				.index('missingTcxData')
				.count(IDBKeyRange.only('F')),
		)
		const notReadyWorkouts = await promiseWrapRequest(
			transaction
				.objectStore('recordedActivities')
				.index('missingTcxData')
				.count(IDBKeyRange.only('T')),
		)
		firstFetched += ` ready ${readyWorkouts}, missing ${notReadyWorkouts}`
		db.close()
	}

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
		status = 'downloading first'
		const startingPoint = localStorage.getItem('first-workout-fetched')
		const response = await (startingPoint
			? makeApiCall({
					endpoint: 'activities/list.json',
					params: {
						afterDate: startingPoint.substring(0, 19),
						limit: '100',
						sort: 'asc',
						offset: '0',
					},
			  })
			: makeApiCall({
					endpoint: 'activities/list.json',
					params: {
						beforeDate: new Date().toISOString().substring(0, 19),
						limit: '100',
						sort: 'desc',
						offset: '0',
					},
			  }))
		allActivities.push(...response.activities)
		let i = 0
		let next = response.pagination.next
		while (next) {
			status = 'downloading next ' + ++i
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
		status = 'idle'
		localStorage.setItem('first-workout-fetched', response.activities[0]?.lastModified ?? '')
		updateStats()
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

		status = 'Downloading tcx...'
		let doneCounter = 0
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
				doneCounter++
				status = `Downloading tcx... ${doneCounter} / ${values.length}`
			}),
		)
		status = `Done ${doneCounter} / ${values.length}`
		updateStats()

		db.close()
	}

	let feature: any = null
	const loadTcx = async () => {
		const userId = localStorage.getItem('userId')
		const db = await openDb()

		const transaction = db.transaction(['recordedActivities'], 'readonly')
		const values = (
			await promiseWrapRequest(
				transaction
					.objectStore('recordedActivities')
					.index('missingTcxData')
					.getAll(IDBKeyRange.only('F')),
			)
		).filter(v => v.userId === userId)

		const getCoordinatesFromArray = (array: Float64Array) => {
			const length = (array.length / 2) | 0
			const points: [number, number][] = []
			for (let i = 0; i < length; ++i) {
				points.push([array[i * 2 + 1], array[i * 2]])
			}
			return points
		}

		feature = {
			type: 'FeatureCollection',
			features: values.map(workout => ({
				type: 'Feature',
				geometry: {
					type: 'LineString',
					coordinates: getCoordinatesFromArray(workout.tcxData),
				},
			})),
		}
		status = `Loaded ${values.length} workouts`
	}

	onMount(() => updateStats())
</script>

<button on:click={downloadList}>Download activities list</button>
<button on:click={downloadTcx}>Download tcx data</button>
<button on:click={loadTcx}>Load tcx data</button>
<p>latest workout {firstFetched}</p>
<p>{status}</p>
<Libre geoJSONData={feature} />
