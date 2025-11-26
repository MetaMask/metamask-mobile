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
 *
 * HyperLiquid enforces: transfer_margin_required = max(initial_margin_required, 0.1 * total_position_value)
 * See: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/margin-and-pnl
 *
 * For high leverage assets (e.g., 50x where initial margin = 2%),
 * the 10% requirement is the binding constraint.
 *
 * IMPORTANT: We apply an additional 50% safety buffer on top of the minimum required
 * because HyperLiquid's actual margin requirements can vary based on market conditions,
 * unrealized PnL, and other factors not captured in this simplified calculation.
 *
 * @param params - Current margin, position size, entry price, current price, and max leverage limit
 * @returns Maximum removable margin amount in USD
 */
export function calculateMaxRemovableMargin(
  params: CalculateMaxRemovableMarginParams,
): number {
  const { currentMargin, positionSize, entryPrice, currentPrice, maxLeverage } =
    params;

  // Validate inputs
  if (
    isNaN(currentMargin) ||
    isNaN(positionSize) ||
    isNaN(entryPrice) ||
    isNaN(currentPrice) ||
    isNaN(maxLeverage) ||
    currentMargin <= 0 ||
    positionSize <= 0 ||
    entryPrice <= 0 ||
    currentPrice <= 0 ||
    maxLeverage <= 0
  ) {
    return 0;
  }

  // Use the higher price to be conservative (HyperLiquid uses current mark price)
  const price = Math.max(entryPrice, currentPrice);

  // Calculate notional value
  const notionalValue = positionSize * price;

  // HyperLiquid's transfer margin requirement:
  // transfer_margin_required = max(initial_margin_required, 0.1 * total_position_value)
  const initialMarginRequired = notionalValue / maxLeverage;
  const tenPercentMargin =
    notionalValue * MARGIN_ADJUSTMENT_CONFIG.MARGIN_REMOVAL_SAFETY_BUFFER;

  // Minimum margin is the MAX of these two constraints
  const baseMinimumRequired = Math.max(initialMarginRequired, tenPercentMargin);

  // Apply 3x safety buffer because HyperLiquid's actual requirements are significantly higher
  // than the documented formula due to:
  // - Maintenance margin requirements
  // - Unrealized PnL impact
  // - Market volatility adjustments
  // - Funding rate considerations
  // Testing showed 1.5x was insufficient - $2 removal rejected when calc showed $2.95 available
  const minimumMarginRequired = baseMinimumRequired * 3;

  // Maximum removable = current - minimum (must be non-negative)
  return Math.max(0, currentMargin - minimumMarginRequired);
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
