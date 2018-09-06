export default function getAssetLogoPath(logo) {
	if (!logo) return;
	const path = 'https://raw.githubusercontent.com/MetaMask/eth-contract-metadata/master/images/';
	const uri = path + logo;
	return uri;
}
