/**
 * Collection of utility functions for consistent formatting and conversion
 */
import { BN } from 'ethereumjs-util';
import convert from 'ethjs-unit';
import gabaUtils from 'gaba/util';

/**
 * Converts a BN object to a hex string with a '0x' prefix
 *
 * @param {Object} value - BN instance to convert to a hex string
 * @returns {string} - '0x'-prefixed hex string
 */
export function BNToHex(value) {
	return gabaUtils.BNToHex(value);
}

/**
 * Converts wei to a different unit
 *
 * @param {number|string|Object} value - Wei to convert
 * @param {string} unit - Unit to convert to, ether by default
 * @returns {string} - String containing the new number
 */
export function fromWei(value = 0, unit = 'ether') {
	return convert.fromWei(value, unit);
}

export function fromAssetMinimal(minimalInput, decimals) {
	var minimal = minimalInput; // eslint-disable-line
	var negative = minimal.lt(new BN(0)); // eslint-disable-line
	const base = toBN(Math.pow(10, decimals).toString());

	if (negative) {
		minimal = minimal.mul(negative);
	}

	var fraction = minimal.mod(base).toString(10); // eslint-disable-line

	while (fraction.length < decimals) {
		fraction = '0' + fraction;
	}
	fraction = fraction.match(/^([0-9]*[1-9]|0)(0*)/)[1];

	var whole = minimal.div(base).toString(10); // eslint-disable-line

	var value = '' + whole + (fraction == '0' ? '' : '.' + fraction); // eslint-disable-line

	if (negative) {
		value = '-' + value;
	}

	return value;
}

export function toAssetMinimal(assetInput, decimals) {
	const base = toBN(Math.pow(10, decimals).toString());
	var asset = convert.numberToString(assetInput); // eslint-disable-line

	// Is it negative?
	var negative = asset.substring(0, 1) === '-'; // eslint-disable-line
	if (negative) {
		asset = asset.substring(1);
	}

	if (asset === '.') {
		throw new Error('[ethjs-unit] while converting number ' + assetInput + ' to wei, invalid value');
	}

	// Split it into a whole and fractional part
	var comps = asset.split('.'); // eslint-disable-line
	if (comps.length > 2) {
		throw new Error('[ethjs-unit] while converting number ' + assetInput + ' to wei,  too many decimal points');
	}

	let whole = comps[0],
		fraction = comps[1]; // eslint-disable-line

	if (!whole) {
		whole = '0';
	}
	if (!fraction) {
		fraction = '0';
	}
	if (fraction.length > decimals) {
		throw new Error('[ethjs-unit] while converting number ' + assetInput + ' to wei, too many decimal places');
	}

	while (fraction.length < decimals) {
		fraction += '0';
	}

	whole = new BN(whole);
	fraction = new BN(fraction);
	var wei = whole.mul(base).add(fraction); // eslint-disable-line

	if (negative) {
		wei = wei.mul(negative);
	}

	return new BN(wei.toString(10), 10);
}

/**
 * Converts token BN value to hex string number to be sent
 *
 * @param {Object} value - BN instance to convert
 * @param {number} decimals - Decimals to be considered on the conversion
 * @returns {string} - String of the hex token value
 */
export function calcTokenValueToSend(value, decimals) {
	return value ? (value * Math.pow(10, decimals)).toString(16) : 0;
}

/**
 * Converts a hex string to a BN object
 *
 * @param {string} value - Number represented as a hex string
 * @returns {Object} - A BN instance
 */
export function hexToBN(value) {
	return gabaUtils.hexToBN(value);
}

/**
 * Checks if a value is a BN instance
 *
 * @param {*} value - Value to check
 * @returns {boolean} - True if the value is a BN instance
 */
export function isBN(value) {
	return BN.isBN(value);
}

/**
 * Determines if a string is a valid decimal
 *
 * @param {string} value - String to check
 * @returns {boolean} - True if the string is a valid decimal
 */
export function isDecimal(value) {
	return /^(\d+\.?\d*|\.\d+)$/.test(value);
}

/**
 * Creates a BN object from a string
 *
 * @param {string} value - Some numeric value represented as a string
 * @returns {Object} - BN instance
 */
export function toBN(value) {
	return new BN(value);
}

/**
 * Converts some unit to wei
 *
 * @param {number|string|BN} value - Value to convert
 * @param {string} unit - Unit to convert from, ether by default
 * @returns {Object} - BN instance containing the new number
 */
export function toWei(value, unit = 'ether') {
	return convert.toWei(value, unit);
}

/**
 * Converts some unit to Gwei
 *
 * @param {number|string|BN} value - Value to convert
 * @param {string} unit - Unit to convert from, ether by default
 * @returns {Object} - BN instance containing the new number
 */
export function toGwei(value, unit = 'ether') {
	return fromWei(value, unit) * 1000000000;
}

/**
 * Converts wei expressed as a BN instance into a human-readable fiat string
 *
 * @param {number} wei - BN corresponding to an amount of wei
 * @param {number} conversionRate - ETH to current currency conversion rate
 * @param {string} currencyCode - Current currency code to display
 * @returns {string} - Currency-formatted string
 */
export function weiToFiat(wei, conversionRate, currencyCode) {
	if (!wei || !isBN(wei)) {
		return `0.00 ${currencyCode}`;
	}
	const value = weiToFiatNumber(wei, conversionRate);
	return `${value} ${currencyCode}`;
}

/**
 * Converts wei expressed as a BN instance into a human-readable fiat string
 *
 * @param {number} wei - BN corresponding to an amount of wei
 * @param {number} conversionRate - ETH to current currency conversion rate
 * @returns {Number} - The converted balance
 */
export function weiToFiatNumber(wei, conversionRate) {
	const eth = fromWei(wei).toString();
	let value = parseFloat(Math.round(eth * conversionRate * 100) / 100).toFixed(2);
	value = isNaN(value) ? 0.0 : value;
	return value;
}

/**
 * Calculates fiat balance of an asset
 *
 * @param {number} balance - Number corresponding to a balance of an asset
 * @param {number} conversionRate - ETH to current currency conversion rate
 * @param {number} exchangeRate - Asset to ETH conversion rate
 * @param {string} currencyCode - Current currency code to display
 * @returns {string} - Currency-formatted string
 */
export function balanceToFiat(balance, conversionRate, exchangeRate, currencyCode) {
	if (balance === undefined || balance === null || exchangeRate === undefined || exchangeRate === null) {
		return undefined;
	}
	const fiatFixed = balanceToFiatNumber(balance, conversionRate, exchangeRate);
	return `${fiatFixed} ${currencyCode.toUpperCase()}`;
}

/**
 * Calculates fiat balance of an asset and returns a number
 *
 * @param {number} balance - Number corresponding to a balance of an asset
 * @param {number} conversionRate - ETH to current currency conversion rate
 * @param {number} exchangeRate - Asset to ETH conversion rate
 * @returns {Number} - The converted balance
 */
export function balanceToFiatNumber(balance, conversionRate, exchangeRate) {
	let fiatFixed = parseFloat(Math.round(balance * conversionRate * exchangeRate * 100) / 100).toFixed(2);
	fiatFixed = isNaN(fiatFixed) ? 0.0 : fiatFixed;
	return fiatFixed;
}
