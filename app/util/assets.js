/**
 * Utility function to return corresponding @metamask/contract-metadata logo
 *
 * @param {string} logo - Logo path from @metamask/contract-metadata
 */
export default function getAssetLogoPath(logo) {
	if (!logo) return;
	const path = 'https://raw.githubusercontent.com/metamask/contract-metadata/v1.16.0/images/';
	const uri = path + logo;
	return uri;
}
