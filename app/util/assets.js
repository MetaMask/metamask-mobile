export default function getAssetLogoPath(logo) {
	if (!logo) return;
	const pngPath = 'https://github.com/MetaMask/eth-contract-metadata/raw/master/images/';
	const svgPath = 'https://raw.githubusercontent.com/MetaMask/eth-contract-metadata/master/images/';
	const extension = logo.split('.')[-1];
	const svgLogo = extension === 'svg';
	const uri = svgLogo ? svgPath + logo : pngPath + logo;
	return uri;
}
