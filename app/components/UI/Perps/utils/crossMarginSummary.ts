import {
  calculateAccountSummary,
  type AccountState,
  type PerpsAccountSummary,
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
