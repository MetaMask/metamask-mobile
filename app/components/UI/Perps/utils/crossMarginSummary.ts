import {
  calculateAccountSummary,
  getCrossCollateral,
  type AccountState,
  type CrossMarginSummary,
  type PerpsAccountSummary,
  type PerpsProviderType,
} from '@metamask/perps-controller';
import type {
  HardwareTier,
  NetworkTier,
} from '../../../../util/deviceCapability/types';
import { formatCrossMarginRatio } from './formatUtils';
import {
  CROSS_MARGIN_RATIO_DANGER_THRESHOLD,
  CROSS_MARGIN_RATIO_WARNING_THRESHOLD,
  CROSS_MARGIN_SUMMARY_SLOW_NETWORK_LOW_HARDWARE_THROTTLE_MS,
  CROSS_MARGIN_SUMMARY_SLOW_NETWORK_THROTTLE_MS,
} from '../constants/perpsConfig';

export type CrossMarginRatioTone = 'safe' | 'warning' | 'danger';

/** A ratio that needs an alert. Safe and unknown ratios do not. */
export type CrossMarginRatioAlert = Exclude<CrossMarginRatioTone, 'safe'>;

const EMPTY_ACCOUNT_SUMMARY: PerpsAccountSummary = {
  maintenanceMargin: undefined,
  accountRatio: undefined,
  accountLeverage: undefined,
  crossMarginUsage: undefined,
};

/**
 * Derives the cross margin metrics shown in the balance summary from the
 * streamed account, using Core's account summary.
 *
 * The ratio and usage stay undefined until the controller publishes
 * `account.spotCollateral`, which it does once the spot state and the
 * Hyperliquid abstraction mode are known. Standard accounts report `'0'`.
 */
export const calculateCrossMarginAccountSummaryFromAccount = (
  account: AccountState | null | undefined,
): PerpsAccountSummary =>
  account
    ? calculateAccountSummary({
        totalEquity: account.totalBalance,
        crossMarginSummary: account.crossMarginSummary,
        spotCollateral: account.spotCollateral,
      })
    : EMPTY_ACCOUNT_SUMMARY;

