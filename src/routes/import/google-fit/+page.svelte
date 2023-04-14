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

	const parseSingleWorkoutFile = (key: string, parsed: XMLDocument) => {
		const foundActivities: Workout[] = []
		let activityIndex = 0
		for (const activity of parsed.getElementsByTagName('Activity')) {
			const positionElements = activity.getElementsByTagName('Position')
			if (positionElements.length === 0) continue
			if (positionElements.length < 20) continue

			const coords = new Float64Array(positionElements.length * 2)
			let i = 0
			for (const position of positionElements) {
				const lat = position.getElementsByTagName('LatitudeDegrees')[0]?.textContent
				const lng = position.getElementsByTagName('LongitudeDegrees')[0]?.textContent
				coords[i * 2] = +(lat || '0')
				coords[i * 2 + 1] = +(lng || '0')
				++i
			}
			foundActivities.push({
				id: key,
				[WorkoutKey.UUID]: createUUIDByProvider('google-fit', activityIndex++ + '/' + key),
				[WorkoutKey.Provider]: 'google-fit',
				[WorkoutKey.HasLocationData]: LocationDataStatus.Present,
				[WorkoutKey.Type]: WorkoutType.Other,
				locationData: coords,
			})
		}
		return foundActivities
	}

	const parseWorkoutsFromZip = async (file: File) => {
		const parser = new DOMParser()
		const info = await unzip(file)
		const workouts = await Promise.all(
			Object.entries(info.entries)
				.filter(([key]) => key.endsWith('.tcx'))
				.map(async ([key, file]) =>
					parseSingleWorkoutFile(key, parser.parseFromString(await file.text(), 'text/xml')),
				),
		)
		return filterNotNullable(workouts.flat())
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

<h1>Import google fit data</h1>
<p>Working {working}</p>
<button on:click={startImporting}>Import</button>
