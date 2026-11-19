import { toUsdcBaseUnits } from '../../../funding';
import type { PredictAmount } from '../../../types';

/** The Polymarket deposit rules: at least 1 USD, no maximum. */
export const MINIMUM_DEPOSIT_USD = 1;
const MAX_INPUT_DIGITS = 9;
const USDC_BASE_UNITS_PER_CENT = BigInt(10_000);
const CENTS_PER_DOLLAR = BigInt(100);
const MINIMUM_DEPOSIT_BASE_UNITS = BigInt(MINIMUM_DEPOSIT_USD * 1_000_000);

/**
 * Keypad input as a USD amount: digits and one point, at most nine whole
 * digits and two decimals, no leading zeros. Extra keys are dropped, never
 * rounded into the amount.
 */
export const sanitizeDepositInput = (next: string): string => {
  const cleaned = next.replace(/[^0-9.]/gu, '');
  const dotIndex = cleaned.indexOf('.');
  const whole = (dotIndex === -1 ? cleaned : cleaned.slice(0, dotIndex))
    .slice(0, MAX_INPUT_DIGITS)
    .replace(/^0+(?=\d)/u, '');
  if (dotIndex === -1) {
    return whole;
  }
  const decimals = cleaned
    .slice(dotIndex + 1)
    .replace(/\./gu, '')
    .slice(0, 2);
  return `${whole.length > 0 ? whole : '0'}.${decimals}`;
};

/** Whether keypad input is a complete amount: digits, then at most two
 * decimals. `'25.'` is still being typed. */
export const isCompleteDepositAmount = (amount: string): boolean =>
  /^\d{1,9}(\.\d{1,2})?$/u.test(amount);

/** Keypad input as USDC base units, or undefined while it is incomplete. */
export const depositInputBaseUnits = (input: string): bigint | undefined =>
  isCompleteDepositAmount(input) ? toUsdcBaseUnits(input) : undefined;

/** Whether complete keypad input reaches the 1 USD minimum. */
export const meetsDepositMinimum = (input: string): boolean => {
  const baseUnits = depositInputBaseUnits(input);
  return baseUnits !== undefined && baseUnits >= MINIMUM_DEPOSIT_BASE_UNITS;
};

/** Complete keypad input as the funding routes carry it: USD with two
 * decimals, `'25'` as `'25.00'`. */
export const toDepositAmount = (input: string): PredictAmount => {
  const [whole, decimals = ''] = input.split('.');
  return `${whole || '0'}.${decimals.padEnd(2, '0')}` as PredictAmount;
};

/** USDC base units as a USD figure, rounded down to the cent: never shows
 * more than the wallet holds. */
export const formatUsdcBalance = (baseUnits: bigint): string => {
  const cents = baseUnits / USDC_BASE_UNITS_PER_CENT;
  const dollars = cents / CENTS_PER_DOLLAR;
  const remainder = (cents % CENTS_PER_DOLLAR).toString().padStart(2, '0');
  const grouped = dollars.toString().replace(/\B(?=(\d{3})+(?!\d))/gu, ',');
  return `${grouped}.${remainder}`;
};
