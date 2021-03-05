export const tlc = str => String(str).toLowerCase();

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

export function findBottomTabRouteNameFromNavigatorState({ routes }) {
	let route = routes?.[routes.length - 1];
	let routeName;
	while (route.index !== undefined) {
		routeName = route?.routeName;
		route = route?.routes?.[route.index];
	}
	return routeName;
}

export function findRouteNameFromNavigatorState({ routes }) {
	let route = routes?.[routes.length - 1];
	while (route.index !== undefined) {
		route = route?.routes?.[route.index];
	}
	return route?.routeName;
}
export const capitalize = str => (str && str.charAt(0).toUpperCase() + str.slice(1)) || false;

export const toLowerCaseCompare = (a, b) => tlc(a) === tlc(b);
