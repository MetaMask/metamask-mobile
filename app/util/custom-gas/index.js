import { BN } from 'ethereumjs-util';
import { renderFromWei, weiToFiat, toWei, conversionUtil } from '../number';
import { strings } from '../../../locales/i18n';
import Logger from '../Logger';
import TransactionTypes from '../../core/TransactionTypes';
import Engine from '../../core/Engine';
import { isMainnetByChainId } from '../networks';
import { util } from '@metamask/controllers';
const { hexToBN } = util;

export const ETH = 'ETH';
export const GWEI = 'GWEI';
export const WEI = 'WEI';

/**
 * Calculates wei value of estimate gas price in gwei
 *
 * @param {number} estimate - Number corresponding to api gas price estimation
 * @returns {Object} - BN instance containing gas price in wei
 */
export function apiEstimateModifiedToWEI(estimate) {
	return toWei(estimate, 'gwei');
}

/**
 * Calculates GWEI value of estimate gas price from ethgasstation.info
 *
 * @param {number} val - Number corresponding to api gas price estimation
 * @returns {string} - The GWEI value as a string
 */
export function convertApiValueToGWEI(val) {
	return parseInt(val, 10).toString();
}

/**
 * Calculates gas fee in wei
 *
 * @param {number} estimate - Number corresponding to api gas price estimation
 * @param {number} gasLimit - Number corresponding to transaction gas limit
 * @returns {Object} - BN instance containing gas price in wei
 */
export function getWeiGasFee(estimate, gasLimit = 21000) {
	const apiEstimate = apiEstimateModifiedToWEI(estimate);
	const gasFee = apiEstimate.mul(new BN(gasLimit, 10));
	return gasFee;
}

/**
 * Calculates gas fee in eth
 *
 * @param {number} estimate - Number corresponding to api gas price estimation
 * @param {number} gasLimit - Number corresponding to transaction gas limit
 * @returns {Object} - BN instance containing gas price in wei
 */
export function getRenderableEthGasFee(estimate, gasLimit = 21000) {
	const gasFee = getWeiGasFee(estimate, gasLimit);
	return renderFromWei(gasFee);
}

/**
 * Calculates gas fee in fiat
 *
 * @param {number} estimate - Number corresponding to api gas price estimation
 * @param {number} conversionRate - Number corresponding to conversion rate for current `currencyCode`
 * @param {string} currencyCode - String corresponding to code of current currency
 * @param {number} gasLimit - Number corresponding to transaction gas limit
 * @returns {Object} - BN instance containing gas price in wei
 */
export function getRenderableFiatGasFee(estimate, conversionRate, currencyCode, gasLimit = 21000) {
	const wei = getWeiGasFee(estimate, gasLimit);
	return weiToFiat(wei, conversionRate, currencyCode);
}

/**
 * Parse minutes number to readable wait time
 *
 * @param {number} min - Minutes
 * @returns {string} - Readable wait time
 */
export function parseWaitTime(min) {
	let tempMin = min,
		parsed = '',
		val;
	const timeUnits = [
		[strings('unit.week'), 10080],
		[strings('unit.day'), 1440],
		[strings('unit.hour'), 60],
		[strings('unit.minute'), 1],
	];
	timeUnits.forEach((unit) => {
		if (parsed.includes(' ')) return;
		val = Math.floor(tempMin / unit[1]);
		if (val) {
			if (parsed !== '') parsed += ' ';
			parsed += `${val}${unit[0]}`;
		}
		tempMin = min % unit[1];
	});
	if (parsed === '') {
		val = (Math.round(tempMin * 100) * 3) / 5;
		if (val) {
			parsed += ` ${Math.ceil(val)}${strings('unit.second')}`;
		}
	}
	return parsed.trim();
}

/**
 * Fetches gas estimated from gas station
 *
 * @returns {Object} - Object containing basic estimates
 */
