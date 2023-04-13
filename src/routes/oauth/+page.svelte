<script lang="ts">
	import { onMount } from 'svelte'
	import type { PageData } from './$types'

	export let data: PageData

	onMount(() => {
		const URL =
			'oauth?code=5d982e476020d0790cf7453fe53eb95202ca7904&state=QYD0qmAGhNqPETs3swc9mPPqnSNwONOv4t%2Fqgnnp%2FA%2FNgk9AzWKol40x8Me86fI3Yp9eXWUt%2Fa32u6bV%2Fx26UQ%3D%3D#_=_'

		console.log(data)

		// console.log(location.href)
	})
</script>

<h1>Handling oauth</h1>
