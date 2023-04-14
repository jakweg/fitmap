<script lang="ts">
	import { goto } from '$app/navigation'
	import { page } from '$app/stores'
	import { env } from '$env/dynamic/public'
	import fitbitSignIn from '@lib/store/fitbit-sign-in'
	import { currentUser } from '@lib/store/user'
	import { onMount } from 'svelte'

	let status: 'loading' | 'invalid-states' | 'fitbit-failed' | 'ok' = 'loading'

	onMount(async () => {
		const code = $page.url.searchParams.get('code')
		const receivedState = $page.url.searchParams.get('state')

		const readState = $fitbitSignIn

		if (!readState || receivedState !== readState?.secret) {
			status = 'invalid-states'
			return
		}

		const body = [
			['client_id', env.PUBLIC_FITBIT_APP_ID],
			['code', code],
			['code_verifier', readState.plainCodeVerifier],
			['grant_type', 'authorization_code'],
		]
			.map(([k, v]) => `${k}=${v}`)
			.join('&')
		try {
			const response = await fetch('https://api.fitbit.com/oauth2/token', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: body,
			})

			if (!response.ok) {
				status = 'fitbit-failed'
				return
			}

			const { access_token, expires_in, refresh_token, user_id } = await response.json()

			currentUser.update(user => ({
				...user,
				fitbit: {
					userId: user_id,
					accessToken: access_token,
					refreshToken: refresh_token,
					latestWorkout: null,
					expiresAt: new Date(expires_in).getDate(),
				},
			}))
			fitbitSignIn.set(null)
		} catch (e) {
			status = 'fitbit-failed'
			return
		}

		status = 'ok'
		goto('/import/fitbit', { replaceState: true })
	})
</script>

<h1>Handling oauth</h1>
<h2>{status}</h2>
