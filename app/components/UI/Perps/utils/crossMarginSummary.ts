import {
  calculateAccountSummary,
  formatPerpsFiat,
  PERPS_CONSTANTS,
  PRICE_RANGES_UNIVERSAL,
  type AccountState,
  type CrossLiquidationEstimate,
  type PerpsAccountSummary,
} from '@metamask/perps-controller';
import { strings } from '../../../../../locales/i18n';
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

export type CrossLiquidationContentKey =
  | 'cross_liquidation_price'
  | 'cross_no_liquidation_price'
  | 'cross_liquidation_estimate_unavailable';

export interface PresentedCrossLiquidation {
  /** Row text: a price, N/A, or the fallback dash. */
  display: string;
  /** Unformatted price for TP/SL checks. Empty when the row has no price. */
  rawPrice: string;
  contentKey: CrossLiquidationContentKey;
}

/**
 * Key that changes with the account figures and open position behind a cross
 * liquidation estimate, so an unchanged order is re-estimated when they move.
 */
export const getCrossLiquidationRefreshKey = ({
  account,
  positionSize,
}: {
  account: AccountState | null | undefined;
  /** Signed size open on the market, if any. */
  positionSize: string | undefined;
}): string =>
  [
    account?.crossMarginSummary?.accountValue,
    account?.crossMarginSummary?.maintenanceMargin,
    account?.spotCollateral,
    positionSize,
  ].join('|');

/**
 * Liquidation price to compare with a stop loss.
 *
 * The cross estimate prices the position left after the order. The check has
 * to use that same side. A reduce that does not flip, or a full close, leaves
 * the opposite side (or nothing). Feeding that price to the order side marks
 * every stop unsafe; the check used to see an empty price and skip. Increasing
 * or flipping keeps the price, because the remaining side is the order side.
 * Callers that already validate against the remaining side pass that side as
 * `checkIsLong` and keep the price.
 */
export const liquidationPriceForOrderSide = ({
  liquidationPrice,
  existingSignedSize,
  orderSize,
  orderIsLong,
  checkIsLong = orderIsLong,
}: {
  liquidationPrice: string;
  /** Signed size already open. Positive is long. */
  existingSignedSize: number;
  /** Unsigned order size in base units. */
  orderSize: number;
  /** Direction of the order, not of the position it leaves. */
  orderIsLong: boolean;
  /** Direction the stop-loss check will use. Defaults to the order. */
  checkIsLong?: boolean;
}): string => {
  if (
    !liquidationPrice ||
    !Number.isFinite(existingSignedSize) ||
    !(orderSize > 0)
  ) {
    return liquidationPrice;
  }
  const signedOrder = (orderIsLong ? 1 : -1) * orderSize;
  const signedResult = existingSignedSize + signedOrder;
  if (signedResult === 0 || signedResult > 0 !== checkIsLong) {
    return '';
  }
  return liquidationPrice;
};

/**
 * Turns a `PerpsController.estimateCrossLiquidation` result into the
 * order-row value. Callers that are not placing a cross order should keep
 * their isolated price instead.
 *
 * @param params - The estimate and whether the form has a valid amount.
 * @param params.estimate - Controller estimate; `undefined` until the first one
 * resolves.
 * @param params.hasValidAmount - Whether the order has a usable size.
 * @returns The row text, raw price and explainer key.
 */
export const presentCrossLiquidationEstimate = ({
  estimate,
  hasValidAmount,
}: {
  estimate: CrossLiquidationEstimate | undefined;
  hasValidAmount: boolean;
}): PresentedCrossLiquidation => {
  if (hasValidAmount && estimate?.status === 'price') {
    return {
      display: formatPerpsFiat(estimate.price, {
        ranges: PRICE_RANGES_UNIVERSAL,
      }),
      rawPrice: estimate.price,
      contentKey: 'cross_liquidation_price',
    };
  }
  if (hasValidAmount && estimate?.status === 'none') {
    return {
      display: strings('perps.cross_position.no_liquidation_price'),
      rawPrice: '',
      contentKey: 'cross_no_liquidation_price',
    };
  }
  return {
    display: PERPS_CONSTANTS.FallbackDataDisplay,
    rawPrice: '',
    contentKey: 'cross_liquidation_estimate_unavailable',
  };
};

export type OrderLiquidationContentKey =
  | 'liquidation_price'
  | CrossLiquidationContentKey;

export interface OrderLiquidationRow {
  display: string;
  contentKey: OrderLiquidationContentKey;
  /** Price string for TP/SL. Empty when the row has no price. */
  rawPrice: string;
  /** Numeric price for the distance label, when the row shows a price. */
  distancePrice?: number;
}

/**
 * Picks the order-row liquidation value. Cross uses the controller's
 * pre-trade estimate. Isolated keeps the controller's isolated price.
 *
 * @param params - Order margin mode, estimates and amount state.
 * @param params.isCrossOrder - Whether the order liquidates against the
 * cross account.
 * @param params.crossEstimate - Cross estimate, `undefined` until resolved.
 * @param params.hasValidAmount - Whether the order has a usable size.
 * @param params.isolatedPrice - Isolated estimate, `undefined` when
 * unavailable.
 * @returns The row to render.
 */
export const selectOrderLiquidationRow = ({
  isCrossOrder,
  crossEstimate,
  hasValidAmount,
  isolatedPrice,
}: {
  isCrossOrder: boolean;
  crossEstimate: CrossLiquidationEstimate | undefined;
  hasValidAmount: boolean;
  isolatedPrice: string | undefined;
}): OrderLiquidationRow => {
  if (isCrossOrder) {
    const presented = presentCrossLiquidationEstimate({
      estimate: crossEstimate,
      hasValidAmount,
    });
    const parsedCrossPrice = Number.parseFloat(presented.rawPrice);
    return {
      ...presented,
      distancePrice: Number.isFinite(parsedCrossPrice)
        ? parsedCrossPrice
        : undefined,
    };
  }
  const parsedIsolatedPrice =
    isolatedPrice === undefined ? Number.NaN : Number.parseFloat(isolatedPrice);
  const hasIsolatedPrice =
    hasValidAmount &&
    Number.isFinite(parsedIsolatedPrice) &&
    parsedIsolatedPrice > 0;
  return {
    display: hasIsolatedPrice
      ? formatPerpsFiat(parsedIsolatedPrice, {
          ranges: PRICE_RANGES_UNIVERSAL,
        })
      : PERPS_CONSTANTS.FallbackDataDisplay,
    contentKey: 'liquidation_price',
    rawPrice: isolatedPrice ?? '',
    distancePrice: hasIsolatedPrice ? parsedIsolatedPrice : undefined,
  };
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
