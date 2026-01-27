/**
 * Margin adjustment calculation utilities
 * Provides risk assessment and margin calculation functions for position management
 */
import { MARGIN_ADJUSTMENT_CONFIG } from '../constants/perpsConfig';

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

export interface CalculateNewLiquidationPriceParams {
  newMargin: number;
  positionSize: number;
  entryPrice: number;
  isLong: boolean;
  currentLiquidationPrice: number;
}

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
 * Calculate new liquidation price after margin adjustment
 * Estimates where the liquidation price will move based on margin change
 * Note: This is a simplified calculation; actual liquidation price may vary based on protocol
 * @param params - New margin amount, position size, entry price, direction, and current liquidation price
 * @returns Estimated new liquidation price
 */
export function calculateNewLiquidationPrice(
  params: CalculateNewLiquidationPriceParams,
): number {
  const {
    newMargin,
    positionSize,
    entryPrice,
    isLong,
    currentLiquidationPrice,
  } = params;

  // Validate inputs
  if (
    isNaN(newMargin) ||
    isNaN(positionSize) ||
    isNaN(entryPrice) ||
    newMargin <= 0 ||
    positionSize <= 0 ||
    entryPrice <= 0
  ) {
    return currentLiquidationPrice; // Return current if invalid inputs
  }

  // Calculate margin per unit of position
  const marginPerUnit = newMargin / positionSize;

  // For long positions: liquidation price is below entry price
  // liquidationPrice = entryPrice - marginPerUnit
  // For short positions: liquidation price is above entry price
  // liquidationPrice = entryPrice + marginPerUnit
  if (isLong) {
    return Math.max(0, entryPrice - marginPerUnit);
  }
  return entryPrice + marginPerUnit;
}
