const ASSET_CONTRACT = 'asset_contract/';

function getOpenSeaBaseUrl() {
	return 'https://api.opensea.io/api/v1/';
}

export default async function getContractInformation(contractAddress) {
	const url = getOpenSeaBaseUrl() + ASSET_CONTRACT + contractAddress;
	const contractInformation = await fetchOpenSeaContent(url);
	return contractInformation;
}

/**
 * Fetches gas estimated from gas station
 *
 * @returns {Object} - Object containing basic estimates
 */
async function fetchOpenSeaContent(url) {
	return await fetch(url, {
		headers: {},
		body: null,
		method: 'GET'
	})
		.then(r => r._bodyText)
		.then(object => object);
}
