import URL from 'url-parse';
import isUrl from 'is-url';

/**
 * Returns a sanitized url, which could be a search engine url if
 * a keyword is detected instead of a url
 *
 * @param {string} input - String corresponding to url input
 * @param {string} searchEngine - Protocol string to append to URLs that have none
 * @param {string} defaultProtocol - Protocol string to append to URLs that have none
 * @returns {string} - String corresponding to sanitized input depending if it's a search or url
 */
export default function onUrlSubmit(input, searchEngine = 'Google', defaultProtocol = 'https://') {
	//Check if it's a url or a keyword
	const regEx = new RegExp(/^(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w.-]+)+[\w\-._~:/?#[\]@!&',;=.+]+$/g);
	if (!isUrl(input) && !regEx.test(input)) {
		// Add exception for localhost
		if (!input.startsWith('http://localhost') && !input.startsWith('localhost')) {
			// In case of keywords we default to google search
			let searchUrl = 'https://www.google.com/search?q=' + escape(input);
			if (searchEngine === 'DuckDuckGo') {
				searchUrl = 'https://duckduckgo.com/?q=' + escape(input);
			}
			return searchUrl;
		}
	}
	const hasProtocol = /^[a-z]*:\/\//.test(input);
	const sanitizedURL = hasProtocol ? input : `${defaultProtocol}${input}`;
	return sanitizedURL;
}

/**
 * Return host from url string
 *
 * @param {string} url - String containing url
 * @param {string} defaultProtocol - Protocol string to append to URLs that have none
 * @returns {string} - String corresponding to host
 */
export function getHost(url, defaultProtocol = 'https://') {
	const hasProtocol = url && url.match(/^[a-z]*:\/\//);
	const urlObj = new URL(hasProtocol ? url : `${defaultProtocol}${url}`);
	const { hostname } = urlObj;
	return hostname;
}

/**
 * Return an URL object from url string
 *
 * @param {string} url - String containing url
 * @returns {object} - URL object
 */
export function getUrlObj(url) {
	const urlObj = new URL(url);
	return urlObj;
}
