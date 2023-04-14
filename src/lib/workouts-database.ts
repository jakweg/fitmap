import { openIndexedDatabase, wrapDbQuery } from './idb'
import type Workout from './workout-model'
import { LocationDataStatus, WorkoutKey, WorkoutType } from './workout-model'

const enum ObjectStoreNames {
	ACTIVITIES = 'recordedActivities',
}
const enum IndexNames {
	HasData = 'has data',
	Provider = 'provider',
	Type = 'type',
	ProviderAndType = 'provider/type',
}

const openDb = () =>
	openIndexedDatabase('fitmap-4', 1, db => {
		const store = db.createObjectStore(ObjectStoreNames.ACTIVITIES, {
			keyPath: WorkoutKey.UUID,
		})
		store.createIndex(IndexNames.HasData, WorkoutKey.HasLocationData, { unique: false })
		store.createIndex(IndexNames.Provider, WorkoutKey.Provider, { unique: false })
		store.createIndex(IndexNames.Type, WorkoutKey.Type, { unique: false })
		store.createIndex(IndexNames.ProviderAndType, [WorkoutKey.Provider, WorkoutKey.Type], {
			unique: false,
		})
	})

export const useDb = async <T>(callback: (db: IDBDatabase) => T): Promise<T> => {
	const db = await openDb()
	try {
		return await callback(db)
	} finally {
		db.close()
	}
}

export const getAllWorkoutsRequiringTcxDownload = async (): Promise<Workout[]> => {
	return await useDb(db => {
		return wrapDbQuery(
			db
				.transaction(ObjectStoreNames.ACTIVITIES, 'readonly')
				.objectStore(ObjectStoreNames.ACTIVITIES)
				.index(IndexNames.HasData)
				.getAll(IDBKeyRange.only(LocationDataStatus.Missing)),
		)
	})
}
export const getAllWorkoutsWithLocation = async (): Promise<Workout[]> => {
	return await useDb(db => {
		return wrapDbQuery(
			db
				.transaction(ObjectStoreNames.ACTIVITIES, 'readonly')
				.objectStore(ObjectStoreNames.ACTIVITIES)
				.index(IndexNames.HasData)
				.getAll(IDBKeyRange.only(LocationDataStatus.Present)),
		)
	})
}

export const insertFitbitActivitiesWithNoLocationData = (
	activities: { logId: string; tcxLink: string; type: WorkoutType }[],
) =>
	useDb(db => {
		return Promise.allSettled(
			activities.map(a =>
				wrapDbQuery(
					db
						.transaction(ObjectStoreNames.ACTIVITIES, 'readwrite')
						.objectStore(ObjectStoreNames.ACTIVITIES)
						.add({
							[WorkoutKey.UUID]: 'fitbit/' + a.logId,
							[WorkoutKey.HasLocationData]: LocationDataStatus.Missing,
							[WorkoutKey.Provider]: 'fitbit',
							[WorkoutKey.Type]: a.type,
							logId: a.logId,
							locationData: null,
							tcxLink: a.tcxLink,
						} satisfies Workout),
				),
			),
		)
	})

export const insertWorkouts = (activities: Workout[]) =>
	useDb(db => insertWorkoutsWithDb(db, activities))

export const insertWorkoutsWithDb = (db: IDBDatabase, activities: Workout[]) =>
	Promise.allSettled(
		activities.map(a =>
			wrapDbQuery(
				db
					.transaction(ObjectStoreNames.ACTIVITIES, 'readwrite')
					.objectStore(ObjectStoreNames.ACTIVITIES)
					.add(a),
			),
		),
	)

export const replaceWorkoutsWithDb = (db: IDBDatabase, activities: Workout[]) =>
	Promise.allSettled(
		activities.map(a =>
			wrapDbQuery(
				db
					.transaction(ObjectStoreNames.ACTIVITIES, 'readwrite')
					.objectStore(ObjectStoreNames.ACTIVITIES)
					.put(a),
			),
		),
	)

export const createUUIDByProvider = (provider: Workout['source'], id: string | number) => {
	return `${provider}/${id}`
}
