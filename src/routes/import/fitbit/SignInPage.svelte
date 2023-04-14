<script lang="ts">
	import { env } from '$env/dynamic/public'
	import fitbitSignIn from '@lib/store/fitbit-sign-in'

	let working: boolean = false

	const generateCodeVerifier = async () => {
		const ALLOWED_CHARS = 'qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM1234567890'
		const ALLOWED_CHARS_COUNT = ALLOWED_CHARS.length
		const LENGTH = 128

		const randomBytes = crypto.getRandomValues(new Uint32Array(LENGTH))
		const toBeHashed = new Uint8Array(LENGTH)
		const chars: string[] = []
		for (let i = 0; i < LENGTH; ++i) {
			const charIndex = randomBytes[i] % ALLOWED_CHARS_COUNT
			toBeHashed[i] = ALLOWED_CHARS.charCodeAt(charIndex)
			chars.push(ALLOWED_CHARS[charIndex])
		}

		const hashed = new Uint8Array(await crypto.subtle.digest('sha-256', toBeHashed))
		const asBase64 = btoa(String.fromCharCode(...hashed))
			.replaceAll(/\+/g, '-')
			.replaceAll(/\//g, '_')
			.replaceAll(/=*$/g, '')
		return { base64: asBase64, plain: chars.join('') }
	}

	const generateLinkToForward = async () => {
		const codeVerifier = await generateCodeVerifier()

		const secret = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(64))))

		const params = [
			['response_type', 'code'],
			['client_id', env.PUBLIC_FITBIT_APP_ID],
			['scope', 'activity+location'],
			['code_challenge', codeVerifier.base64],
			['code_challenge_method', 'S256'],
			['state', encodeURIComponent(secret)],
		]
			.map(([k, v]) => `${k}=${v}`)
			.join('&')

		fitbitSignIn.set({
			secret: secret,
			plainCodeVerifier: codeVerifier.plain,
		})

		return `https://www.fitbit.com/oauth2/authorize?${params}`
	}

	const signInClicked = async () => {
		if (working) return
		working = true
		try {
			document.location.href = await generateLinkToForward()
		} finally {
			working = false
		}
	}
</script>

<p>You need to log in first</p>
<button disabled={working} on:click={signInClicked}>Sign in with FitBit</button>
