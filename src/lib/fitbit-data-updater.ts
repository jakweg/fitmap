import { makeFitbitApiCall } from './util'
import type Workout from './workout-model'
import { LocationDataStatus, WorkoutKey, WorkoutType } from './workout-model'
import {
	createUUIDByProvider,
	insertWorkoutsWithDb,
	replaceWorkoutsWithDb,
	useDb,
} from './workouts-database'

type ProgressAnnouncer = (loadedWorkouts: number, foundWorkouts: number) => void

const createWorkoutLocationLoader = (
	db: IDBDatabase,
	accessToken: string,
	progress: ProgressAnnouncer,
) => {
	let fast = false
	let candidatesCount = 0
	let downloadedCount = 0

	const parser = new DOMParser()

	const downloadLocationDataForWorkout = async (url: string) => {
		const content = await makeFitbitApiCall({ fullUrl: url, asText: true, accessToken })
		const document = parser.parseFromString(content, 'text/xml')
		const points = document.getElementsByTagName('Position')
		const positionPoints = new Float64Array(points.length * 2)

		let i = 0
		for (const position of points) {
			const lat = +(position.getElementsByTagName('LatitudeDegrees')[0]?.textContent ?? 0)
			const lng = +(position.getElementsByTagName('LongitudeDegrees')[0]?.textContent ?? 0)
			positionPoints[i * 2] = lat
			positionPoints[i * 2 + 1] = lng
			i++
		}
		return positionPoints
	}

	const createWorkoutAndDownload = async (a: any, index: number) => {
		const workoutWithNoLocation = {
			[WorkoutKey.HasLocationData]: LocationDataStatus.Missing,
			[WorkoutKey.Provider]: 'fitbit',
			[WorkoutKey.Type]: WorkoutType.Other,
			[WorkoutKey.UUID]: createUUIDByProvider('fitbit', a.logId),
			logId: a.logId,
			tcxLink: a.tcxLink,
			locationData: null,
		} satisfies Workout

		await insertWorkoutsWithDb(db, [workoutWithNoLocation])
		candidatesCount++
		progress(downloadedCount, candidatesCount)

		try {
			const delay = fast ? 0 : Math.random() * 5000 + index * 100
			await new Promise(resolve => setTimeout(resolve, delay))

			const positionPoints = await downloadLocationDataForWorkout(workoutWithNoLocation.tcxLink)

			await replaceWorkoutsWithDb(db, [
				{
					[WorkoutKey.HasLocationData]: LocationDataStatus.Present,
					[WorkoutKey.Provider]: 'fitbit',
					[WorkoutKey.Type]: WorkoutType.Other,
					[WorkoutKey.UUID]: createUUIDByProvider('fitbit', a.logId),
					logId: a.logId,
					tcxLink: a.tcxLink,
					locationData: positionPoints,
				} satisfies Workout,
			])
			downloadedCount++
			progress(downloadedCount, candidatesCount)
		} catch (e) {
			console.error(e)
		}
	}

	const loadingActivities: Promise<void>[] = []
	return {
		addUnfilteredActivities(activities: any[]) {
			loadingActivities.push(
				...activities
					.filter(a => a.activityTypeId === 90009 || a.activityTypeId === 90001) // only runs or bikes
					.filter(a => a.logType !== 'auto_detected') // exclude auto walks
					.filter(a => !!a.tcxLink) // ignore if missing location data
					.map(createWorkoutAndDownload),
			)
		},
		getAll() {
			fast = true
			return Promise.all(loadingActivities)
		},
	}
}

export const downloadLocations = async (
	workouts: Workout[],
	accessToken: string,
	progress: ProgressAnnouncer,
) => {
	await useDb(async db => {
		const loader = createWorkoutLocationLoader(db, accessToken, progress)
		await loader.getAll()
		loader.addUnfilteredActivities(workouts)
		await loader.getAll()
	})
}

export const createUpdater = async (
	accessToken: string,
	firstWorkoutDate: string | null,
	progress: ProgressAnnouncer,
) => {
	await useDb(async db => {
		const loader = createWorkoutLocationLoader(db, accessToken, progress)

		const response = await (firstWorkoutDate
			? makeFitbitApiCall({
					endpoint: 'activities/list.json',
					params: {
						afterDate: firstWorkoutDate.substring(0, 19),
						limit: '100',
						sort: 'asc',
						offset: '0',
					},
					accessToken,
			  })
			: makeFitbitApiCall({
					endpoint: 'activities/list.json',
					params: {
						beforeDate: new Date().toISOString().substring(0, 19),
						limit: '100',
						sort: 'desc',
						offset: '0',
					},
					accessToken,
			  }))

		loader.addUnfilteredActivities(response.activities)
		try {
			let next = response.pagination.next
			while (next) {
				const response = await makeFitbitApiCall({ fullUrl: next, accessToken })
				next = response.pagination.next
				loader.addUnfilteredActivities(response.activities)
			}
		} catch (e) {
			console.error(e)
		}

		await loader.getAll()
	})
}
