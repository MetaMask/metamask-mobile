import BigNumber from 'bignumber.js';
import { addHexPrefix } from './number';

import { conversionUtil, addCurrencies, multiplyCurrencies, conversionGreaterThan } from './conversion';
import I18n from '../../locales/i18n';

export function increaseLastGasPrice(lastGasPrice) {
	return addHexPrefix(
		multiplyCurrencies(lastGasPrice || '0x0', 1.1, {
			multiplicandBase: 16,
			multiplierBase: 10,
			toNumericBase: 'hex',
		})
	);
}

export function hexGreaterThan(a, b) {
	return conversionGreaterThan({ value: a, fromNumericBase: 'hex' }, { value: b, fromNumericBase: 'hex' });
}

export function getHexGasTotal({ gasLimit, gasPrice }) {
	return addHexPrefix(
		multiplyCurrencies(gasLimit || '0x0', gasPrice || '0x0', {
			toNumericBase: 'hex',
			multiplicandBase: 16,
			multiplierBase: 16,
		})
	);
}

export function addEth(...args) {
	return args.reduce((acc, ethAmount) =>
		addCurrencies(acc, ethAmount, {
			toNumericBase: 'dec',
			numberOfDecimals: 6,
			aBase: 10,
			bBase: 10,
		})
	);
}

export function addFiat(...args) {
	return args.reduce((acc, fiatAmount) =>
		addCurrencies(acc, fiatAmount, {
			toNumericBase: 'dec',
			numberOfDecimals: 2,
			aBase: 10,
			bBase: 10,
		})
	);
}

export function getValueFromWeiHex({
	value,
	fromCurrency = 'ETH',
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
		fromDenomination: 'WEI',
		toDenomination,
		conversionRate,
	});
}

export function getTransactionFee({ value, fromCurrency = 'ETH', toCurrency, conversionRate, numberOfDecimals }) {
	return conversionUtil(value, {
		fromNumericBase: 'BN',
		toNumericBase: 'dec',
		fromDenomination: 'WEI',
		fromCurrency,
		toCurrency,
		numberOfDecimals,
		conversionRate,
	});
}

function isCryptoCodeInISO4217(code) {
	if (
		code === '1ST' ||
		code === 'DASH' ||
		code === 'MYST' ||
		code === 'PTOY' ||
		code === 'QTUM' ||
		code === 'SC' ||
		code === 'SNGLS' ||
		code === 'STORJ' ||
		code === 'STEEM' ||
		code === 'TIME' ||
		code === 'TRST' ||
		code === 'USDC' ||
		code === 'USDT' ||
		code === 'WINGS' ||
		code === 'ZEC'
	) {
		return false;
	}
	return true;
}

export function formatCurrency(value, currencyCode) {
	const upperCaseCurrencyCode = currencyCode.toUpperCase();
	let formatedCurrency;
	if (!isCryptoCodeInISO4217(upperCaseCurrencyCode)) {
		formatedCurrency = `${Number(value)} ${upperCaseCurrencyCode}`;
	} else {
		formatedCurrency = new Intl.NumberFormat(I18n.locale, {
			currency: upperCaseCurrencyCode,
			style: 'currency',
			// eslint-disable-next-line no-mixed-spaces-and-tabs
		}).format(Number(value));
	}
	return formatedCurrency;
}

export function convertTokenToFiat({ value, fromCurrency = 'ETH', toCurrency, conversionRate, contractExchangeRate }) {
	if (!contractExchangeRate) return 0;
	const totalExchangeRate = conversionRate * contractExchangeRate;

	return conversionUtil(value, {
		fromNumericBase: 'dec',
		toNumericBase: 'dec',
		fromCurrency,
		toCurrency,
		numberOfDecimals: 2,
		conversionRate: totalExchangeRate,
	});
}

/**
 * Rounds the given decimal string to 4 significant digits.
 *
 * @param {string} decimalString - The base-ten number to round.
 * @returns {string} The rounded number, or the original number if no
 * rounding was necessary.
 */
export function roundExponential(decimalString) {
	const PRECISION = 4;
	const bigNumberValue = new BigNumber(decimalString);

	// In JS, numbers with exponentials greater than 20 get displayed as an exponential.
	return bigNumberValue.e > 20 ? bigNumberValue.toPrecision(PRECISION) : decimalString;
}
