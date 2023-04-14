export const filterNotNullable = <T>(elements: (T | null | undefined)[]) =>
	elements.filter(e => e != null) as T[]

export const makeFitbitApiCall = async (
	options: ({ fullUrl: string } | { endpoint: string; params: { [key: string]: string } }) & {
		asText?: boolean
		accessToken: string
	},
) => {
	let fullUrl = 'fullUrl' in options ? options.fullUrl : ''
	if (!fullUrl) {
		const params = new URLSearchParams((options as any).params)

		fullUrl = `https://api.fitbit.com/1/user/-/${(options as any).endpoint}?${params}`
	}

	const response = await fetch(fullUrl, {
		headers: {
			Authorization: 'Bearer ' + options.accessToken,
		},
	})
	if (!response.ok) throw new Error()
	if (options.asText) return await response.text()
	return await response.json()
}
