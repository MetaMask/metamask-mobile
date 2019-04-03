/**
 * Utility function to return corresponding eth-contract-metadata logo
 *
 * @param {string} logo - Logo path from eth-contract-metadata
 */
export default function getAssetLogoPath(logo) {
	if (!logo) return;
	const path = 'https://raw.githubusercontent.com/MetaMask/eth-contract-metadata/master/images/';
	const uri = path + logo;
	return uri;
}
