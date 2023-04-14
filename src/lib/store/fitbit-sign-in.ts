import { storable } from './storable'

const defaultState = null as null | {
	secret: string
	plainCodeVerifier: string
}

export default storable('fitbit-signin', defaultState)
