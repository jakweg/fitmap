import { storable } from './storable'

export type FitbitUser = {
	userId: string
	accessToken: string
	refreshToken: string
	latestWorkout: null | string
	expiresAt: number
}

const defaultUserData = {
	fitbit: null as null | FitbitUser,
	importedAnything: false as boolean,
} as const

export type UserData = typeof defaultUserData

export const currentUser = storable<UserData>('currentUser', defaultUserData)
