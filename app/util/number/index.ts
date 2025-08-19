/**
 * Collection of utility functions for consistent formatting and conversion
 */

import { utils as ethersUtils } from 'ethers';
import {
  add0x,
  unitMap,
  fromWei as fromWeiUtil,
  numberToString,
  toWei as toWeiUtil,
} from '@metamask/utils';
import BigNumber from 'bignumber.js';

import currencySymbols from '../currency-symbols.json';
import { isZero } from '../lodash';
import { regex } from '../regex';
import { stripHexPrefix } from '../address';

type EthereumUnit = keyof typeof unitMap;
type CurrencyCode = keyof typeof currencySymbols;
type SignedHex = `0x${string}` | `-0x${string}`;

const MAX_DECIMALS_FOR_TOKENS = 36;
BigNumber.config({ DECIMAL_PLACES: MAX_DECIMALS_FOR_TOKENS });

// Big Number Constants
const BIG_NUMBER_WEI_MULTIPLIER = new BigNumber('1000000000000000000');
const BIG_NUMBER_GWEI_MULTIPLIER = new BigNumber('1000000000');
const BIG_NUMBER_ETH_MULTIPLIER = new BigNumber('1');

export const hexToBigInt = (inputHex: string | number | bigint): bigint => {
  if (typeof inputHex !== 'string') {
    return BigInt(inputHex);
  }
  // not an empty string
  if (inputHex) {
    return BigInt(addHexPrefix(inputHex));
  }
  return BigInt(0);
};

export const bigIntToHex = (value: bigint): string => add0x(value.toString(16));

// Setter Maps
export const toBigInt = {
  hex: (n: string): bigint => BigInt(add0x(n)),
  dec: (n: string | number): bigint => BigInt(String(n)),
};
export const toBigNumber = {
  hex: (n: string): BigNumber => new BigNumber(stripHexPrefix(n), 16),
  dec: (n: string | number): BigNumber => new BigNumber(String(n), 10),
  BN: (n: bigint | BigNumber | string | number): BigNumber =>
    new BigNumber(n.toString(16), 16),
};
type NumericBase = keyof typeof toBigNumber;

const toNormalizedDenomination = {
  WEI: (bigNumber: BigNumber): BigNumber =>
    bigNumber.div(BIG_NUMBER_WEI_MULTIPLIER),
  GWEI: (bigNumber: BigNumber): BigNumber =>
    bigNumber.div(BIG_NUMBER_GWEI_MULTIPLIER),
  ETH: (bigNumber: BigNumber): BigNumber =>
    bigNumber.div(BIG_NUMBER_ETH_MULTIPLIER),
};
type NormalizedDenomination = keyof typeof toNormalizedDenomination;

const toSpecifiedDenomination = {
  WEI: (bigNumber: BigNumber): BigNumber =>
    bigNumber.times(BIG_NUMBER_WEI_MULTIPLIER).decimalPlaces(0),
  GWEI: (bigNumber: BigNumber): BigNumber =>
    bigNumber.times(BIG_NUMBER_GWEI_MULTIPLIER).decimalPlaces(9),
  ETH: (bigNumber: BigNumber): BigNumber =>
    bigNumber.times(BIG_NUMBER_ETH_MULTIPLIER).decimalPlaces(9),
};
type SpecifiedDenomination = keyof typeof toSpecifiedDenomination;

const baseChange = {
  hex: (n: bigint | BigNumber): string => n.toString(16),
  dec: (n: bigint | BigNumber): string => n.toString(10),
  BN: (n: bigint | BigNumber): string => n.toString(16), // Returns hex string that can be used to create BigInt
};

/**
 * Prefixes a hex string with '0x' or '-0x' and returns it. Idempotent.
 *
 * @param str - The string to prefix.
 * @returns The prefixed string.
 */
