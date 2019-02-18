/**
 * Adds a new entry to the browser history
 *
 * @param {Object} website - The website that has been visited
 * @param {string} website.url - The website's url
 * @param {string} website.name - The website name
 */
export function addToHistory({ url, name }) {
	return {
		type: 'ADD_TO_BROWSER_HISTORY',
		url,
		name
	};
}

/**
 * Clears the entire browser history
 */
export function clearHistory() {
	return {
		type: 'CLEAR_BROWSER_HISTORY'
	};
}
