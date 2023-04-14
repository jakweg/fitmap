<script lang="ts">
	import { filterNotNullable } from '@lib/util'
	import type Workout from '@lib/workout-model'
	import { LocationDataStatus, WorkoutKey, WorkoutType } from '@lib/workout-model'
	import { createUUIDByProvider, insertWorkouts } from '@lib/workouts-database'
	import { unzip } from 'unzipit'

	let working: boolean = false

	const queryForFile = async () => {
		const input = document.createElement('input')
		input.type = 'file'
		input.accept = '.zip'
		input.click()
		return new Promise<File>(
			resolve =>
				(input.onchange = () => {
					const f = (input as any).files[0]
					if (f) resolve(f)
				}),
		)
	}

	const parseSingleWorkout = (key: string, object: any) => {
		const points = (object as any[]).findLast(e => 'points' in e)?.points as any[]
		if (!points) return
		const positions = new Float64Array(points.length * 2)
		let missing = 0
		for (let i = 0, l = points.length; i < l; ++i) {
			const location = (points[i] as any[]).find(e => 'location' in e)?.location as any[]
			if (!location) {
				missing++
				continue
			}
			const lat = (location[0] as any[]).find(e => 'latitude' in e)?.latitude
			if (!lat) {
				missing++
				continue
			}
			const lng = (location[0] as any[]).find(e => 'longitude' in e)?.longitude
			if (!lng) {
				missing++
				continue
			}
			positions[i * 2] = lat
			positions[i * 2 + 1] = lng
		}

		return {
			id: key,
			[WorkoutKey.UUID]: createUUIDByProvider('endomondo', key),
			[WorkoutKey.Provider]: 'endomondo',
			[WorkoutKey.HasLocationData]: LocationDataStatus.Present,
			[WorkoutKey.Type]: WorkoutType.Other,
			locationData: missing > 0 ? positions.slice(0, (points.length - missing) * 2) : positions,
		} satisfies Workout
	}

	const parseWorkoutsFromZip = async (file: File) => {
		const info = await unzip(file)
		const workouts = await Promise.all(
			Object.entries(info.entries)
				.filter(([key]) => key.startsWith('Workouts/') && key.endsWith('.json'))
				.map(async ([key, workout]) => parseSingleWorkout(key, await workout.json())),
		)
		return filterNotNullable(workouts)
	}

	const startImporting = async () => {
		const file = await queryForFile()
		if (!file) return
		working = true

		try {
			const workouts = await parseWorkoutsFromZip(file)
			await insertWorkouts(workouts)
		} finally {
			working = false
		}
	}
</script>

<h1>Import endomondo data</h1>
<p>Working {working}</p>
<button on:click={startImporting}>Import</button>