export function addHexPrefix(str: string): SignedHex {
  if (typeof str !== 'string' || str.match(regex.hexPrefix)) {
    return str as SignedHex;
  }

  if (str.match(regex.hexPrefix)) {
    return str.replace('0X', '0x') as SignedHex;
  }

  if (str.startsWith('-')) {
    return str.replace('-', '-0x') as SignedHex;
  }

  return `0x${str}`;
}

/**
 * Converts wei to a different unit
 *
 * @param {number|string|Object} value - Wei to convert
 * @param {string} unit - Unit to convert to, ether by default
 * @returns {string} - String containing the new number
 */
export function fromWei(
  value: number | string | bigint = 0,
  unit: EthereumUnit = 'ether',
): string {
  return fromWeiUtil(value, unit);
}

/**
 * Converts token minimal unit to readable string value
 *
 * @param {number|string|Object} minimalInput - Token minimal unit to convert
 * @param {number|string} decimals - Token decimals to convert
 * @param {boolean} [isRounding=true] - If true, minimalInput is converted to number and rounded for large numbers.
 * @returns {string} - String containing the new number
 */

export function fromTokenMinimalUnit(
  minimalInput: number | string | bigint,
  decimals: number,
  isRounding = true,
): string {
  minimalInput = isRounding ? Number(minimalInput) : minimalInput;
  const prefixedInput = addHexPrefix(minimalInput.toString(16));
  let minimal = safeNumberToBigInt(prefixedInput);
  const negative = minimal < 0n;
  const base = BigInt(Math.pow(10, decimals).toString());

  if (negative) {
    minimal = bigIntAbs(minimal); // Use absolute value
  }
  let fraction = (minimal % base).toString(10);
  while (fraction.length < decimals) {
    fraction = '0' + fraction;
  }
  fraction = fraction.match(regex.fractions)?.[1] || '0';
  const whole = (minimal / base).toString(10);
  let value = '' + whole + (fraction === '0' ? '' : '.' + fraction);
  if (negative) {
    value = '-' + value;
  }
  return value;
}

/**
 * Converts token minimal unit to readable string value
 *
 * @param {string} minimalInput - Token minimal unit to convert
 * @param {number} decimals - Token decimals to convert
 * @returns {string} - String containing the new number
 */
export function fromTokenMinimalUnitString(
  minimalInput: string,
  decimals: number,
) {
  if (typeof minimalInput !== 'string') {
    throw new TypeError('minimalInput must be a string');
  }

  const tokenFormat = ethersUtils.formatUnits(minimalInput, decimals);
  const isInteger = Boolean(regex.integer.exec(tokenFormat));

  const [integerPart, decimalPart] = tokenFormat.split('.');
  if (isInteger) {
    return integerPart;
  }
  return `${integerPart}.${decimalPart}`;
}

/**
 * Converts some unit to token minimal unit
 *
 * @param tokenValue - Value to convert
 * @param decimals - Unit to convert from, ether by default
 * @returns - BigInt instance containing the new number
 */
export function toTokenMinimalUnit(
  tokenValue: number | string | bigint,
  decimals: number,
): bigint {
  const base = BigInt(Math.pow(10, decimals).toString());
  let value = numberToString(tokenValue);
  const negative = value.substring(0, 1) === '-';
  if (negative) {
    value = value.substring(1);
  }
  if (value === '.') {
    throw new Error(
      '[number] while converting number ' +
        tokenValue +
        ' to token minimal util, invalid value',
    );
  }
  // Split it into a whole and fractional part
  const comps = value.split('.');
  if (comps.length > 2) {
    throw new Error(
      '[number] while converting number ' +
        tokenValue +
        ' to token minimal util,  too many decimal points',
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
      '[number] while converting number ' +
        tokenValue +
        ' to token minimal util, too many decimal places',
    );
  }
  while (fraction.length < decimals) {
    fraction += '0';
  }
  const wholeBigInt = BigInt(whole);
  const fractionBigInt = BigInt(fraction);
  let tokenMinimal = wholeBigInt * base + fractionBigInt;
  if (negative) {
    tokenMinimal *= -1n;
  }
  return tokenMinimal;
}

