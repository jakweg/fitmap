import { error, redirect } from '@sveltejs/kit'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ fetch, url }) => {
	const CLIENT_ID = '23QQZ6'

	const code = url.searchParams.get('code')
	const receivedState = url.searchParams.get('state')

	const { state, codeVerifier } = JSON.parse(localStorage.getItem('auth-params') || 'null')

	if (receivedState !== state) throw error(400, `States don't match`)

	const body = [
		['client_id', CLIENT_ID],
		['code', code],
		['code_verifier', codeVerifier],
		['grant_type', 'authorization_code'],
	]
		.map(([k, v]) => `${k}=${v}`)
		.join('&')

	const response = await fetch('https://api.fitbit.com/oauth2/token', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body: body,
	})

	localStorage.removeItem('auth-params')

	if (!response.ok) throw error(400, await response.text())

	const { access_token, expires_in, refresh_token, user_id } = await response.json()

	localStorage.setItem('accessToken', access_token)
	localStorage.setItem('refreshToken', refresh_token)
	localStorage.setItem('userId', user_id)

	throw redirect(302, '/workouts')
}
