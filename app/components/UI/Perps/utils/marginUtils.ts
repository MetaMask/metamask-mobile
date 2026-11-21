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
