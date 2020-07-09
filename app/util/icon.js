import { getHost } from './browser';
import { DOMParser } from 'react-native-html-parser';

/**
 * Get and parse HTML
 */
const getDocument = async url => {
	const response = await fetch(url);
	const html = await response.text();

	return new DOMParser({
		// eslint-disable-next-line no-empty-function
		errorHandler: (level, msg) => {},
		locator: {}
	}).parseFromString(html, 'text/html');
};

/**
 * parse a size int from string eg: "192x192" -> 192
 */
const parseSize = sizes => {
	const length = sizes.indexOf('x');
	return parseInt(sizes.substr(0, length)) || null;
};

/**
 * Format href (needed because assets can be relative or absolute)
 */
const formatHref = (bestIcon, url) => {
	const href = bestIcon.getAttribute('href') || '';

	const PROTOCOL = '://';

	const hrefLength = href.indexOf(PROTOCOL);
	const protocolLength = url.indexOf(PROTOCOL);
	const protocol = url.substr(0, protocolLength);
	const host = getHost(url);

	return hrefLength === -1 ? `${protocol}${PROTOCOL}${host}${href}` : href;
};

/**
 * Find the best icon based on sizes attribute
 */
const findBestIcon = (acc, curr) => {
	const [acc_sizes, curr_sizes] = [acc, curr].map(el => el.getAttribute('sizes'));
	const [acc_size, curr_size] = [acc_sizes, curr_sizes].map(parseSize);
	return acc_size > curr_size ? acc : curr;
};

/**
 * Attempt to fetch icon from document and fall back to faviconkit if we have to
 */
export default async url => {
	const doc = await getDocument(url);

	// get all <link> tags
	const nodeList = doc.getElementsByTagName('link');

	// collect all <link>'s into an array for filtering
	const links = nodeList ? Array.from(nodeList) : [];

	// icons based on size attribute
	const sizedIcons = links.filter(el => el.hasAttribute('sizes'));

	// all icons (based on rel key containing "icon")
	const allIcons = links.filter(el => el.hasAttribute('rel') && /icon/.test(el.getAttribute('rel')));

	// since we can't determine what's best, just pick one
	const anyIcon = allIcons.pop();

	// bestIcon from above based on if there are sizedIcons or not
	const bestIcon = (sizedIcons.length ? sizedIcons.reduce(findBestIcon) : anyIcon) || null;

	// !bestIcon && console.log('no best icon ;(');

	// fall back to faviconkit if we absolutely have to (meaning there's only a .ico resource)
	const fallback = `https://api.faviconkit.com/${getHost(url)}/64`;
	const uri = bestIcon ? formatHref(bestIcon, url) : fallback;

	return uri;
};
