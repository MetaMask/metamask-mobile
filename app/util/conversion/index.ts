import BigNumber from 'bignumber.js';
import { BN } from 'ethereumjs-util';

// Add type definitions at the top of the file
type NumericBase = 'hex' | 'dec' | 'BN';
type EthDenomination = 'WEI' | 'GWEI' | 'ETH';

interface ConverterOptions {
  value: string | BigNumber;
  fromNumericBase?: NumericBase;
  fromDenomination?: EthDenomination;
  fromCurrency?: string;
  toNumericBase?: NumericBase;
  toDenomination?: EthDenomination;
  toCurrency?: string;
  numberOfDecimals?: number;
  conversionRate?: number | string;
  invertConversionRate?: boolean;
  roundDown?: number;
}

// Custom stripHexPrefix function
const stripHexPrefix = (str: string): string => {
  return str.startsWith('0x') ? str.slice(2) : str;
};

// TODO: The following types need further investigation:
// - The exact structure of the options object in arithmetic and comparison functions
// - The return type of the baseChange function for the 'BN' case (currently using BN from ethereumjs-util)
// - The exact types for the conversionRate and roundDown properties in the ConverterOptions interface

// Big Number Constants
const BIG_NUMBER_WEI_MULTIPLIER = new BigNumber('1000000000000000000');
const BIG_NUMBER_GWEI_MULTIPLIER = new BigNumber('1000000000');
const BIG_NUMBER_ETH_MULTIPLIER = new BigNumber('1');

// Setter Maps
const toBigNumber: Record<NumericBase, (n: string | number | BigNumber) => BigNumber> = {
  hex: (n) => new BigNumber(stripHexPrefix(n.toString()), 16),
  dec: (n) => new BigNumber(String(n), 10),
  BN: (n) => new BigNumber(n.toString(16), 16),
};

const toNormalizedDenomination: Record<EthDenomination, (bigNumber: BigNumber) => BigNumber> = {
  WEI: (bigNumber) => bigNumber.div(BIG_NUMBER_WEI_MULTIPLIER),
  GWEI: (bigNumber) => bigNumber.div(BIG_NUMBER_GWEI_MULTIPLIER),
  ETH: (bigNumber) => bigNumber.div(BIG_NUMBER_ETH_MULTIPLIER),
};

const toSpecifiedDenomination: Record<EthDenomination, (bigNumber: BigNumber) => BigNumber> = {
  WEI: (bigNumber) =>
    bigNumber.times(BIG_NUMBER_WEI_MULTIPLIER).decimalPlaces(0),
  GWEI: (bigNumber) =>
    bigNumber.times(BIG_NUMBER_GWEI_MULTIPLIER).decimalPlaces(9),
  ETH: (bigNumber) =>
    bigNumber.times(BIG_NUMBER_ETH_MULTIPLIER).decimalPlaces(9),
};

const baseChange: Record<NumericBase, (n: BigNumber) => string | BN> = {
  hex: (n) => n.toString(16),
  dec: (n) => new BigNumber(n).toString(10),
  BN: (n) => new BN(n.toString(16)),
};

// Utility function for checking base types
const isValidBase = (base: unknown): base is number => Number.isInteger(base) && (base as number) > 1;

/**
 * Defines the base type of numeric value
 * @typedef {('hex' | 'dec' | 'BN')} NumericBase
 */

/**
 * Defines which type of denomination a value is in
 * @typedef {('WEI' | 'GWEI' | 'ETH')} EthDenomination
 */

/**
 * Utility method to convert a value between denominations, formats and currencies.
 * @param {Object} input
 * @param {string | BigNumber} input.value
 * @param {NumericBase} input.fromNumericBase
 * @param {EthDenomination} [input.fromDenomination]
 * @param {string} [input.fromCurrency]
 * @param {NumericBase} input.toNumericBase
 * @param {EthDenomination} [input.toDenomination]
 * @param {string} [input.toCurrency]
 * @param {number} [input.numberOfDecimals]
 * @param {number} [input.conversionRate]
 * @param {boolean} [input.invertConversionRate]
 * @param {string} [input.roundDown]
 */
const converter = (options: ConverterOptions): BigNumber => {
  let convertedValue: BigNumber = options.fromNumericBase && typeof options.value === 'string'
    ? toBigNumber[options.fromNumericBase](options.value)
    : new BigNumber(options.value);

  if (options.fromDenomination) {
    convertedValue = toNormalizedDenomination[options.fromDenomination](convertedValue);
  }

  if (options.fromCurrency !== options.toCurrency) {
    if (options.conversionRate === null || options.conversionRate === undefined) {
      throw new Error(
        `Converting from ${options.fromCurrency} to ${options.toCurrency} requires a conversionRate, but one was not provided`,
      );
    }
    let rate = toBigNumber.dec(options.conversionRate);
    if (options.invertConversionRate) {
      rate = new BigNumber(1.0).div(options.conversionRate);
    }
    convertedValue = convertedValue.times(rate);
  }

  if (options.toDenomination) {
    convertedValue = toSpecifiedDenomination[options.toDenomination](convertedValue);
  }

  if (options.numberOfDecimals) {
    convertedValue = convertedValue.decimalPlaces(
      options.numberOfDecimals,
      BigNumber.ROUND_HALF_DOWN,
    );
  }

  if (options.roundDown) {
    convertedValue = convertedValue.decimalPlaces(
      options.roundDown,
      BigNumber.ROUND_DOWN,
    );
  }

  if (options.toNumericBase) {
    const result = baseChange[options.toNumericBase](convertedValue);
    return typeof result === 'string' ? new BigNumber(result) : new BigNumber(result.toString(16), 16);
  }
  return convertedValue;
};

