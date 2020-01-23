/**
 * Collection of utility functions for consistent formatting and conversion
 */
import { BN } from 'ethereumjs-util';
import convert from 'ethjs-unit';
import { util } from 'gaba';
import numberToBN from 'number-to-bn';
import currencySymbols from '../util/currency-symbols.json';

/**
 * Converts a BN object to a hex string with a '0x' prefix
 *
 * @param {Object} value - BN instance to convert to a hex string
 * @returns {string} - '0x'-prefixed hex string
 */
export function BNToHex(value) {
	return util.BNToHex(value);
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

/**
 * Converts token minimal unit to readable string value
 *
 * @param {number|string|Object} minimalInput - Token minimal unit to convert
 * @param {string} decimals - Token decimals to convert
 * @returns {string} - String containing the new number
 */
export function fromTokenMinimalUnit(minimalInput, decimals) {
	let minimal = numberToBN(minimalInput);
	const negative = minimal.lt(new BN(0));
	const base = toBN(Math.pow(10, decimals).toString());

	if (negative) {
		minimal = minimal.mul(negative);
	}
	let fraction = minimal.mod(base).toString(10);
	while (fraction.length < decimals) {
		fraction = '0' + fraction;
	}
	fraction = fraction.match(/^([0-9]*[1-9]|0)(0*)/)[1];
	const whole = minimal.div(base).toString(10);
	let value = '' + whole + (fraction === '0' ? '' : '.' + fraction);
	if (negative) {
		value = '-' + value;
	}
	return value;
}

/**
 * Converts some unit to token minimal unit
 *
 * @param {number|string|BN} tokenValue - Value to convert
 * @param {string} decimals - Unit to convert from, ether by default
 * @returns {Object} - BN instance containing the new number
 */
export function toTokenMinimalUnit(tokenValue, decimals) {
	const base = toBN(Math.pow(10, decimals).toString());
	let value = convert.numberToString(tokenValue);
	const negative = value.substring(0, 1) === '-';
	if (negative) {
		value = value.substring(1);
	}
	if (value === '.') {
		throw new Error('[number] while converting number ' + tokenValue + ' to token minimal util, invalid value');
	}
	// Split it into a whole and fractional part
	const comps = value.split('.');
	if (comps.length > 2) {
		throw new Error(
			'[number] while converting number ' + tokenValue + ' to token minimal util,  too many decimal points'
		);
	}
	let whole = comps[0],
		fraction = comps[1];
	if (!whole) {
		whole = '0';
	}
	if (!fraction) {
		fraction = '';
	}
	if (fraction.length > decimals) {
		throw new Error(
			'[number] while converting number ' + tokenValue + ' to token minimal util, too many decimal places'
		);
	}
	while (fraction.length < decimals) {
		fraction += '0';
	}
	whole = new BN(whole);
	fraction = new BN(fraction);
	let tokenMinimal = whole.mul(base).add(fraction);
	if (negative) {
		tokenMinimal = tokenMinimal.mul(negative);
	}
	return new BN(tokenMinimal.toString(10), 10);
}

/**
 * Converts some token minimal unit to render format string, showing 5 decimals
 *
 * @param {Number|String|BN} tokenValue - Token value to convert
 * @param {Number} decimals - Token decimals to convert
 * @param {Number} decimalsToShow - Decimals to 5
 * @returns {String} - Number of token minimal unit, in render format
 * If value is less than 5 precision decimals will show '< 0.00001'
 */
export function renderFromTokenMinimalUnit(tokenValue, decimals, decimalsToShow = 5) {
	const minimalUnit = fromTokenMinimalUnit(tokenValue, decimals);
	const minimalUnitNumber = parseFloat(minimalUnit);
	let renderMinimalUnit;
	if (minimalUnitNumber < 0.00001 && minimalUnitNumber > 0) {
		renderMinimalUnit = '< 0.00001';
	} else {
		const base = Math.pow(10, decimalsToShow);
		renderMinimalUnit = (Math.round(minimalUnitNumber * base) / base).toString();
	}
	return renderMinimalUnit;
}

/**
 * Converts two fiat amounts into one with their respective currency, showing up to 5 decimals
 *
 * @param {number} transferFiat - Number representing fiat value of a transfer
 * @param {number} feeFiat - Number representing fiat value of transaction fee
 * @param {string} currentCurrency - Currency
 * @param {number} decimalsToShow - Defaults to 5
 * @returns {String} - Formatted fiat value of the addition, in render format
 * If value is less than 5 precision decimals will show '< 0.00001'
 */
export function renderFiatAddition(transferFiat, feeFiat, currentCurrency, decimalsToShow = 5) {
	const addition = transferFiat + feeFiat;
	let renderMinimalUnit;
	if (addition < 0.00001 && addition > 0) {
		renderMinimalUnit = '< 0.00001';
	} else {
		const base = Math.pow(10, decimalsToShow);
		renderMinimalUnit = (Math.round(addition * base) / base).toString();
	}
	if (currencySymbols[currentCurrency]) {
		return `${currencySymbols[currentCurrency]}${renderMinimalUnit}`;
	}
	return `${renderMinimalUnit} ${currentCurrency}`;
}

/**
 * Converts fiat number as human-readable fiat string to token miniml unit expressed as a BN
 *
 * @param {number|string} fiat - Fiat number
 * @param {number} conversionRate - ETH to current currency conversion rate
 * @param {number} exchangeRate - Asset to ETH conversion rate
 * @param {number} decimals - Asset decimals
 * @returns {Object} - The converted balance as BN instance
 */
export function fiatNumberToTokenMinimalUnit(fiat, conversionRate, exchangeRate, decimals) {
	const floatFiatConverted = parseFloat(fiat) / (conversionRate * exchangeRate);
	const base = Math.pow(10, decimals);
	let weiNumber = floatFiatConverted * base;
	// avoid decimals
	weiNumber = weiNumber.toLocaleString('fullwide', { useGrouping: false }).split('.');
	const weiBN = numberToBN(weiNumber[0]);
	return weiBN;
}

/**
 * Converts wei to render format string, showing 5 decimals
 *
 * @param {Number|String|BN} value - Wei to convert
 * @param {Number} decimalsToShow - Decimals to 5
 * @returns {String} - Number of token minimal unit, in render format
 * If value is less than 5 precision decimals will show '< 0.00001'
 */
export function renderFromWei(value, decimalsToShow = 5) {
	const wei = fromWei(value);
	const weiNumber = parseFloat(wei);
	let renderWei;
	if (weiNumber < 0.00001 && weiNumber > 0) {
		renderWei = '< 0.00001';
	} else {
		const base = Math.pow(10, decimalsToShow);
		renderWei = (Math.round(weiNumber * base) / base).toString();
	}
	return renderWei;
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
	return util.hexToBN(value);
}

/**
 * Checks if a value is a BN instance
 *
 * @param {object} value - Value to check
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
	return Number.isFinite(parseFloat(value)) && !Number.isNaN(parseFloat(value)) && !isNaN(+value);
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
 * Converts some unit to Gwei and return it in render format
 *
 * @param {number|string|BN} value - Value to convert
 * @param {string} unit - Unit to convert from, ether by default
 * @returns {string} - String instance containing the renderable number
 */
export function renderToGwei(value, unit = 'ether') {
	const gwei = fromWei(value, unit) * 1000000000;
	let gweiFixed = parseFloat(Math.round(gwei));
	gweiFixed = isNaN(gweiFixed) ? 0 : gweiFixed;
	return gweiFixed;
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
	if (!conversionRate) return undefined;
	if (!wei || !isBN(wei) || !conversionRate) {
		return `0.00 ${currencyCode}`;
	}
	const value = weiToFiatNumber(wei, conversionRate);
	if (currencySymbols[currencyCode]) {
		return `${currencySymbols[currencyCode]}${value}`;
	}
	return `${value} ${currencyCode}`;
}

/**
 * Converts wei expressed as a BN instance into a human-readable fiat string
 *
 * @param {number} wei - BN corresponding to an amount of wei
 * @param {number} conversionRate - ETH to current currency conversion rate
 * @param {Number} decimalsToShow - Decimals to 5
 * @returns {Number} - The converted balance
 */
export function weiToFiatNumber(wei, conversionRate, decimalsToShow = 5) {
	const base = Math.pow(10, decimalsToShow);
	const eth = fromWei(wei).toString();
	let value = parseFloat(Math.floor(eth * conversionRate * base) / base);
	value = isNaN(value) ? 0.0 : value;
	return value;
}

/**
 * Converts fiat number as human-readable fiat string to wei expressed as a BN
 *
 * @param {number|string} fiat - Fiat number
 * @param {number} conversionRate - ETH to current currency conversion rate
 * @returns {Object} - The converted balance as BN instance
 */
export function fiatNumberToWei(fiat, conversionRate) {
	const floatFiatConverted = parseFloat(fiat) / conversionRate;
	const base = Math.pow(10, 18);
	const weiNumber = Math.trunc(base * floatFiatConverted);
	const weiBN = numberToBN(weiNumber);
	return weiBN;
}

/**
 * Calculates fiat balance of an asset
 *
 * @param {number|string} balance - Number corresponding to a balance of an asset
 * @param {number} conversionRate - ETH to current currency conversion rate
 * @param {number} exchangeRate - Asset to ETH conversion rate
 * @param {string} currencyCode - Current currency code to display
 * @returns {string} - Currency-formatted string
 */
export function balanceToFiat(balance, conversionRate, exchangeRate, currencyCode) {
	if (balance === undefined || balance === null || exchangeRate === undefined || exchangeRate === 0) {
		return undefined;
	}
	const fiatFixed = balanceToFiatNumber(balance, conversionRate, exchangeRate);
	if (currencySymbols[currencyCode]) {
		return `${currencySymbols[currencyCode]}${fiatFixed}`;
	}
	return `${fiatFixed} ${currencyCode}`;
}

/**
 * Calculates fiat balance of an asset and returns a number
 *
 * @param {number|string} balance - Number or string corresponding to a balance of an asset
 * @param {number} conversionRate - ETH to current currency conversion rate
 * @param {number} exchangeRate - Asset to ETH conversion rate
 * @param {number} decimalsToShow - Decimals to 5
 * @returns {Number} - The converted balance
 */
export function balanceToFiatNumber(balance, conversionRate, exchangeRate, decimalsToShow = 5) {
	const base = Math.pow(10, decimalsToShow);
	let fiatFixed = parseFloat(Math.floor(balance * conversionRate * exchangeRate * base) / base);
	fiatFixed = isNaN(fiatFixed) ? 0.0 : fiatFixed;
	return fiatFixed;
}

export function getCurrencySymbol(currencyCode) {
	if (currencySymbols[currencyCode]) {
		return `${currencySymbols[currencyCode]}`;
	}
	return currencyCode;
}

/**
 * Formats a fiat value into a string ready to be rendered
 *
 * @param {number} value - number corresponding to a balance of an asset
 * @param {string} currencyCode - Current currency code to display
 * @param {number} decimalsToShow - Decimals to 5
 * @returns {string} - The converted balance
 */
export function renderFiat(value, currencyCode, decimalsToShow = 5) {
	const base = Math.pow(10, decimalsToShow);
	let fiatFixed = parseFloat(Math.round(value * base) / base);
	fiatFixed = isNaN(fiatFixed) ? 0.0 : fiatFixed;
	if (currencySymbols[currencyCode]) {
		return `${currencySymbols[currencyCode]}${fiatFixed}`;
	}
	return `${fiatFixed} ${currencyCode.toUpperCase()}`;
}

/**
 * Converts BN wei value to wei units in string format
 *
 * @param {object} value - Object containing wei value in BN format
 * @returns {string} - Corresponding wei value
 */
export function renderWei(value) {
	if (!value) return '0';
	const wei = fromWei(value);
	const renderWei = wei * Math.pow(10, 18);
	return renderWei.toString();
}
/**
 * Formatc a string number in an string number with at most 5 decimal places
 *
 * @param {string} number - String containing a number
 * @returns {string} - String number with none or at most 5 decimal places
 */
export function renderNumber(number) {
	const index = number.indexOf('.');
	if (index === 0) return number;
	return number.substring(0, index + 6);
}
