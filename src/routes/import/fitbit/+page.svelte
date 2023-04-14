<script lang="ts">
	import { currentUser } from '@lib/store/user'
	import ImportPage from './ImportPage.svelte'
	import SignInPage from './SignInPage.svelte'

	let working: boolean = false
</script>

<h1>Import FitBit data</h1>
<p>Working {working}</p>

{#if $currentUser.fitbit}
	<ImportPage user={$currentUser.fitbit} />
{:else}
	<SignInPage />
{/if}
<!-- <button on:click={startImporting}>Import</button> -->
