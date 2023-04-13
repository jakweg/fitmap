<script lang="ts">
	import { env } from '$env/dynamic/public'
	import { GeoJSON, LineLayer, MapLibre } from 'svelte-maplibre'

	const API_KEY = env.PUBLIC_MAP_KEY

	export let geoJSONData: any
</script>

<div id="map">
	<MapLibre
		style={'https://api.maptiler.com/maps/outdoor-v2/style.json?key=' + API_KEY}
		zoom={13}
		center={[20.1008449, 49.8931976]}
	>
		{#if geoJSONData}
			<GeoJSON data={geoJSONData}>
				<LineLayer
					paint={{
						'line-width': 6,
						'line-color': '#008800',
						'line-opacity': 1,
					}}
				/>
			</GeoJSON>
		{/if}
	</MapLibre>
</div>

<style>
	:global(#map .maplibregl-map) {
		position: relative;
		width: 100svw;
		height: 80svh;
	}
</style>