export async function fetchBasicGasEstimates() {
	// Timeout in 7 seconds
	const timeout = 7000;

	const fetchPromise = fetch(`https://api.metaswap.codefi.network/gasPrices`, {
		headers: {},
		referrerPolicy: 'no-referrer-when-downgrade',
		body: null,
		method: 'GET',
		mode: 'cors',
	})
		.then((r) => r.json())
		.then(({ SafeGasPrice, ProposeGasPrice, FastGasPrice }) => {
			const basicEstimates = {
				average: ProposeGasPrice,
				safeLow: SafeGasPrice,
				fast: FastGasPrice,
			};

			return basicEstimates;
		});

	return Promise.race([
		fetchPromise,
		new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeout)),
	]);
}

/**
 * Sanitize gas estimates into formatted wait times
 *
 * @returns {Object} - Object containing formatted wait times
 */
export async function getBasicGasEstimates() {
	const basicGasEstimates = await fetchBasicGasEstimates();

	// Handle api failure returning same gas prices
	const { average, fast, safeLow } = basicGasEstimates;

	if (average === fast && average === safeLow) {
		throw new Error('Api returned same gas prices');
	}

	return {
		averageGwei: convertApiValueToGWEI(average),
		fastGwei: convertApiValueToGWEI(fast),
		safeLowGwei: convertApiValueToGWEI(safeLow),
	};
}

export async function getGasLimit(transaction) {
	const { TransactionController } = Engine.context;

	let estimation;
	try {
		estimation = await TransactionController.estimateGas(transaction);
	} catch (error) {
		estimation = {
			gas: TransactionTypes.CUSTOM_GAS.DEFAULT_GAS_LIMIT,
		};
	}

	const gas = hexToBN(estimation.gas);
	return { gas };
}
export async function getGasPriceByChainId(transaction) {
	const { TransactionController, NetworkController } = Engine.context;
	const chainId = NetworkController.state.provider.chainId;
	let estimation, basicGasEstimates;
	try {
		estimation = await TransactionController.estimateGas(transaction);
		basicGasEstimates = {
			average: getValueFromWeiHex({
				value: estimation.gasPrice.toString(16),
				numberOfDecimals: 4,
				toDenomination: 'GWEI',
			}),
		};
	} catch (error) {
		estimation = {
			gas: TransactionTypes.CUSTOM_GAS.DEFAULT_GAS_LIMIT,
			gasPrice: TransactionTypes.CUSTOM_GAS.AVERAGE_GAS,
		};
		basicGasEstimates = {
			average: estimation.gasPrice,
		};
		Logger.log('Error while trying to get gas price from the network', error);
	}

	if (isMainnetByChainId(chainId)) {
		try {
			basicGasEstimates = await fetchBasicGasEstimates();
		} catch (error) {
			Logger.log('Error while trying to get gas limit estimates', error);
			// Will use gas price from network that was fetched above
		}
	}

	const gas = hexToBN(estimation.gas);
	//The transaction controller returns custom network values in hex
	const gasPrice = NetworkController.state.isCustomNetwork
		? hexToBN(estimation.gasPrice)
		: toWei(convertApiValueToGWEI(basicGasEstimates.average), 'gwei');

	return { gas, gasPrice };
}

export async function getBasicGasEstimatesByChainId() {
	const { NetworkController } = Engine.context;
	const chainId = NetworkController.state.provider.chainId;

	if (!isMainnetByChainId(chainId)) {
		return null;
	}
	try {
		const basicGasEstimates = await getBasicGasEstimates();
		return basicGasEstimates;
	} catch (e) {
		return null;
	}
}

export function getValueFromWeiHex({
	value,
	fromCurrency = ETH,
	toCurrency,
	conversionRate,
	numberOfDecimals,
	toDenomination,
}) {
	return conversionUtil(value, {
		fromNumericBase: 'hex',
		toNumericBase: 'dec',
		fromCurrency,
		toCurrency,
		numberOfDecimals,
		fromDenomination: WEI,
		toDenomination,
		conversionRate,
	});
}
