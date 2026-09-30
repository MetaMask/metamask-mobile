import BigNumber from 'bignumber.js';
import formatFiat from '../../../../../../util/formatFiat';
import { USDC_DECIMALS } from '../constants';

const USDC_UNIT = 10n ** BigInt(USDC_DECIMALS);
const MIN_DISPLAYED_DECIMALS = 2;
const INTEGER_PATTERN = /^-?\d+$/u;
const NUMBER_PATTERN = /\d[\d,]*(?:\.\d+)?/u;

/**
 * Parses a base-unit decimal string, returning 0 for anything malformed.
 *
 * @param value - Base units, e.g. "42500000".
 * @returns The amount as a bigint.
 */
export const parseBaseUnits = (value: string | undefined): bigint =>
  value && INTEGER_PATTERN.test(value.trim()) ? BigInt(value.trim()) : 0n;

/** Human-readable USDC to base units; extra decimals are truncated. */
export const parseUsdcAmount = (
  amount: string | number | undefined,
): bigint => {
  const value = new BigNumber(amount ?? 0);
  return value.isFinite() && !value.isNegative()
    ? BigInt(
        value
          .shiftedBy(USDC_DECIMALS)
          .integerValue(BigNumber.ROUND_DOWN)
          .toFixed(),
      )
    : 0n;
};

/**
 * Formats USDC base units (6 decimals) for display.
 *
 * @param baseUnits - Amount in base units, e.g. "42500000".
 * @returns The amount with 2 to 6 decimals, e.g. "42.50".
 */
export const formatUsdcAmount = (baseUnits: string | bigint): string => {
  const value =
    typeof baseUnits === 'bigint' ? baseUnits : parseBaseUnits(baseUnits);
  const sign = value < 0n ? '-' : '';
  const absolute = value < 0n ? -value : value;
  const whole = (absolute / USDC_UNIT).toString();
  const fraction = (absolute % USDC_UNIT)
    .toString()
    .padStart(USDC_DECIMALS, '0')
    .replace(/0+$/u, '')
    .padEnd(MIN_DISPLAYED_DECIMALS, '0');
  return `${sign}${whole}.${fraction}`;
};

/**
 * Formats a USD value, without cents when it is a whole number.
 *
 * @param value - Value in USD, e.g. 1234.
 * @returns The formatted value, e.g. "$1,234".
 */
export const formatUsd = (value: number): string =>
  formatFiat(new BigNumber(value), 'USD');

/** Insured value in CollectorCrypt metadata ("37", "$45.00", "1,200"). */
export const parseInsuredValue = (raw: unknown): number | undefined => {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) && raw >= 0 ? raw : undefined;
  }
  if (typeof raw !== 'string') {
    return undefined;
  }
  const match = NUMBER_PATTERN.exec(raw);
  if (!match) {
    return undefined;
  }
  const value = Number(match[0].replace(/,/gu, ''));
  return Number.isFinite(value) ? value : undefined;
};

/** ISO timestamp to epoch ms, undefined when absent or malformed. */
export const parseTimestamp = (value: unknown): number | undefined => {
  const time = typeof value === 'string' ? Date.parse(value) : Number.NaN;
  return Number.isFinite(time) ? time : undefined;
};
