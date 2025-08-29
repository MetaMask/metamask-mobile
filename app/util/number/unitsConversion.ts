// TEMPORARY: copied from https://github.com/MetaMask/utils/pull/255
// Once it's merged, we can remove this file

/* eslint-disable operator-assignment */
/*
Primary Attribution
Richard Moore <ricmoo@me.com>
https://github.com/ethers-io

Note, Richard is a god of ether gods. Follow and respect him, and use Ethers.io!
*/

const zero = BigInt(0);
const negative1 = BigInt(-1);

/**
 * Converts a string, number, or bigint to a bigint.
 *
 * @param arg - The value to convert to bigint.
 * @returns The bigint representation of the input.
 * @throws Error if the input type cannot be converted to bigint.
 */
function numberToBigInt(arg: string | number | bigint): bigint {
  if (typeof arg === 'string') {
    return BigInt(arg);
  }
  if (typeof arg === 'number') {
    return BigInt(arg);
  }
  if (typeof arg === 'bigint') {
    return arg;
  }

  throw new Error(`Cannot convert ${typeof arg} to BigInt`);
}

// complete ethereum unit map
export const unitMap = {
  noether: '0',
  wei: '1',
  kwei: '1000',
  Kwei: '1000',
  babbage: '1000',
  femtoether: '1000',
  mwei: '1000000',
  Mwei: '1000000',
  lovelace: '1000000',
  picoether: '1000000',
  gwei: '1000000000',
  Gwei: '1000000000',
  shannon: '1000000000',
  nanoether: '1000000000',
  nano: '1000000000',
  szabo: '1000000000000',
  microether: '1000000000000',
  micro: '1000000000000',
  finney: '1000000000000000',
  milliether: '1000000000000000',
  milli: '1000000000000000',
  ether: '1000000000000000000',
  kether: '1000000000000000000000',
  grand: '1000000000000000000000',
  mether: '1000000000000000000000000',
  gether: '1000000000000000000000000000',
  tether: '1000000000000000000000000000000',
} as const;

// Pre-computed unit values as BigInt for performance
const unitMapBigInt = Object.fromEntries(
  Object.entries(unitMap).map(([key, value]) => [key, BigInt(value)]),
) as Record<EthereumUnit, bigint>;

const unitLengths = Object.fromEntries(
  Object.entries(unitMap).map(([key, value]) => [key, value.length - 1 || 1]),
) as Record<EthereumUnit, number>;

const NUMBER_REGEX = /^-?[0-9.]+$/u;
const FRACTION_REGEX = /^([0-9]*[1-9]|0)(0*)/u;
const COMMIFY_REGEX = /\B(?=(\d{3})+(?!\d))/gu;

export type EthereumUnit = keyof typeof unitMap;

/**
 * Returns value of unit in Wei.
 *
 * @param unitInput - The unit to convert to, default ether.
 * @returns Value of the unit (in Wei).
 * @throws Error if the unit is not correct.
 */
export function getValueOfUnit(unitInput: EthereumUnit = 'ether'): bigint {
  const unit = unitInput.toLowerCase() as EthereumUnit;
  const unitValue = unitMapBigInt[unit];

  if (unitValue === undefined) {
    throw new Error(
      `[ethjs-unit] the unit provided ${unitInput} doesn't exists, please use the one of the following units ${JSON.stringify(
        unitMap,
        null,
        2,
      )}`,
    );
  }

  return unitValue;
}

/**
 * Converts a number to a string.
 *
 * @param arg - The number to convert to a string.
 * @returns The string representation of the number.
 * @throws Error if the number is invalid.
 */
export function numberToString(arg: string | number | bigint) {
  if (typeof arg === 'string') {
    if (!NUMBER_REGEX.test(arg)) {
      throw new Error(
        `while converting number to string, invalid number value '${arg}', should be a number matching (^-?[0-9.]+).`,
      );
    }
    return arg;
  }
  if (typeof arg === 'number') {
    return String(arg);
  }
  // eslint-disable-next-line valid-typeof
  if (typeof arg === 'bigint') {
    return arg.toString();
  }
  throw new Error(
    `while converting number to string, invalid number value '${String(
      arg,
    )}' type ${typeof arg}.`,
  );
}

