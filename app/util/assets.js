/**
 * Utility function to return corresponding eth-contract-metadata logo
 *
 * @param {string} logo - Logo path from eth-contract-metadata
 */
export default function getAssetLogoPath(logo) {
	if (!logo) return;
	const path = 'https://raw.githubusercontent.com/metamask/eth-contract-metadata/v1.16.0/images/';
	const uri = path + logo;
	return uri;
}
