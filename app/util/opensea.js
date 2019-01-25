const ASSET_CONTRACT = 'asset_contract/';

/**
 * Return OpenSea api
 *
 * @returns {string} - String containing OpenSea api
 */
function getOpenSeaBaseUrl() {
	return 'https://api.opensea.io/api/v1/';
}

/**
 * Returns contract collectible information object
 *
 * @param {string} contractAddress - Collectible contract address
 * @returns {Object} - Object containing collectible information object
 */
export default async function getContractInformation(contractAddress) {
	const url = getOpenSeaBaseUrl() + ASSET_CONTRACT + contractAddress;
	const contractInformation = await fetchOpenSeaContent(url);
	return contractInformation;
}

/**
 * Fetches any url and returns and object as response
 *
 * @param {string} url - OpenSea url to request
 * @returns {Object} - Object containing information requested to api
 */
async function fetchOpenSeaContent(url) {
	return await fetch(url, {
		headers: {},
		body: null,
		method: 'GET'
	})
		.then(r => r._bodyText)
		.then(object => JSON.parse(object));
}
