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
  maxLeverage: number;
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
  if (riskRatio < MARGIN_ADJUSTMENT_CONFIG.LIQUIDATION_RISK_THRESHOLD - 1) {
    riskLevel = 'danger'; // <20% buffer - critical risk
  } else if (
    riskRatio <
    MARGIN_ADJUSTMENT_CONFIG.LIQUIDATION_WARNING_THRESHOLD - 1
  ) {
    riskLevel = 'warning'; // <50% buffer - moderate risk
  } else {
    riskLevel = 'safe'; // >=50% buffer - safe
  }

  return { riskLevel, priceDiff, riskRatio };
}

/**
 * Calculate maximum margin that can be safely removed from a position
 * Ensures position maintains minimum margin required for max leverage
 * @param params - Current margin, position size, entry price, and max leverage limit
 * @returns Maximum removable margin amount in USD
 */
export function calculateMaxRemovableMargin(
  params: CalculateMaxRemovableMarginParams,
): number {
  const { currentMargin, positionSize, entryPrice, maxLeverage } = params;

  // Validate inputs
  if (
    isNaN(currentMargin) ||
    isNaN(positionSize) ||
    isNaN(entryPrice) ||
    isNaN(maxLeverage) ||
    currentMargin <= 0 ||
    positionSize <= 0 ||
    entryPrice <= 0 ||
    maxLeverage <= 0
  ) {
    return 0;
  }

  // Calculate position value (notional value)
  const positionValue = positionSize * entryPrice;

  // Calculate minimum margin required to maintain max leverage
  // Formula: minimumMargin = positionValue / maxLeverage
  const minimumMargin = positionValue / maxLeverage;

  // Maximum removable = current - minimum (must be non-negative)
  return Math.max(0, currentMargin - minimumMargin);
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