const conversionUtil = (value: string | BigNumber, options: Partial<ConverterOptions> = {}): BigNumber => {
  if (options.fromCurrency !== options.toCurrency && !options.conversionRate) {
    return new BigNumber(0);
  }
  return converter({
    value: value.toString(),
    ...options,
  } as ConverterOptions);
};

const getBigNumber = (value: string | number | BigNumber, base = 10): BigNumber => {
  if (!isValidBase(base)) {
    throw new Error('Must specify valid base');
  }

  // We don't include 'number' here, because BigNumber will throw if passed
  // a number primitive it considers unsafe.
  if (typeof value === 'string' || value instanceof BigNumber) {
    return new BigNumber(value, base);
  }

  return new BigNumber(String(value), base);
};

const addCurrencies = (a: string | number | BigNumber, b: string | number | BigNumber, options: Partial<ConverterOptions> & { aBase?: number; bBase?: number } = {}): BigNumber => {
  const { aBase = 10, bBase = 10, ...conversionOptions } = options;

  if (!isValidBase(aBase) || !isValidBase(bBase)) {
    throw new Error('Must specify valid aBase and bBase');
  }
  const value = getBigNumber(a, aBase).plus(getBigNumber(b, bBase));

  return converter({
    value: value.toString(),
    ...conversionOptions,
  } as ConverterOptions);
};

const subtractCurrencies = (a: string | number | BigNumber, b: string | number | BigNumber, options: Partial<ConverterOptions> & { aBase?: number; bBase?: number } = {}): BigNumber => {
  const { aBase = 10, bBase = 10, ...conversionOptions } = options;

  if (!isValidBase(aBase) || !isValidBase(bBase)) {
    throw new Error('Must specify valid aBase and bBase');
  }

  const value = getBigNumber(a, aBase).minus(getBigNumber(b, bBase));

  return converter({
    value: value.toString(),
    ...conversionOptions,
  } as ConverterOptions);
};

const multiplyCurrencies = (a: string | number | BigNumber, b: string | number | BigNumber, options: Partial<ConverterOptions> & { multiplicandBase?: number; multiplierBase?: number } = {}): BigNumber => {
  const { multiplicandBase = 10, multiplierBase = 10, ...conversionOptions } = options;

  if (!isValidBase(multiplicandBase) || !isValidBase(multiplierBase)) {
    throw new Error('Must specify valid multiplicandBase and multiplierBase');
  }

  const value = getBigNumber(a, multiplicandBase).times(
    getBigNumber(b, multiplierBase),
  );

  return converter({
    value: value.toString(),
    ...conversionOptions,
  } as ConverterOptions);
};

const conversionGreaterThan = (
  value1: string | BigNumber,
  value2: string | BigNumber,
  options: Partial<ConverterOptions> = {}
): boolean => {
  const firstValue = conversionUtil(value1, options);
  const secondValue = conversionUtil(value2, options);

  return firstValue.gt(secondValue);
};

const conversionLessThan = (
  value1: string | BigNumber,
  value2: string | BigNumber,
  options: Partial<ConverterOptions> = {}
): boolean => {
  const firstValue = conversionUtil(value1, options);
  const secondValue = conversionUtil(value2, options);

  return firstValue.lt(secondValue);
};

const conversionMax = (
  value1: string | BigNumber,
  value2: string | BigNumber,
  options: Partial<ConverterOptions> = {}
): BigNumber => {
  const firstValue = conversionUtil(value1, options);
  const secondValue = conversionUtil(value2, options);

  return firstValue.gt(secondValue) ? firstValue : secondValue;
};

const conversionGTE = (
  value1: string | BigNumber,
  value2: string | BigNumber,
  options: Partial<ConverterOptions> = {}
): boolean => {
  const firstValue = conversionUtil(value1, options);
  const secondValue = conversionUtil(value2, options);
  return firstValue.isGreaterThanOrEqualTo(secondValue);
};

const conversionLTE = (
  value1: string | BigNumber,
  value2: string | BigNumber,
  options: Partial<ConverterOptions> = {}
): boolean => {
  const firstValue = conversionUtil(value1, options);
  const secondValue = conversionUtil(value2, options);
  return firstValue.isLessThanOrEqualTo(secondValue);
};

const toNegative = (value: string | BigNumber, options: Partial<ConverterOptions> = {}): BigNumber =>
  multiplyCurrencies(value, -1, { ...options, multiplicandBase: 10, multiplierBase: 10 });

export {
  conversionUtil,
  addCurrencies,
  multiplyCurrencies,
  conversionGreaterThan,
  conversionLessThan,
  conversionGTE,
  conversionLTE,
  conversionMax,
  toNegative,
  subtractCurrencies,
};
