import BigNumber from 'bignumber.js';
import { BN } from 'ethereumjs-util';
// @ts-ignore
import { stripHexPrefix } from 'ethjs-util';

// Declare the type of stripHexPrefix for type safety
const typedStripHexPrefix: (str: string) => string = stripHexPrefix;

type NumericBase = 'hex' | 'dec' | 'BN';
type EthDenomination = 'WEI' | 'GWEI' | 'ETH';

export interface ConverterOptions {
  value: string | BigNumber;
  fromNumericBase: NumericBase;
  toNumericBase: NumericBase;
  fromDenomination?: EthDenomination;
  toDenomination?: EthDenomination;
  fromCurrency?: string;
  toCurrency?: string;
  numberOfDecimals?: number;
  conversionRate?: number | string;
  invertConversionRate?: boolean;
  roundDown?: number;
}

type Converter = (options: ConverterOptions) => BigNumber;

// Create a wrapper function for stripHexPrefix to isolate the untyped library usage
function safeStripHexPrefix(str: string): string {
  return typeof typedStripHexPrefix === 'function' ? typedStripHexPrefix(str) : str;
}

// Big Number Constants
const BIG_NUMBER_WEI_MULTIPLIER = new BigNumber('1000000000000000000');
const BIG_NUMBER_GWEI_MULTIPLIER = new BigNumber('1000000000');

const toBigNumber: Record<NumericBase, (n: string | number | BigNumber | BN) => BigNumber> = {
  hex: (n) => new BigNumber(safeStripHexPrefix(n.toString()), 16),
  dec: (n) => new BigNumber(String(n), 10),
  BN: (n) => new BigNumber(n instanceof BN ? n.toString(16) : String(n), 16),
};

const converter: Converter = (options: ConverterOptions): BigNumber => {
  const { value, fromNumericBase, fromDenomination, toDenomination, conversionRate, invertConversionRate } = options;

  let bigNumber: BigNumber;
  try {
    bigNumber = toBigNumber[fromNumericBase](value);
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Failed to convert value to BigNumber: ${error.message}`);
    } else {
      throw new Error('Failed to convert value to BigNumber: Unknown error');
    }
  }

  if (fromDenomination === 'WEI' && toDenomination === 'ETH') {
    return bigNumber.dividedBy(BIG_NUMBER_WEI_MULTIPLIER);
  } else if (fromDenomination === 'ETH' && toDenomination === 'WEI') {
    return bigNumber.times(BIG_NUMBER_WEI_MULTIPLIER);
  }

  if (conversionRate) {
    const rate = new BigNumber(conversionRate);
    return invertConversionRate ? bigNumber.dividedBy(rate) : bigNumber.times(rate);
  }

  return bigNumber;
};

export function conversionUtil(
  value: string | BigNumber,
  options: Partial<ConverterOptions>
): string {
  const fullOptions: ConverterOptions = {
    value,
    fromNumericBase: 'dec',
    toNumericBase: 'dec',
    ...options,
  };
  return converter(fullOptions).toString(10);
}

export function getBigNumber(
  value: string | number | BigNumber,
  base: NumericBase = 'dec'
): BigNumber {
  if (base === 'hex') {
    return new BigNumber(safeStripHexPrefix(value.toString()), 16);
  }
  return new BigNumber(value.toString(), 10);
}

export function addCurrencies(
  a: string | number | BigNumber,
  b: string | number | BigNumber,
  options: Partial<ConverterOptions> & { aBase?: NumericBase; bBase?: NumericBase } = {}
): string {
  const { aBase = 'dec', bBase = 'dec', ...conversionOptions } = options;

  const value = getBigNumber(a, aBase).plus(getBigNumber(b, bBase));

  return conversionUtil(value.toString(), {
    ...conversionOptions,
    fromNumericBase: 'dec',
  });
}

export function subtractCurrencies(
  a: string | number | BigNumber,
  b: string | number | BigNumber,
  options: Partial<ConverterOptions> & { aBase?: NumericBase; bBase?: NumericBase } = {}
): string {
  const { aBase = 'dec', bBase = 'dec', ...conversionOptions } = options;

  const value = getBigNumber(a, aBase).minus(getBigNumber(b, bBase));

  return conversionUtil(value.toString(), {
    ...conversionOptions,
    fromNumericBase: 'dec',
  });
}

export function multiplyCurrencies(
  a: string | number | BigNumber,
  b: string | number | BigNumber,
  options: Partial<ConverterOptions> & { multiplicandBase?: NumericBase; multiplierBase?: NumericBase } = {}
): string {
  const { multiplicandBase = 'dec', multiplierBase = 'dec', ...conversionOptions } = options;

  const value = getBigNumber(a, multiplicandBase).times(getBigNumber(b, multiplierBase));

  return conversionUtil(value.toString(), {
    ...conversionOptions,
    fromNumericBase: 'dec',
  });
}

export function conversionGreaterThan(
  { ...firstProps }: Partial<ConverterOptions>,
  { ...secondProps }: Partial<ConverterOptions>
): boolean {
  const first = conversionUtil('0', { ...firstProps, fromNumericBase: 'dec', toNumericBase: 'dec' });
  const second = conversionUtil('0', { ...secondProps, fromNumericBase: 'dec', toNumericBase: 'dec' });
  return new BigNumber(first).gt(new BigNumber(second));
}

export function conversionLessThan(
  { ...firstProps }: Partial<ConverterOptions>,
  { ...secondProps }: Partial<ConverterOptions>
): boolean {
  const first = conversionUtil('0', { ...firstProps, fromNumericBase: 'dec', toNumericBase: 'dec' });
  const second = conversionUtil('0', { ...secondProps, fromNumericBase: 'dec', toNumericBase: 'dec' });
  return new BigNumber(first).lt(new BigNumber(second));
}

export function conversionMax(
  { ...firstProps }: Partial<ConverterOptions>,
  { ...secondProps }: Partial<ConverterOptions>
): string {
  const first = conversionUtil('0', { ...firstProps, fromNumericBase: 'dec', toNumericBase: 'dec' });
  const second = conversionUtil('0', { ...secondProps, fromNumericBase: 'dec', toNumericBase: 'dec' });
  const firstBN = new BigNumber(first);
  const secondBN = new BigNumber(second);
  return firstBN.gt(secondBN) ? first : second;
}

export function conversionGTE(
  { ...firstProps }: Partial<ConverterOptions>,
  { ...secondProps }: Partial<ConverterOptions>
): boolean {
  const first = conversionUtil('0', { ...firstProps, fromNumericBase: 'dec', toNumericBase: 'dec' });
  const second = conversionUtil('0', { ...secondProps, fromNumericBase: 'dec', toNumericBase: 'dec' });
  return new BigNumber(first).gte(new BigNumber(second));
}

export function conversionLTE(
  { ...firstProps }: Partial<ConverterOptions>,
  { ...secondProps }: Partial<ConverterOptions>
): boolean {
  const first = conversionUtil('0', { ...firstProps, fromNumericBase: 'dec', toNumericBase: 'dec' });
  const second = conversionUtil('0', { ...secondProps, fromNumericBase: 'dec', toNumericBase: 'dec' });
  return new BigNumber(first).lte(new BigNumber(second));
}

export function toNegative(n: string, options: Partial<ConverterOptions> = {}): string {
  return multiplyCurrencies(n, '-1', options);
}
