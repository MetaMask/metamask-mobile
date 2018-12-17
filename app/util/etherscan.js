export function getEtherscanAddressUrl(network, address) {
	return `${getEtherscanBaseUrl(network)}/address/${address}`;
}

export function getEtherscanTransactionUrl(network, tx_hash) {
	return `${getEtherscanBaseUrl(network)}/tx/${tx_hash}`;
}

export function getEtherscanBaseUrl(network) {
	const subdomain = network === '1' ? '' : `${network.toLowerCase()}.`;
	return `https://${subdomain}etherscan.io`;
}