/**
 * Converts a number from Wei to a string.
 *
 * @param weiInput - The number to convert from Wei.
 * @param unit - The unit to convert to, default ether.
 * @param optionsInput - The options to use for the conversion.
 * @param optionsInput.pad - Whether to pad the fractional part with zeros.
 * @param optionsInput.commify - Whether to add commas to separate thousands.
 * @returns The string representation of the number.
 * @throws Error if the number is invalid.
 */
export function fromWei(
  weiInput: string | number | bigint,
  unit: EthereumUnit,
  optionsInput?: { pad?: boolean; commify?: boolean },
) {
  var wei = numberToBigInt(weiInput); // eslint-disable-line
  var negative = wei < zero; // eslint-disable-line
  const unitLower = unit.toLowerCase() as EthereumUnit;
  const base = unitMapBigInt[unitLower];
  const baseLength = unitLengths[unitLower];
  const options = optionsInput ?? {};

  if (base === undefined) {
    throw new Error(
      `[ethjs-unit] the unit provided ${unit} doesn't exists, please use the one of the following units ${JSON.stringify(
        unitMap,
        null,
        2,
      )}`,
    );
  }

  // Handle special case of noether (base = 0)
  if (base === zero) {
    return negative ? '-0' : '0';
  }

  if (negative) {
    wei = wei * negative1;
  }

  var fraction = (wei % base).toString(); // eslint-disable-line

  fraction = fraction.padStart(baseLength, '0');

  if (!options.pad) {
    const fractionMatch = fraction.match(FRACTION_REGEX);
    fraction = fractionMatch?.[1] ?? '0';
  }

  var whole = (wei / base).toString(); // eslint-disable-line

  if (options.commify) {
    whole = whole.replace(COMMIFY_REGEX, ',');
  }

  var value = `${whole}${fraction == '0' ? '' : `.${fraction}`}`; // eslint-disable-line

  if (negative) {
    value = `-${value}`;
  }

  return value;
}

/**
 * Converts a number to Wei.
 *
 * @param etherInput - The number to convert to Wei.
 * @param unit - The unit to convert to, default ether.
 * @returns The number in Wei.
 * @throws Error if the number is invalid.
 */
export function toWei(
  etherInput: string | number | bigint,
  unit: EthereumUnit,
): bigint {
  const unitLower = unit.toLowerCase() as EthereumUnit;
  const base = unitMapBigInt[unitLower];
  const baseLength = unitLengths[unitLower];

  if (base === undefined) {
    throw new Error(
      `[ethjs-unit] the unit provided ${unit} doesn't exists, please use the one of the following units ${JSON.stringify(
        unitMap,
        null,
        2,
      )}`,
    );
  }

  // Handle special case of noether (base = 0)
  if (base === zero) {
    return zero;
  }

  // Fast path for bigint inputs when unit is wei (no conversion needed)
  if (typeof etherInput === 'bigint' && unitLower === 'wei') {
    return etherInput;
  }

  // Fast path for bigint inputs with whole units (no fractional part)
  if (typeof etherInput === 'bigint') {
    return etherInput * base;
  }

  var ether = numberToString(etherInput); // eslint-disable-line

  // Is it negative?
  var negative = ether.substring(0, 1) === '-'; // eslint-disable-line
  if (negative) {
    ether = ether.substring(1);
  }

  if (ether === '.') {
    throw new Error(
      `[ethjs-unit] while converting number ${etherInput} to wei, invalid value`,
    );
  }

  // Split it into a whole and fractional part
  var comps = ether.split('.'); // eslint-disable-line
  if (comps.length > 2) {
    throw new Error(
      `[ethjs-unit] while converting number ${etherInput} to wei,  too many decimal points`,
    );
  }

  let whole = comps[0];
  let fraction = comps[1];

  if (!whole) {
    whole = '0';
  }
  if (!fraction) {
    fraction = '0';
  }
  if (fraction.length > baseLength) {
    throw new Error(
      `[ethjs-unit] while converting number ${etherInput} to wei, too many decimal places`,
    );
  }

  fraction = fraction.padEnd(baseLength, '0');

  const wholeBigInt = BigInt(whole);
  const fractionBigInt = BigInt(fraction);
  let wei = wholeBigInt * base + fractionBigInt;

  if (negative) {
    wei = wei * negative1;
  }

  return wei;
}
