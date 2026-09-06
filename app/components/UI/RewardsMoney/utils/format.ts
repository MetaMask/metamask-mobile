import I18n from '../../../../../locales/i18n';
import { MUSD_DECIMALS } from '../../../../core/Engine/controllers/rewards-money-controller/types';

const BASE_UNITS_PER_MUSD = 10n ** BigInt(MUSD_DECIMALS);

/**
 * Formats an mUSD base-unit string for display.
 *
 * The value is parsed as a BigInt because balances exceed
 * `Number.MAX_SAFE_INTEGER`; only the already-truncated whole and fractional
 * parts are handed to `Number` for locale formatting.
 *
 * Bound: exact below ~1e14 base units (~100M mUSD), where the double still
 * holds the whole part plus two decimals. Above that the displayed decimals
 * degrade and above ~9e15 the whole part does too. Deliberately not addressed
 * — no real balance approaches it, and only display is affected; every amount
 * that is signed or sent stays a base-unit string end to end.
 *
 * @param baseUnits - mUSD amount in base units, as a decimal string.
 * @param fractionDigits - Decimal places to show. Defaults to 2.
 * @returns A locale-formatted amount, without a currency symbol.
 */
export function formatMusd(
  baseUnits: string | null | undefined,
  fractionDigits = 2,
): string {
  let value: bigint;
  try {
    value = BigInt(baseUnits ?? '0');
  } catch {
    value = 0n;
  }

  const isNegative = value < 0n;
  const absolute = isNegative ? -value : value;

  const whole = absolute / BASE_UNITS_PER_MUSD;
  const remainder = absolute % BASE_UNITS_PER_MUSD;

  const fraction = Number(remainder) / Number(BASE_UNITS_PER_MUSD);

  const formatted = new Intl.NumberFormat(I18n.locale, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(Number(whole) + fraction);

  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Formats a basis-point rate as a percentage, e.g. `2500` → `25%`.
 *
 * @param bps - The rate in basis points, or null when the program is unconfigured.
 * @returns The percentage string, or null when there is no rate to show.
 */
export function formatRateBps(bps: number | null | undefined): string | null {
  if (bps === null || bps === undefined || !Number.isFinite(bps)) {
    return null;
  }

  const percent = bps / 100;
  const formatted = new Intl.NumberFormat(I18n.locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(percent);

  return `${formatted}%`;
}

/**
 * Whole days remaining until an ISO timestamp, floored at zero. Drives the
 * "your bonus window ends in N days" line.
 *
 * @param isoDate - The window end, or null when there is none.
 * @param now - Reference time, injectable for tests.
 * @returns Days remaining, or null when there is no end date.
 */
export function daysUntil(
  isoDate: string | null | undefined,
  now: number = Date.now(),
): number | null {
  if (!isoDate) {
    return null;
  }

  const end = new Date(isoDate).getTime();
  if (Number.isNaN(end)) {
    return null;
  }

  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((end - now) / msPerDay));
}
