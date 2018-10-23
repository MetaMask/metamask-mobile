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
 * @returns {Object} - BN instance containing the new number
 */
export function fromWei(value = 0, unit = 'ether') {
	return convert.fromWei(value, unit);
}

/**
 * Converts token BN value to number
 *
 * @param {Object} value - BN instance to convert
 * @param {number} decimals - Decimals to be considered on the conversion
 * @returns {number} - Number
 */
export function calcTokenValue(value, decimals) {
	const multiplier = Math.pow(10, decimals);
	return value.div(multiplier).toNumber();
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
	const eth = fromWei(wei).toString();
	let value = parseFloat(Math.round(eth * conversionRate * 100) / 100).toFixed(2);
	value = isNaN(value) ? '0.00' : value;
	return `${value} ${currencyCode}`;
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
	if (!balance || !exchangeRate) {
		return undefined;
	}
	let fiatFixed = parseFloat(Math.round(balance * conversionRate * exchangeRate * 100) / 100).toFixed(2);
	fiatFixed = isNaN(fiatFixed) ? '0.00' : fiatFixed;
	return `${fiatFixed} ${currencyCode.toUpperCase()}`;
}
