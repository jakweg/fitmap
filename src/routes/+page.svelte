<script lang="ts">
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

	const onSignInClicked = async () => {
		const CLIENT_ID = '23QQZ6'

		const codeVerifier = await generateCodeVerifier()

		const state = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(64))))

		const params = [
			['response_type', 'code'],
			['client_id', CLIENT_ID],
			['scope', 'activity+location'],
			['code_challenge', codeVerifier.base64],
			['code_challenge_method', 'S256'],
			['state', encodeURIComponent(state)],
		]
			.map(([k, v]) => `${k}=${v}`)
			.join('&')

		localStorage.setItem(
			'auth-params',
			JSON.stringify({
				state,
				codeVerifier: codeVerifier.plain,
			}),
		)

		const url = `https://www.fitbit.com/oauth2/authorize?${params}`
		document.location.href = url
	}
</script>

<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://kit.svelte.dev">kit.svelte.dev</a> to read the documentation</p>
<button on:click={onSignInClicked}>Sign in with FitBit</button>