const toFiniteNumber = (value: string | undefined): number | undefined => {
  if (value === undefined || value === '') {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

/**
 * USD that can collateralize a new order on a cross account.
 *
 * Hyperliquid's venue `withdrawable` is smaller than this while a cross
 * position is open, because a withdrawal keeps a maintenance buffer. The
 * order form uses account value minus margin used, which is
 * `crossMarginSummary.totalMarginUsed` before the adapter renames it to
 * `marginUsed`. The result follows the live account stream, so mark price,
 * deposits, withdrawals, and position changes move it.
 *
 * @returns The free cross collateral, or undefined when the summary is missing
 * or either figure is not a finite decimal. Negative free collateral is 0.
 */
export const getCrossAvailableToTrade = (
  crossMarginSummary:
    | Pick<CrossMarginSummary, 'accountValue' | 'marginUsed'>
    | undefined,
): number | undefined => {
  const accountValue = toFiniteNumber(crossMarginSummary?.accountValue);
  const marginUsed = toFiniteNumber(crossMarginSummary?.marginUsed);
  if (accountValue === undefined || marginUsed === undefined) {
    return undefined;
  }
  return Math.max(0, accountValue - marginUsed);
};

/**
 * Balance the order form can size and display as available to trade.
 *
 * A published cross summary wins over `spendableBalance`. The controller
 * currently sets spendable equal to venue withdrawable, which understates
 * what a cross account can still trade. Without a summary, spendable remains
 * the cap. Withdraw surfaces keep reading `withdrawableBalance`.
 */
export const getOrderAvailableToTrade = (
  account:
    | Pick<AccountState, 'spendableBalance' | 'crossMarginSummary'>
    | null
    | undefined,
): number =>
  getCrossAvailableToTrade(account?.crossMarginSummary) ??
  toFiniteNumber(account?.spendableBalance) ??
  0;

/**
 * Stream throttle for the cross margin summary from the UX matrix in
 * `app/util/deviceCapability/README.md`. Only a 2G or 3G connection changes
 * it: low-end hardware polls rarely, other hardware debounces. A `null` tier
 * keeps the product default.
 */
export const getCrossMarginSummaryThrottleMs = ({
  throttleMs,
  hardwareTier,
  networkTier,
}: {
  throttleMs: number;
  hardwareTier: HardwareTier | null;
  networkTier: NetworkTier | null;
}): number => {
  if (networkTier !== 'SLOW_CELLULAR') {
    return throttleMs;
  }
  return Math.max(
    throttleMs,
    hardwareTier === 'LOW'
      ? CROSS_MARGIN_SUMMARY_SLOW_NETWORK_LOW_HARDWARE_THROTTLE_MS
      : CROSS_MARGIN_SUMMARY_SLOW_NETWORK_THROTTLE_MS,
  );
};

/**
 * Estimates where a new cross position liquidates: the price at which the
 * cross collateral, after the position's P&L, falls to the maintenance margin
 * of the existing cross positions plus the new one. Maintenance margin is half
 * the initial margin at the market's max leverage, which is Hyperliquid's
 * rule, so other venues get no estimate. TAT-4668 moves this to
 * perps-controller.
 *
 * @returns The liquidation price, or undefined when an input is missing (the
 * spot collateral included) or the position cannot be liquidated at a
 * positive price.
 */
export const estimateCrossLiquidationPrice = ({
  entryPrice,
  size,
  isLong,
  maxLeverage,
  crossMarginSummary,
  spotCollateral,
  providerId,
}: {
  entryPrice: number;
  /** Unsigned order size in base units. */
  size: number;
  isLong: boolean;
  maxLeverage: number;
  crossMarginSummary: CrossMarginSummary | undefined;
  /** `AccountState.spotCollateral`: undefined while it is not known yet. */
  spotCollateral: string | undefined;
  /** Venue that takes the order. */
  providerId: PerpsProviderType;
}): number | undefined => {
  if (providerId !== 'hyperliquid') {
    return undefined;
  }
  const collateral = getCrossCollateral(crossMarginSummary, spotCollateral);
  const maintenanceMargin = toFiniteNumber(
    crossMarginSummary?.maintenanceMargin,
  );
  if (
    collateral === undefined ||
    maintenanceMargin === undefined ||
    !(entryPrice > 0) ||
    !(size > 0) ||
    !(maxLeverage > 0)
  ) {
    return undefined;
  }
  const side = isLong ? 1 : -1;
  const maintenanceFraction = 1 / (2 * maxLeverage);
  const marginAvailable =
    collateral - maintenanceMargin - size * entryPrice * maintenanceFraction;
  const liquidationPrice =
    entryPrice -
    (side * marginAvailable) / size / (1 - maintenanceFraction * side);
  return Number.isFinite(liquidationPrice) && liquidationPrice > 0
    ? liquidationPrice
    : undefined;
};

export const getCrossMarginRatioTone = (
  ratio: number | undefined,
): CrossMarginRatioTone | undefined => {
  if (ratio === undefined || !Number.isFinite(ratio)) {
    return undefined;
  }
  if (ratio < CROSS_MARGIN_RATIO_WARNING_THRESHOLD) {
    return 'safe';
  }
  return ratio <= CROSS_MARGIN_RATIO_DANGER_THRESHOLD ? 'warning' : 'danger';
};

/** The alert level of a tone, or undefined when the ratio is safe or unknown. */
export const getCrossMarginRatioAlert = (
  tone: CrossMarginRatioTone | undefined,
): CrossMarginRatioAlert | undefined =>
  tone === 'warning' || tone === 'danger' ? tone : undefined;

/** Same mask `SensitiveText` uses for a short hidden value. */
export const CROSS_MARGIN_HIDDEN_VALUE = '•'.repeat(6);

/**
 * Label for a ratio alert: the formatted ratio, or the privacy mask while
 * privacy mode hides the figure.
 */
export const getCrossMarginRatioAlertLabel = (
  ratio: number,
  privacyMode: boolean,
): string =>
  privacyMode ? CROSS_MARGIN_HIDDEN_VALUE : formatCrossMarginRatio(ratio);
