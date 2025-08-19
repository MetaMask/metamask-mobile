import { add0x, Hex } from '@metamask/utils';
import { addHexPrefix, fastSplit } from '.';
import { regex } from '../regex';
import * as convert from './unitsConversion';
import type { EthereumUnit } from './unitsConversion';

export const hexToBigInt = (inputHex: string | number): bigint => {
  if (typeof inputHex !== 'string') {
    return BigInt(inputHex);
  }
  // not an empty string
  if (inputHex) {
    return BigInt(add0x(inputHex));
  }
  return BigInt(0);
};

export const bigIntToHex = (value: bigint): string => add0x(value.toString(16));

export const safeBigIntToHex = (
  value: bigint | null | undefined,
): string | null | undefined => {
  if (value === null || value === undefined) {
    return value;
  }
  return bigIntToHex(value);
};

// BigInt Constants for denominations
const BIGINT_WEI_MULTIPLIER = BigInt('1000000000000000000'); // 10^18
const BIGINT_GWEI_MULTIPLIER = BigInt('1000000000'); // 10^9
const BIGINT_ETH_MULTIPLIER = BigInt('1'); // 10^0

// Setter Maps
export const toBigInt = {
  hex: (n: string): bigint => BigInt(add0x(n)),
  dec: (n: string | number): bigint => BigInt(String(n)),
};

const toNormalizedDenomination = {
  WEI: (bigIntValue: bigint): bigint => bigIntValue / BIGINT_WEI_MULTIPLIER,
  GWEI: (bigIntValue: bigint): bigint => bigIntValue / BIGINT_GWEI_MULTIPLIER,
  ETH: (bigIntValue: bigint): bigint => bigIntValue / BIGINT_ETH_MULTIPLIER,
};

const toSpecifiedDenomination = {
  WEI: (bigIntValue: bigint): bigint => bigIntValue * BIGINT_WEI_MULTIPLIER,
  GWEI: (bigIntValue: bigint): bigint => bigIntValue * BIGINT_GWEI_MULTIPLIER,
  ETH: (bigIntValue: bigint): bigint => bigIntValue * BIGINT_ETH_MULTIPLIER,
};

const baseChange = {
  hex: (n: bigint): string => n.toString(16),
  dec: (n: bigint): string => n.toString(10),
  BigInt: (n: bigint): string => n.toString(16), // Returns hex string that can be used to create BigInt
};

export const safeNumberToBigInt = (value: number | string | bigint): bigint => {
  if (typeof value === 'bigint') {
    return value;
  }
  const safeValue = fastSplit(value?.toString()) || '0';
  return BigInt(safeValue);
};

/**
 * Gets the absolute value of a BigInt
 * @param value - The BigInt value
 * @returns The absolute value as BigInt
 */
export const bigIntAbs = (value: bigint): bigint =>
  value < 0n ? -value : value;

export const toHexadecimal = (decimal: string | number | bigint): Hex => {
  if (typeof decimal !== 'string') {
    decimal = String(decimal);
  }
  if (decimal.startsWith('0x')) return decimal as Hex;
  // TOOD: fix this special case
  if (decimal.startsWith('solana')) return decimal as Hex;
  return toBigInt.dec(decimal).toString(16) as Hex;
};

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
  let value = Math.floor(Number(eth) * conversionRate * base) / base;
  value = isNaN(value) ? 0.0 : value;
  return value;
}

/**
 * Converts wei to a different unit
 *
 * @param value - Wei to convert
 * @param unit - Unit to convert to, ether by default
 * @returns String containing the new number
 */
export function fromWei(
  value: number | string | bigint,
  unit: EthereumUnit = 'ether',
): string {
  return convert.fromWei(value, unit);
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
  let renderWei = '0';
  // avoid undefined
  if (value) {
    const wei = fromWei(value);
    const weiNumber = parseFloat(wei);
    if (weiNumber < 0.00001 && weiNumber > 0) {
      renderWei = '< 0.00001';
    } else {
      const base = Math.pow(10, decimalsToShow);
      renderWei = (Math.round(weiNumber * base) / base).toString();
    }
  }
  return renderWei;
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
