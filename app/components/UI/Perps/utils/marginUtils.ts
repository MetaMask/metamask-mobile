/**
 * Margin adjustment calculation utilities
 * Provides risk assessment and margin calculation functions for position management
 */
import { MARGIN_ADJUSTMENT_CONFIG } from '@metamask/perps-controller';

export type RiskLevel = 'safe' | 'warning' | 'danger';

export interface MarginRiskAssessment {
  riskLevel: RiskLevel;
  priceDiff: number;
  riskRatio: number;
}

export interface AssessMarginRemovalRiskParams {
  newLiquidationPrice: number;
  currentPrice: number;
  isLong: boolean;
}

export interface CalculateMaxRemovableMarginParams {
  currentMargin: number;
  positionSize: number;
  entryPrice: number;
  currentPrice: number;
  /** The actual leverage of the position (not the asset's max leverage) */
  positionLeverage: number;
  /** Optional pre-calculated notional value (e.g., from position.positionValue) for immediate display before live prices load */
  notionalValue?: number;
}

export interface EstimateLiquidationPriceParams {
  isLong: boolean;
  currentMargin: number;
  newMargin: number;
  positionSize: number;
  currentLiquidationPrice: number;
  maxLeverage: number;
  /** Resulting size after a resize; defaults to `positionSize`. */
  newPositionSize?: number;
  currentEntryPrice?: number;
  newEntryPrice?: number;
}

export interface EstimateIsolatedLiquidationPriceFromEntryParams {
  isLong: boolean;
  entryPrice: number;
  margin: number;
  positionSize: number;
  maxLeverage: number;
}

const getIsolatedLiquidationAdjustment = (
  isLong: boolean,
  maxLeverage: number,
): { directionMultiplier: number; adjustmentFactor: number } => {
  const side = isLong ? 1 : -1;
  const maintenanceMarginRate =
    Number.isFinite(maxLeverage) && maxLeverage > 0 ? 1 / (2 * maxLeverage) : 0;
  const denominator = 1 - maintenanceMarginRate * side;
  return {
    directionMultiplier: isLong ? -1 : 1,
    adjustmentFactor: Math.abs(denominator) < 0.0001 ? 1 : denominator,
  };
};

/**
 * Assess liquidation risk after margin removal
 * Compares new liquidation price against current market price to determine risk level
 * @param params - New liquidation price, current market price, and position direction
 * @returns Risk assessment with level (safe/warning/danger), price difference, and risk ratio
 */
export function assessMarginRemovalRisk(
  params: AssessMarginRemovalRiskParams,
): MarginRiskAssessment {
  const { newLiquidationPrice, currentPrice, isLong } = params;

  if (
    !newLiquidationPrice ||
    !currentPrice ||
    isNaN(newLiquidationPrice) ||
    isNaN(currentPrice)
  ) {
    return { riskLevel: 'safe', priceDiff: 0, riskRatio: 0 };
  }

  // Calculate price difference based on position direction
  // For long: current price should be above liquidation price
  // For short: liquidation price should be above current price
  const priceDiff = isLong
    ? currentPrice - newLiquidationPrice
    : newLiquidationPrice - currentPrice;

  // Risk ratio: how far away is price from liquidation, relative to liquidation price
  // Higher ratio = safer (price is far from liquidation)
  // Lower ratio = riskier (price is close to liquidation)
  const riskRatio = priceDiff / newLiquidationPrice;

  let riskLevel: RiskLevel;
  if (riskRatio < MARGIN_ADJUSTMENT_CONFIG.LiquidationRiskThreshold - 1) {
    riskLevel = 'danger'; // <20% buffer - critical risk
  } else if (
    riskRatio <
    MARGIN_ADJUSTMENT_CONFIG.LiquidationWarningThreshold - 1
  ) {
    riskLevel = 'warning'; // <50% buffer - moderate risk
  } else {
    riskLevel = 'safe'; // >=50% buffer - safe
  }

  return { riskLevel, priceDiff, riskRatio };
}

/**
 * Calculate maximum margin that can be safely removed from a position
 *
 * HyperLiquid enforces: transfer_margin_required = max(initial_margin_required, 0.1 * total_position_value)
 * See: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/margin-and-pnl
 * See also: docs/perps/hyperliquid/margining.md
 *
 * Key insight from Hyperliquid support (Xulian, Dec 6, 2025):
 * "you need to account for initial margin for withdrawal, maintenance is what is needed to not be liquidated"
 *
 * The initial margin is calculated using the POSITION'S leverage (not the asset's max leverage).
 * For example, a position opened at 10x leverage requires 10% initial margin,
 * not 2% (which would be for 50x max leverage).
 *
 * @param params - Current margin, position size, prices, and position leverage
 * @returns Maximum removable margin amount in USD
 */
