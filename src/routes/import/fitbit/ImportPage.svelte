<script lang="ts">
	import { createUpdater, downloadLocations } from '@lib/fitbit-data-updater'
	import type { FitbitUser } from '@lib/store/user'
	import { getAllWorkoutsRequiringTcxDownload } from '@lib/workouts-database'

	export let user: FitbitUser
	let loading = true
	let loadedWorkouts = 0
	let foundWorkouts = 0

	const refreshWorkoutsList = async () => {
		loading = true
		try {
			await createUpdater(user.accessToken, user.latestWorkout, (loaded, found) => {
				loadedWorkouts = loaded
				foundWorkouts = found
			})
		} catch (e) {
			console.error(e)
		}
		loading = false
	}

	const downloadMissingLocations = async () => {
		loading = true
		try {
			const workoutsToDownload = await getAllWorkoutsRequiringTcxDownload()
			await downloadLocations(workoutsToDownload, user.accessToken, (loaded, found) => {
				loadedWorkouts = loaded
				foundWorkouts = found
			})
		} catch (e) {
			console.error(e)
		}
		loading = false
	}
</script>

<button on:click={refreshWorkoutsList}>Refresh list</button>
<button on:click={downloadMissingLocations}>Download missing locations</button>
<h6>Having {loadedWorkouts} / {foundWorkouts}</h6>
