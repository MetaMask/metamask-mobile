export const tlc = str => str?.toLowerCase?.();

/**
 * Fetch that fails after timeout
 *
 * @param url - Url to fetch
 * @param options - Options to send with the request
 * @param timeout - Timeout to fail request
 *
 * @returns - Promise resolving the request
 */
export function timeoutFetch(url, options, timeout = 500) {
	return Promise.race([
		fetch(url, options),
		new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeout))
	]);
}

export function findRouteNameFromNavigatorState(routes) {
	let route = routes?.[routes.length - 1];
	if (route.state) {
		route = route.state;
	}
	while (route !== undefined && route.index !== undefined) {
		route = route?.routes?.[route.index];
		if (route.state) {
			route = route.state;
		}
	}

	let name = route?.name;

	// For compatibility with the previous way on react navigation 4
	if (name === 'Main' || name === 'WalletTabHome' || name === 'Home') name = 'WalletView';

	return name;
}
export const capitalize = str => (str && str.charAt(0).toUpperCase() + str.slice(1)) || false;

export const toLowerCaseCompare = (a, b) => {
	if (!a && !b) return false;
	return tlc(a) === tlc(b);
};
