import { get, writable, type Writable } from 'svelte/store'

export const storable = <T>(key: string, defaultValue: T) => {
	const store = writable(defaultValue)
	const { subscribe, set } = store

	const initialFromStorage = localStorage.getItem(key)
	if (initialFromStorage !== null) set(JSON.parse(initialFromStorage))

	return {
		subscribe,
		set: newValue => {
			localStorage.setItem(key, JSON.stringify(newValue))
			set(newValue)
		},
		update: cb => {
			const currentValue = get(store)
			const newValue = cb(currentValue)
			if (currentValue !== newValue) {
				localStorage.setItem(key, JSON.stringify(newValue))
				set(newValue)
			}
		},
	} satisfies Writable<T>
}
