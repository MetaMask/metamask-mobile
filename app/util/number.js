import { BN } from 'ethereumjs-util';
import convert from 'ethjs-unit';
import gabaUtils from 'gaba/util';
/**
 * Collection of utility functions for working with numbers
 */

/**
 * Convert numeric values into 00.00 XXX format
 *
 * @param {number} eth - Amount of ETH
 * @param {number} conversionRate - ETH to current currency conversion rate
 * @param {string} currencyCode - Current currency code to display
 */
export function ethToFiat(eth, conversionRate, currencyCode) {
	let value = parseFloat(Math.round(eth * conversionRate * 100) / 100).toFixed(2);
	value = isNaN(value) ? '0.00' : value;
	return `${value} ${currencyCode}`;
}

/**
 * Determines if a string is a valid decimal
 *
 * @param {string} value - String to check
 * @returns {boolean} - True if the string is a valid decimal
 */
export function isNumeric(value) {
	return !isNaN(value - parseFloat(value));
}

export function fromWei(value, unit = 'ether') {
	return convert.fromWei(value, unit);
}

export function toWei(value, unit = 'ether') {
	return convert.toWei(value, unit);
}

export function isBN(value) {
	return BN.isBN(value);
}

export function isDecimal(value) {
	return /^(\d+\.?\d*|\.\d+)$/.test(value);
}

export function hexToBN(value) {
	return gabaUtils.hexToBN(value);
}

export function BNToHex(value) {
	return gabaUtils.BNToHex(value);
}

export function weiToFiat(wei, conversionRate, currencyCode) {
	if (!wei || !isBN(wei)) { return `0.00 ${currencyCode}`; }
	const eth = fromWei(wei).toString();
	let value = parseFloat(Math.round(eth * conversionRate * 100) / 100).toFixed(2);
	value = isNaN(value) ? '0.00' : value;
	return `${value} ${currencyCode}`;
}
