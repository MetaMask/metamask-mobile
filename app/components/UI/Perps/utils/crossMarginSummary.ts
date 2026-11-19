import {
  buildMaintenanceSchedule,
  calculateAccountSummary,
  formatPerpsFiat,
  getCrossCollateral,
  PERPS_CONSTANTS,
  PRICE_RANGES_UNIVERSAL,
  resolveHyperLiquidMarginTiers,
  type AccountState,
  type CrossMarginSummary,
  type PerpsAccountSummary,
  type PerpsProviderType,
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

const toFiniteNumber = (value: string | undefined): number | undefined => {
  if (value === undefined || value === '') {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

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
 * Hyperliquid margin-table ids below this are one tier whose max leverage is
 * the table id. Ids at or above it need `meta.marginTables`, which this
 * client does not have, so the estimate prices the lowest tier at the asset
 * max leverage and is marked approximate.
 */
const HYPERLIQUID_TIERED_MARGIN_TABLE_ID = 50;

type MaintenanceScheduleTier = ReturnType<
  typeof buildMaintenanceSchedule
>[number];

const findMaintenanceTier = (
  schedule: MaintenanceScheduleTier[],
  notional: number,
): MaintenanceScheduleTier | undefined =>
  schedule.find(
    (tier) => notional >= tier.lowerBound && notional < tier.upperBound,
  );

/**
 * Same math as perps-controller `estimateCrossMaintenanceMargin` for one
 * position, which is not exported by the installed version. TAT-4668 swaps
 * this for the package export.
 *
 * @returns Maintenance margin in USD, or null when no tier covers the notional.
 */
const crossMaintenanceMargin = (
  notional: number,
  schedule: MaintenanceScheduleTier[],
): number | null => {
  const tier = findMaintenanceTier(schedule, Math.abs(notional));
  return tier
    ? Math.abs(notional) * tier.maintenanceMarginRate -
        tier.maintenanceDeduction
    : null;
};

/**
 * Same math as perps-controller `estimateCrossLiquidationPrice` (the formula
 * behind `calculateLiquidationPrice` with `marginType: 'cross'`), which is not
 * exported by the installed version. TAT-4668 swaps this for the package
 * export.
 *
 * @returns Liquidation price, or null when no positive price exists.
 */
const crossLiquidationPriceAtTier = ({
  isLong,
  markPrice,
  positionSize,
  accountValue,
  maintenanceMargin,
  schedule,
}: {
  isLong: boolean;
  markPrice: number;
  positionSize: number;
  accountValue: number;
  /** Maintenance of every cross position, this one included. */
  maintenanceMargin: number;
  schedule: MaintenanceScheduleTier[];
}): number | null => {
  const currentTier = findMaintenanceTier(schedule, positionSize * markPrice);
  if (!currentTier || !(maintenanceMargin >= 0)) {
    return null;
  }
  const side = isLong ? 1 : -1;
  for (const tier of schedule) {
    const denominator = positionSize * (side - tier.maintenanceMarginRate);
    if (Math.abs(denominator) < Number.EPSILON) {
      continue;
    }
    const liquidationPrice =
      (maintenanceMargin -
        accountValue +
        currentTier.maintenanceDeduction -
        tier.maintenanceDeduction +
        positionSize * markPrice * (side - currentTier.maintenanceMarginRate)) /
      denominator;
    if (!Number.isFinite(liquidationPrice) || liquidationPrice <= 0) {
      continue;
    }
    const notionalAtLiquidation = positionSize * liquidationPrice;
    if (
      notionalAtLiquidation >= tier.lowerBound &&
      notionalAtLiquidation < tier.upperBound
    ) {
      return liquidationPrice;
    }
  }
  return null;
};

export type CrossLiquidationContentKey =
  | 'cross_liquidation_price'
  | 'cross_no_liquidation_price'
  | 'cross_liquidation_estimate_unavailable';

export interface PresentedCrossLiquidation {
  /** Row text: a price, `~price`, N/A, or the fallback dash. */
  display: string;
  /** Unformatted price for TP/SL checks. Empty when the row has no price. */
  rawPrice: string;
  contentKey: CrossLiquidationContentKey;
}

export type CrossLiquidationEstimate =
  | { status: 'unknown' }
  | { status: 'none' }
  | { status: 'price'; price: number; approximate: boolean };

/**
 * Pre-trade cross liquidation estimate, using the formula of perps-controller
 * `calculateLiquidationPrice` for cross orders.
 *
 * Within one maintenance tier this is
 * `liq_price = price − side × (account_value − maintenance) / position_size / (1 − mmr × side)`
 * with `mmr = 1 / (2 × tier max leverage)`, `account_value` the cross
 * collateral, and `maintenance` that of every other position plus the
 * resulting position at the entry price. The tier at the liquidation notional
 * is used when it differs from the current one.
 *
 * An order that adds to or reduces a position uses the resulting size. Spot
 * collateral that is not published yet is left out and the price is marked
 * approximate, so the row still shows an estimate. A non-positive price means
 * the position cannot be liquidated.
 *
 * @returns `unknown` when an input is missing, `none` when no positive
 * liquidation price exists, or the price.
 */
export const estimateCrossLiquidationPrice = ({
  entryPrice,
  size,
  isLong,
  maxLeverage,
  crossMarginSummary,
  spotCollateral,
  providerId,
  existingSignedSize = 0,
  marginTableId,
}: {
  entryPrice: number;
  /** Unsigned order size in base units. */
  size: number;
  /** Direction of the order, not of the position it leaves behind. */
  isLong: boolean;
  maxLeverage: number;
  crossMarginSummary: CrossMarginSummary | undefined;
  /**
   * `AccountState.spotCollateral`. Undefined while it is not known yet; the
   * estimate then uses cross account value alone and is approximate.
   */
  spotCollateral: string | undefined;
  /** Venue that takes the order. */
  providerId: PerpsProviderType;
  /** Signed size already open on this market. Positive is long. */
  existingSignedSize?: number;
  /** Hyperliquid `marginTableId`. Tiered tables make the price approximate. */
  marginTableId?: number;
}): CrossLiquidationEstimate => {
  if (providerId !== 'hyperliquid') {
    return { status: 'unknown' };
  }
  const spotIsKnown = spotCollateral !== undefined;
  const collateral = getCrossCollateral(
    crossMarginSummary,
    spotIsKnown ? spotCollateral : '0',
  );
  const maintenanceMargin = toFiniteNumber(
    crossMarginSummary?.maintenanceMargin,
  );
  if (
    collateral === undefined ||
    maintenanceMargin === undefined ||
    !(entryPrice > 0) ||
    !(size > 0) ||
    !(maxLeverage > 0) ||
    !Number.isFinite(existingSignedSize)
  ) {
    return { status: 'unknown' };
  }
  const signedOrder = (isLong ? 1 : -1) * size;
  const signedResult = existingSignedSize + signedOrder;
  const resultSize = Math.abs(signedResult);
  if (!(resultSize > 0)) {
    return { status: 'none' };
  }
  const tieredMarket =
    marginTableId !== undefined &&
    marginTableId >= HYPERLIQUID_TIERED_MARGIN_TABLE_ID;
  const schedule = buildMaintenanceSchedule(
    resolveHyperLiquidMarginTiers({ marginTableId, maxLeverage }) ?? [
      { lowerBound: 0, maxLeverage },
    ],
  );
  const existingMaintenance = crossMaintenanceMargin(
    existingSignedSize * entryPrice,
    schedule,
  );
  const resultMaintenance = crossMaintenanceMargin(
    resultSize * entryPrice,
    schedule,
  );
  if (existingMaintenance === null || resultMaintenance === null) {
    return { status: 'unknown' };
  }
  const otherMaintenance = Math.max(0, maintenanceMargin - existingMaintenance);
  const liquidationPrice = crossLiquidationPriceAtTier({
    isLong: signedResult > 0,
    markPrice: entryPrice,
    positionSize: resultSize,
    accountValue: collateral,
    maintenanceMargin: otherMaintenance + resultMaintenance,
    schedule,
  });
  if (liquidationPrice === null) {
    return { status: 'none' };
  }
  return {
    status: 'price',
    price: liquidationPrice,
    approximate: !spotIsKnown || tieredMarket,
  };
};

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
 * Turns a cross estimate into the order-row value. Callers that are not
 * placing a cross order should keep their isolated price instead.
 */
export const presentCrossLiquidationEstimate = ({
  estimate,
  hasValidAmount,
}: {
  estimate: CrossLiquidationEstimate;
  hasValidAmount: boolean;
}): PresentedCrossLiquidation => {
  if (hasValidAmount && estimate.status === 'price') {
    const formatted = formatPerpsFiat(estimate.price, {
      ranges: PRICE_RANGES_UNIVERSAL,
    });
    return {
      display: estimate.approximate
        ? strings('perps.order.approximate_price', { price: formatted })
        : formatted,
      rawPrice: String(estimate.price),
      contentKey: 'cross_liquidation_price',
    };
  }
  if (hasValidAmount && estimate.status === 'none') {
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
  /** Price string for TP/SL. Empty when a cross order has no price. */
  rawPrice: string;
  /** Numeric price for the distance label, when the row shows a price. */
  distancePrice?: number;
}

/**
 * Picks the order-row liquidation value. Cross uses the pre-trade estimate.
 * Isolated keeps the controller price.
 */
export const selectOrderLiquidationRow = ({
  isCrossOrder,
  crossEstimate,
  hasValidAmount,
  isolatedPrice,
}: {
  isCrossOrder: boolean;
  crossEstimate: CrossLiquidationEstimate;
  hasValidAmount: boolean;
  isolatedPrice: string;
}): OrderLiquidationRow => {
  if (isCrossOrder) {
    const presented = presentCrossLiquidationEstimate({
      estimate: crossEstimate,
      hasValidAmount,
    });
    return {
      display: presented.display,
      contentKey: presented.contentKey,
      rawPrice: presented.rawPrice,
      distancePrice:
        hasValidAmount && crossEstimate.status === 'price'
          ? crossEstimate.price
          : undefined,
    };
  }
  const parsedIsolatedPrice = Number.parseFloat(isolatedPrice);
  const hasIsolatedPrice =
    hasValidAmount &&
    Number.isFinite(parsedIsolatedPrice) &&
    parsedIsolatedPrice > 0;
  return {
    display: hasIsolatedPrice
      ? formatPerpsFiat(isolatedPrice, { ranges: PRICE_RANGES_UNIVERSAL })
      : PERPS_CONSTANTS.FallbackDataDisplay,
    contentKey: 'liquidation_price',
    rawPrice: isolatedPrice,
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