export function calculateMaxRemovableMargin(
  params: CalculateMaxRemovableMarginParams,
): number {
  const {
    currentMargin,
    positionSize,
    currentPrice,
    positionLeverage,
    notionalValue: providedNotionalValue,
  } = params;

  // Validate inputs
  if (
    isNaN(currentMargin) ||
    isNaN(positionLeverage) ||
    currentMargin <= 0 ||
    positionLeverage <= 0
  ) {
    return 0;
  }

  // Use provided notional value (e.g., from position.positionValue) or calculate from price
  // This allows immediate display before live prices load
  let notionalValue = providedNotionalValue;
  if (
    notionalValue === undefined ||
    isNaN(notionalValue) ||
    notionalValue <= 0
  ) {
    // Fall back to calculating from price if not provided or invalid
    if (
      isNaN(positionSize) ||
      isNaN(currentPrice) ||
      positionSize <= 0 ||
      currentPrice <= 0
    ) {
      return 0;
    }
    notionalValue = positionSize * currentPrice;
  }

  // Hyperliquid's transfer margin requirement formula:
  // transfer_margin_required = max(initial_margin_required, 0.1 * total_position_value)
  //
  // IMPORTANT: Use the position's actual leverage, not the asset's max leverage
  // A position at 10x leverage needs 10% initial margin ($100 for $1000 notional)
  // NOT the 2% that 50x max leverage would imply
  const initialMarginRequired = notionalValue / positionLeverage;
  const tenPercentMargin =
    notionalValue * MARGIN_ADJUSTMENT_CONFIG.MarginRemovalSafetyBuffer;

  // Transfer margin required is the MAX of these two constraints
  const transferMarginRequired = Math.max(
    initialMarginRequired,
    tenPercentMargin,
  );

  // Note: Unrealized PnL is NOT counted as part of "remaining margin" for withdrawals
  // Per Hyperliquid docs, unrealized PnL helps prevent liquidation but doesn't
  // increase your available withdrawal limit for margin transfers
  // Maximum removable = current margin - required (must be non-negative)
  return Math.max(0, currentMargin - transferMarginRequired);
}

/**
 * Isolated liquidation from entry, margin, and size (closed form).
 *
 * liq = (entry + direction × margin/size) / adjustmentFactor
 * where direction is -1 for long and +1 for short, and
 * adjustmentFactor = 1 - (maintenanceMarginRate × side).
 *
 * Use this for a brand-new isolated position (including a flip leftover).
 * Same-side resizes should use {@link estimateLiquidationPrice} so the live
 * liquidation (funding, extra isolated margin) stays the anchor.
 */
export function estimateIsolatedLiquidationPriceFromEntry(
  params: EstimateIsolatedLiquidationPriceFromEntryParams,
): number {
  const { isLong, entryPrice, margin, positionSize, maxLeverage } = params;

  if (
    !Number.isFinite(entryPrice) ||
    entryPrice <= 0 ||
    !Number.isFinite(margin) ||
    margin <= 0 ||
    !Number.isFinite(positionSize) ||
    positionSize <= 0
  ) {
    return 0;
  }

  const { directionMultiplier, adjustmentFactor } =
    getIsolatedLiquidationAdjustment(isLong, maxLeverage);

  return Math.max(
    0,
    (entryPrice + directionMultiplier * (margin / positionSize)) /
      adjustmentFactor,
  );
}

/**
 * Estimate liquidation price after a same-side isolated margin/size/entry change.
 *
 * Isolated closed form: liq = (entry + direction × margin/size) / adjustmentFactor
 * Differencing that and anchoring to the live liquidation:
 *
 * newLiq = currentLiq + (entryDelta + direction × Δ(margin/size)) / adjustmentFactor
 *
 * - direction: -1 for long, +1 for short
 * - adjustmentFactor: 1 - (maintenanceMarginRate × side)
 * - maintenanceMarginRate: 1/(2 × maxLeverage)
 *
 * When size and entry are omitted, this reduces to the original margin-only
 * formula used by adjust-margin.
 *
 * See: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/margin-and-pnl
 */
export function estimateLiquidationPrice(
  params: EstimateLiquidationPriceParams,
): number {
  const {
    isLong,
    currentMargin,
    newMargin,
    positionSize,
    currentLiquidationPrice,
    maxLeverage,
    newPositionSize = positionSize,
    currentEntryPrice,
    newEntryPrice,
  } = params;

  if (
    !Number.isFinite(newMargin) ||
    newMargin <= 0 ||
    !Number.isFinite(positionSize) ||
    positionSize <= 0 ||
    !Number.isFinite(newPositionSize) ||
    newPositionSize <= 0 ||
    !Number.isFinite(currentLiquidationPrice) ||
    currentLiquidationPrice <= 0 ||
    !Number.isFinite(currentMargin) ||
    currentMargin <= 0
  ) {
    return currentLiquidationPrice;
  }

  const currentMarginPerSize = currentMargin / positionSize;
  const newMarginPerSize = newMargin / newPositionSize;
  if (
    !Number.isFinite(currentMarginPerSize) ||
    !Number.isFinite(newMarginPerSize)
  ) {
    return currentLiquidationPrice;
  }

  const hasEntryChange =
    typeof currentEntryPrice === 'number' &&
    currentEntryPrice > 0 &&
    typeof newEntryPrice === 'number' &&
    newEntryPrice > 0;
  const entryDelta = hasEntryChange ? newEntryPrice - currentEntryPrice : 0;

  const { directionMultiplier, adjustmentFactor } =
    getIsolatedLiquidationAdjustment(isLong, maxLeverage);
  const marginPerSizeDelta = newMarginPerSize - currentMarginPerSize;

  return Math.max(
    0,
    currentLiquidationPrice +
      (entryDelta + directionMultiplier * marginPerSizeDelta) /
        adjustmentFactor,
  );
}
