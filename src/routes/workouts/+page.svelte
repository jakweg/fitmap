<script lang="ts">
	const makeApiCall = async (
		options: { fullUrl: string } | { endpoint: string; params: { [key: string]: string } },
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
		return await response.json()
	}

	const downloadList = async () => {
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
		let pagination = response.pagination.next
		while (pagination) {
			const response = await makeApiCall({ fullUrl: pagination.next })
			pagination = response.pagination.next
			allActivities.push(...response.activities)
		}

		const normalizedActivities = allActivities
			.filter((a) => a.activityTypeId === 90009) // only runs
			.filter((a) => a.logType !== 'auto_detected') // exclude auto walks
			.map((a) => ({
				logId: a.logId,
				tcxLink: 'https://api.fitbit.com/1/user/-/activities/53618063201.tcx',
			}))

		console.log(normalizedActivities)
	}

	const loadData = () => {
		downloadList()
	}
</script>

<button on:click={loadData}>Download data</button>
