import Logger from '../util/Logger';

const UNABLE_TO_FETCH = `Unable to fetch content from OpenSea.`;
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
	let contractInformation;
	try {
		contractInformation = await fetchOpenSeaContent(url);
	} catch (e) {
		contractInformation = undefined;
	}
	return contractInformation;
}

/**
 * Fetches any url and returns and object as response
 *
 * @param {string} url - OpenSea url to request
 * @returns {Object} - Object containing information requested to api
 */
async function fetchOpenSeaContent(url) {
	return new Promise((resolve, reject) => {
		fetch(url, {
			headers: {},
			body: null,
			method: 'GET'
		})
			.then(response => {
				resolve(JSON.parse(response._bodyText));
			})
			.catch(error => {
				Logger.error(UNABLE_TO_FETCH + ` Error - ${error}`);
				reject(UNABLE_TO_FETCH + ` Error - ${error}`);
			});
	});
}