/**
 * Converts some token minimal unit to render format string, showing 5 decimals
 *
 * @param {Number|String|bigint} tokenValue - Token value to convert
 * @param {Number} decimals - Token decimals to convert
 * @param {Number} decimalsToShow - Decimals to 5
 * @returns {String} - Number of token minimal unit, in render format
 * If value is less than 5 precision decimals will show '< 0.00001'
 */
export function renderFromTokenMinimalUnit(
  tokenValue: number | string | bigint,
  decimals: number,
  decimalsToShow = 5,
): string {
  const minimalUnit = fromTokenMinimalUnit(tokenValue || 0, decimals);
  const minimalUnitNumber = parseFloat(minimalUnit);
  let renderMinimalUnit;
  if (minimalUnitNumber < 0.00001 && minimalUnitNumber > 0) {
    renderMinimalUnit = '< 0.00001';
  } else {
    const base = Math.pow(10, decimalsToShow);
    renderMinimalUnit = (
      Math.round(minimalUnitNumber * base) / base
    ).toString();
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
export function renderFiatAddition(
  transferFiat: number,
  feeFiat: number,
  currentCurrency: CurrencyCode,
  decimalsToShow = 5,
): string {
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
 * Limits a number to a max decimal places.
 * @param {number} num
 * @param {number} maxDecimalPlaces
 * @returns {string}
 */
export function limitToMaximumDecimalPlaces(num: number, maxDecimalPlaces = 5) {
  if (isNaN(num) || isNaN(maxDecimalPlaces)) {
    return num;
  }
  const base = Math.pow(10, maxDecimalPlaces);
  return (Math.round(num * base) / base).toString();
}

/**
 * Converts fiat number as human-readable fiat string to token miniml unit expressed as a BN
 *
 * @param {number|string} fiat - Fiat number
 * @param {number} conversionRate - ETH to current currency conversion rate
 * @param {number} exchangeRate - Asset to ETH conversion rate
 * @param {number} decimals - Asset decimals
 * @returns {bigint} - The converted balance as bigint instance
 */
export function fiatNumberToTokenMinimalUnit(
  fiat: number | string,
  conversionRate: number,
  exchangeRate: number,
  decimals: number,
): bigint {
  const fiatNumber = typeof fiat === 'string' ? parseFloat(fiat) : fiat;
  const floatFiatConverted = fiatNumber / (conversionRate * exchangeRate);
  const base = Math.pow(10, decimals);
  const weiNumber = floatFiatConverted * base;
  // avoid decimals
  const weiNumberLocale = weiNumber.toLocaleString('fullwide', {
    useGrouping: false,
  });
  const weiBN = safeNumberToBigInt(weiNumberLocale);
  return weiBN;
}

/**
 * Converts wei to render format string, showing 5 decimals
 *
 * @param value - Wei to convert
 * @param decimalsToShow - Decimals to 5
 * @returns Number of token minimal unit, in render format
 * If value is less than 5 precision decimals will show '< 0.00001'
 */
export function renderFromWei(
  value: number | string | bigint,
  decimalsToShow = 5,
): string {
  let weiDisplay = '0';
  // avoid undefined
  if (value) {
    const wei = fromWei(value);
    const weiNumber = parseFloat(wei);
    if (weiNumber < 0.00001 && weiNumber > 0) {
      weiDisplay = '< 0.00001';
    } else {
      const base = Math.pow(10, decimalsToShow);
      weiDisplay = (Math.round(weiNumber * base) / base).toString();
    }
  }
  return weiDisplay;
}

/**
 * Checks if a value is a BigInt instance
 *
 * @param {object|string} value - Value to check
 * @returns {boolean} - True if the value is a BigInt instance
 */
export function isBigInt(value: number | string | bigint): boolean {
  return typeof value === 'bigint';
}

/**
 * Determines if a string is a valid decimal
 *
 * @param {number | string} value - String to check
 * @returns {boolean} - True if the string is a valid decimal
 */
export function isDecimal(valueInput: number | string): boolean {
  const value =
    typeof valueInput === 'string' ? valueInput : valueInput.toString();
  return (
    Number.isFinite(parseFloat(value)) &&
    !Number.isNaN(parseFloat(value)) &&
    !isNaN(+value)
  );
}

/**
 * Determines if a string is a valid number
 *
 * @param {*} str - Number string
 * @returns {boolean} - True if the string  is a valid number
 */
export function isNumber(str?: string | null): boolean {
  if (str === null || str === undefined) {
    return false;
  }
  return regex.number.test(str);
}

/**
 * Determines if a value is a number
 *
 * @param {number | string | null | undefined} value - Value to check
 * @returns {boolean} - True if the value is a valid number
 */
export function isNumberValue(
  value: number | string | null | undefined,
): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === 'number') {
    return !Number.isNaN(value) && Number.isFinite(value);
  }

  return isDecimal(value);
}

export const dotAndCommaDecimalFormatter = (value: number | string): string => {
  const valueStr = String(value);

  const formattedValue = valueStr.replace(',', '.');

  return formattedValue;
};

/**
 * Determines whether the given number is going to be
 * displalyed in scientific notation after being converted to a string.
 *
 * @param {number} value - The value to check.
 * @returns {boolean} True if the value is a number in scientific notation, false otherwise.
 * @see https://262.ecma-international.org/5.1/#sec-9.8.1
 */

export const isNumberScientificNotationWhenString = (
  value: number | string | bigint,
): value is number => {
  if (typeof value !== 'number') {
    return false;
  }
  // toLowerCase is needed since E is also valid
  return value.toString().toLowerCase().includes('e');
};

/**
 * Converts some unit to wei
 *
 * @param {number|string|bigint} value - Value to convert
 * @param {string} unit - Unit to convert from, ether by default
 * @returns {bigint} - BigInt instance containing the new number
 */
export function toWei(
  value: number | string | bigint,
  unit: EthereumUnit = 'ether',
): bigint {
  // check the posibilty to convert to BigInt
  // directly on the swaps screen
  if (isNumberScientificNotationWhenString(value)) {
    value = value.toFixed(18);
  }
  return toWeiUtil(value, unit);
}

/**
 * Converts some unit to Gwei
 *
 * @param {number|string|bigint} value - Value to convert
 * @param {string} unit - Unit to convert from, ether by default
 * @returns {bigint} - BigInt instance containing the new number
 */
export function toGwei(
  value: number | string | bigint,
  unit: EthereumUnit = 'ether',
): bigint {
  return BigInt(fromWei(value, unit)) * 1000000000n;
}

/**
 * Converts some unit to Gwei and return it in render format
 *
 * @param {number|string|bigint} value - Value to convert
 * @param {string} unit - Unit to convert from, ether by default
 * @returns {string} - String instance containing the renderable number
 */
export function renderToGwei(
  value: number | string | bigint,
  unit: EthereumUnit = 'ether',
): number {
  const gwei = parseFloat(fromWei(value, unit)) * 1000000000;
  let gweiFixed = Math.round(gwei);
  gweiFixed = isNaN(gweiFixed) ? 0 : gweiFixed;
  return gweiFixed;
}

/**
 * Converts wei expressed as a BigInt instance into a human-readable fiat string
 * TODO: wei should be a BigInt instance, but we're not sure if it's always the case
//
 * @param {number | bigint} wei - BigInt corresponding to an amount of wei
 * @param {number | null} conversionRate - ETH to current currency conversion rate
 * @param {string} currencyCode - Current currency code to display
 * @returns {string} - Currency-formatted string
 */
export function weiToFiat(
  wei: number | bigint,
  conversionRate: number | null,
  currencyCode: CurrencyCode,
) {
  if (!conversionRate) return undefined;
  if (!wei || !isBigInt(wei) || !conversionRate) {
    return addCurrencySymbol(0, currencyCode);
  }
  const decimalsToShow = (currencyCode === 'usd' && 2) || undefined;
  const value = weiToFiatNumber(wei, conversionRate, decimalsToShow);
  return addCurrencySymbol(value, currencyCode);
}

/**
 * Renders fiat amount with currency symbol if exists
 *
 * @param {number|string} amount  Number corresponding to a currency amount
 * @param {string} currencyCode Current currency code to display
 * @returns {string} - Currency-formatted string
 */
export function addCurrencySymbol(
  amountInput: number | string,
  currencyCode: CurrencyCode,
  extendDecimals = false,
) {
  let amount: number | string =
    typeof amountInput === 'string' ? parseFloat(amountInput) : amountInput;
  const prefix = amount < 0 ? '-' : '';

  if (extendDecimals) {
    if (isNumberScientificNotationWhenString(amount)) {
      amount = amount.toFixed(18);
    }

    // if bigger than 0.01, show 2 decimals
    if (Number(amount) >= 0.01 || Number(amount) <= -0.01) {
      amount = parseFloat(amount).toFixed(2);
    }

    // if less than 0.01, show all the decimals that are zero except the trailing zeros, and 3 decimals for the rest that are not zero
    if (
      (Number(amount) < 0.01 && Number(amount) > 0) ||
      (Number(amount) > -0.01 && Number(amount) < 0)
    ) {
      const decimalString = amount.toString().split('.')[1];
      if (decimalString && decimalString.length > 1) {
        const firstNonZeroDecimal = decimalString.indexOf(
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          decimalString.match(regex.decimalString)![0],
        );
        if (firstNonZeroDecimal > 0) {
          amount = parseFloat(amount).toFixed(firstNonZeroDecimal + 3);
          // remove trailing zeros
          amount = amount.replace(regex.trailingZero, '');
        }
      }
    }
  }

  if (currencyCode === 'usd' && !extendDecimals) {
    amount = Number(amount).toFixed(2);
  }

  const amountString = amount.toString();
  const absAmountStr = amountString.startsWith('-')
    ? amountString.slice(1) // Remove the first character if it's a '-'
    : amountString;

  if (currencySymbols[currencyCode]) {
    return `${prefix}${currencySymbols[currencyCode]}${absAmountStr}`;
  }

  const lowercaseCurrencyCode = currencyCode?.toLowerCase() as CurrencyCode;

  if (currencySymbols[lowercaseCurrencyCode]) {
    return `${prefix}${currencySymbols[lowercaseCurrencyCode]}${absAmountStr}`;
  }

  return `${prefix}${absAmountStr} ${currencyCode}`;
}

/**
 * Converts wei expressed as a BigInt instance into a human-readable fiat string
 *
 * @param wei - BigInt corresponding to an amount of wei
 * @param conversionRate - ETH to current currency conversion rate
 * @param decimalsToShow - Decimals to 5
 * @returns The converted balance
 */
export function weiToFiatNumber(
  wei: number | string | bigint,
  conversionRate: number,
  decimalsToShow = 5,
) {
  const base = Math.pow(10, decimalsToShow);
  const eth = fromWei(wei, 'ether');
  let value = Math.floor(parseFloat(eth) * conversionRate * base) / base;
  value = isNaN(value) ? 0.0 : value;
  return value;
}

/**
 * Handles wie input to have less or equal to 18 decimals
 *
 * @param {string} wei - Amount in decimal notation
 * @returns {string} - Number string with less or equal 18 decimals
 */
export function handleWeiNumber(wei: string): string {
  const comps = wei.split('.');
  let fraction = comps[1];
  if (fraction && fraction.length > 18) fraction = fraction.substring(0, 18);
  const finalWei = fraction ? [comps[0], fraction].join('.') : comps[0];
  return finalWei;
}

/**
 * Converts fiat number as human-readable fiat string to wei expressed as a BN
 *
 * @param {number|string} fiat - Fiat number
 * @param {number} conversionRate - ETH to current currency conversion rate
 * @returns {bigint} - The converted balance as BigInt instance
 */
export function fiatNumberToWei(
  fiatInput: number | string,
  conversionRate: number,
) {
  const fiat =
    typeof fiatInput === 'string' ? parseFloat(fiatInput) : fiatInput;
  const floatFiatConverted = fiat / conversionRate;
  if (
    !floatFiatConverted ||
    isNaN(floatFiatConverted) ||
    floatFiatConverted === Infinity
  ) {
    return '0x0';
  }
  const base = Math.pow(10, 18);
  let weiNumber: number | string = Math.trunc(base * floatFiatConverted);
  // avoid decimals
  weiNumber = weiNumber.toLocaleString('fullwide', { useGrouping: false });
  return safeNumberToBigInt(weiNumber);
}

/**
 * Wraps 'numberToBigInt' method to avoid potential undefined and decimal values
 *
 * @param value -  number
 * @returns - The converted value as BigInt instance
 */
export function safeNumberToBigInt(value: number | string | bigint): bigint {
  if (typeof value === 'bigint') {
    return value;
  }
  const safeValue = fastSplit(value?.toString()) || '0';
  // Nested try/catch because of perforamnce reasons
  try {
    // Try quickly convert number/string which should work in most cases
    return BigInt(safeValue);
  } catch {
    try {
      // In case of missing hex prefix it will fail so we try to add it
      let signedHex: number | string = addHexPrefix(safeValue);
      if (signedHex.startsWith('-0x')) {
        // For some reason BigInt cannot handle negative -0x string in constructor so we need to convert it to number first
        signedHex = parseInt(signedHex, 16);
      }
      return BigInt(signedHex);
    } catch {
      // In case everything fails return zero
      return BigInt(0);
    }
  }
}

/**
 * Performs a fast string split and returns the first item of the string based on the divider provided
 *
 * @param {number|string} value -  number/string to be splitted
 * @param {string} divider -  string value to use to split the string (default '.')
 * @returns {string} - the selected splitted element
 */

export function fastSplit(valueInput: string | number, divider = '.') {
  const value =
    typeof valueInput === 'string' ? valueInput : valueInput.toString();
  const [from, to] = [value.indexOf(divider), 0];
  return value.substring(from, to) || value;
}

/**
 * Calculates fiat balance of an asset
 *
 * @param {number|string} balance - Number corresponding to a balance of an asset
 * @param {number|null|undefined} conversionRate - ETH to current currency conversion rate
 * @param {number|undefined} exchangeRate - Asset to ETH conversion rate
 * @param {string} currencyCode - Current currency code to display
 * @returns {string} - Currency-formatted string
 */
export function balanceToFiat(
  balance: number | string | bigint,
  conversionRate: number | null | undefined,
  exchangeRate: number,
  currencyCode: CurrencyCode,
): string | undefined {
  if (
    balance === undefined ||
    balance === null ||
    exchangeRate === undefined ||
    !conversionRate ||
    exchangeRate === 0
  ) {
    return undefined;
  }
  const fiatFixed = balanceToFiatNumber(balance, conversionRate, exchangeRate);
  return addCurrencySymbol(fiatFixed, currencyCode);
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
export function balanceToFiatNumber(
  balance: number | string | bigint,
  conversionRate: number,
  exchangeRate: number,
  decimalsToShow = 5,
) {
  const base = Math.pow(10, decimalsToShow);
  let fiatFixed =
    Math.floor(Number(balance) * conversionRate * exchangeRate * base) / base;
  fiatFixed = isNaN(fiatFixed) ? 0.0 : fiatFixed;
  return fiatFixed;
}

export function getCurrencySymbol(currencyCode: CurrencyCode) {
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
export function renderFiat(
  value: number | string,
  currencyCode: CurrencyCode,
  decimalsToShow: number = 5,
) {
  const base = Math.pow(10, decimalsToShow);
  let fiatFixed = Math.round(Number(value) * base) / base;
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
export function renderWei(value?: bigint | null): string {
  if (!value) return '0';
  const wei = fromWei(value);
  const weiDisplay = Number(wei) * Math.pow(10, 18);
  return weiDisplay.toString();
}
/**
 * Format a string number in an string number with at most 5 decimal places
 *
 * @param {string} number - String containing a number
 * @returns {string} - String number with none or at most 5 decimal places
 */
export function renderNumber(number: string): string {
  const index = number.indexOf('.');
  if (index === 0) return number;
  return number.substring(0, index + 6);
}

/**
 * Checks whether the given value is a 0x-prefixed, non-zero, non-zero-padded,
 * hexadecimal string.
 *
 * @param value - The value to check.
 * @returns {boolean} True if the value is a correctly formatted hex string,
 * false otherwise.
 */
export function isPrefixedFormattedHexString(
  value: string | number | bigint,
): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  return regex.prefixedFormattedHexString.test(value);
}

const converter = ({
  value,
  fromNumericBase,
  fromDenomination,
  fromCurrency,
  toNumericBase,
  toDenomination,
  toCurrency,
  numberOfDecimals,
  conversionRate,
  invertConversionRate,
  roundDown,
}: {
  value: number | string | bigint | BigNumber;
  fromNumericBase: NumericBase;
  fromDenomination: NormalizedDenomination;
  fromCurrency?: CurrencyCode | null;
  toNumericBase: NumericBase;
  toDenomination: SpecifiedDenomination;
  toCurrency?: CurrencyCode | null;
  numberOfDecimals?: number;
  conversionRate?: number;
  invertConversionRate?: boolean;
  roundDown?: number;
}) => {
  let convertedValue: BigNumber | string = fromNumericBase
    ? toBigNumber[fromNumericBase](value as unknown as string)
    : BigNumber(value);

  if (fromDenomination) {
    convertedValue = toNormalizedDenomination[fromDenomination](convertedValue);
  }

  if (fromCurrency !== toCurrency) {
    if (conversionRate === null || conversionRate === undefined) {
      throw new Error(
        `Converting from ${fromCurrency} to ${toCurrency} requires a conversionRate, but one was not provided`,
      );
    }
    let rate = toBigNumber.dec(conversionRate);
    if (invertConversionRate) {
      rate = new BigNumber(1.0).div(conversionRate);
    }
    convertedValue = convertedValue.times(rate);
  }

  if (toDenomination) {
    convertedValue = toSpecifiedDenomination[toDenomination](convertedValue);
  }

  if (numberOfDecimals) {
    convertedValue = convertedValue.decimalPlaces(
      numberOfDecimals,
      BigNumber.ROUND_HALF_DOWN,
    );
  }

  if (roundDown) {
    convertedValue = convertedValue.decimalPlaces(
      roundDown,
      BigNumber.ROUND_DOWN,
    );
  }

  if (toNumericBase) {
    convertedValue = baseChange[toNumericBase](convertedValue);
  }
  return convertedValue;
};

export const conversionUtil = (
  value: number | string | bigint | BigNumber,
  {
    fromCurrency = null,
    toCurrency = fromCurrency,
    fromNumericBase,
    toNumericBase,
    fromDenomination,
    toDenomination,
    numberOfDecimals,
    conversionRate,
    invertConversionRate,
  }: {
    fromCurrency?: CurrencyCode | null;
    toCurrency?: CurrencyCode | null;
    fromNumericBase: NumericBase;
    toNumericBase: NumericBase;
    fromDenomination: NormalizedDenomination;
    toDenomination: SpecifiedDenomination;
    numberOfDecimals?: number;
    conversionRate?: number;
    invertConversionRate?: boolean;
  },
) =>
  converter({
    fromCurrency,
    toCurrency,
    fromNumericBase,
    toNumericBase,
    fromDenomination,
    toDenomination,
    numberOfDecimals,
    conversionRate,
    invertConversionRate,
    value: value || '0',
  });

export const toHexadecimal = (
  decimal?: number | string | bigint | null,
): string => {
  if (typeof decimal === 'bigint') {
    return decimal.toString(16);
  }
  if (decimal !== typeof 'string') {
    decimal = String(decimal);
  }
  if (decimal.startsWith('0x')) return decimal;
  return toBigInt.dec(decimal).toString(16);
};

export const calculateEthFeeForMultiLayer = ({
  multiLayerL1FeeTotal,
  ethFee = 0,
}: {
  multiLayerL1FeeTotal?: number | string | bigint | null;
  ethFee: number | string | bigint;
}) => {
  if (!multiLayerL1FeeTotal) {
    return ethFee;
  }
  const multiLayerL1FeeTotalDecEth = conversionUtil(multiLayerL1FeeTotal, {
    fromNumericBase: 'hex',
    toNumericBase: 'dec',
    fromDenomination: 'WEI',
    toDenomination: 'ETH',
  });
  return new BigNumber(multiLayerL1FeeTotalDecEth)
    .plus(new BigNumber(ethFee ?? 0))
    .toString(10);
};

/**
 *
 * @param {number|string|bigint} value - Value to check
 * @returns {boolean} - true if value is zero
 */
export const isZeroValue = (value: number | string | bigint): boolean => {
  if (value === null || value === undefined) {
    return false;
  }
  return value === '0x0' || (isBigInt(value) && value === 0n) || isZero(value);
};

export const formatValueToMatchTokenDecimals = (
  valueInput: number | string | bigint | null | undefined,
  decimal?: number | string | null,
) => {
  if (
    valueInput === null ||
    valueInput === undefined ||
    decimal === null ||
    decimal === undefined ||
    typeof decimal === 'string'
  ) {
    return valueInput;
  }
  let value = valueInput.toString();
  const decimalIndex = value.indexOf('.');
  if (decimalIndex !== -1) {
    const fractionalLength = value.substring(decimalIndex + 1).length;
    if (fractionalLength > decimal) {
      value = parseFloat(value).toFixed(decimal);
    }
  }
  return value;
};

export const safeBigIntToHex = (
  value: bigint | null | undefined,
): string | null | undefined => {
  if (value === null || value === undefined) {
    return value;
  }
  return bigIntToHex(value);
};

/**
 * Formats a potentially large number to the nearest unit.
 * e.g. 1T for trillions, 2.3B for billions, 4.56M for millions, 7,890 for thousands, etc.
 *
 * @param t - An I18nContext translator.
 * @param number - The number to format.
 * @returns A localized string of the formatted number + unit.
 */
export const localizeLargeNumber = (
  i18n: { t: (k: string) => string },
  number: number,
): string => {
  const oneTrillion = 1000000000000;
  const oneBillion = 1000000000;
  const oneMillion = 1000000;

  if (number >= oneTrillion) {
    return `${(number / oneTrillion).toFixed(2)}${i18n.t(
      'token.trillion_abbreviation',
    )}`;
  } else if (number >= oneBillion) {
    return `${(number / oneBillion).toFixed(2)}${i18n.t(
      'token.billion_abbreviation',
    )}`;
  } else if (number >= oneMillion) {
    return `${(number / oneMillion).toFixed(2)}${i18n.t(
      'token.million_abbreviation',
    )}`;
  }
  return number.toFixed(2);
};

export const convertDecimalToPercentage = (decimal: number): string => {
  if (typeof decimal !== 'number' || isNaN(decimal)) {
    throw new Error('Input must be a valid number');
  }
  return (decimal * 100).toFixed(2) + '%';
};

/**
 * Gets the absolute value of a BigInt
 * @param value - The BigInt value
 * @returns The absolute value as BigInt
 */
export function bigIntAbs(value: bigint): bigint {
  return value < 0n ? -value : value;
}
