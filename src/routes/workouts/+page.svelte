<script lang="ts">
	import { getAllWorkoutsWithLocation } from '@lib/workouts-database'
	import { onMount } from 'svelte'
	import Libre from './libre.svelte'

	let feature: any = null
	const loadTcx = async () => {
		const workouts = await getAllWorkoutsWithLocation()

		const getCoordinatesFromArray = (array: Float64Array) => {
			if (!array) return []
			const length = (array.length / 2) | 0
			const points: [number, number][] = []
			for (let i = 0; i < length; ++i) {
				points.push([array[i * 2 + 1], array[i * 2]])
			}
			return points
		}

		feature = {
			type: 'FeatureCollection',
			features: workouts.map(workout => ({
				type: 'Feature',
				geometry: {
					type: 'LineString',
					coordinates: getCoordinatesFromArray(workout.locationData!),
				},
			})),
		}
	}

	onMount(() => loadTcx())
</script>

<Libre geoJSONData={feature} />
