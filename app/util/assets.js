const pack = require('../../package.json'); // eslint-disable-line

/**
 * Utility function to return corresponding @metamask/contract-metadata logo
 *
 * @param {string} logo - Logo path from @metamask/contract-metadata
 */
export default function getAssetLogoPath(logo) {
	if (!logo) return;
	const path = `https://raw.githubusercontent.com/metamask/contract-metadata/master/images/`;
	const uri = path + logo;
	return uri;
}
