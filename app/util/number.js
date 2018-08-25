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
