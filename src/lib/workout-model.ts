export const enum LocationDataStatus {
	Missing = 'N',
	Present = 'T',
}
export const enum WorkoutType {
	Running = 'R',
	Biking = 'B',
	Other = 'O',
}

export const enum WorkoutKey {
	Provider = 'source',
	UUID = 'uuid',
	HasLocationData = 'hasLocationData',
	Type = 'type',
}

interface WorkoutCommon {
	[WorkoutKey.UUID]: string
	[WorkoutKey.HasLocationData]: LocationDataStatus
	locationData: Float64Array | null
	[WorkoutKey.Type]: WorkoutType
}

export interface FitbitWorkout extends WorkoutCommon {
	logId: string
	[WorkoutKey.Provider]: 'fitbit'
	tcxLink: string
}

export interface EndomondoWorkout extends WorkoutCommon {
	id: string
	[WorkoutKey.Provider]: 'endomondo'
}

export interface GoogleFitWorkout extends WorkoutCommon {
	id: string
	[WorkoutKey.Provider]: 'google-fit'
}

type Workout = FitbitWorkout | EndomondoWorkout | GoogleFitWorkout

export default Workout
