/**
 * At or above this distance the position is effectively liquidation-proof at
 * the displayed precision, so it reads as a round 100% instead of 99.9x%.
 */
export const LIQUIDATION_DISTANCE_FULL_THRESHOLD = 99.9;

/**
 * Distance between the current price and a liquidation price, as a percentage
 * of the current price.
 *
 * @param currentPrice - Current mark price.
 * @param liquidationPrice - Liquidation price to measure against.
 * @returns The distance as a percentage, or 0 when either price is unusable.
 */
export const calculateLiquidationDistance = (
  currentPrice: number,
  liquidationPrice: number,
): number => {
  if (!currentPrice || !liquidationPrice) {
    return 0;
  }
  return (Math.abs(currentPrice - liquidationPrice) / currentPrice) * 100;
};

/**
 * Rounds a near-total liquidation distance up to 100%.
 *
 * @param distance - Distance percentage to clamp.
 * @returns 100 when at or above {@link LIQUIDATION_DISTANCE_FULL_THRESHOLD}, otherwise the input.
 */
export const clampLiquidationDistance = (distance: number): number =>
  distance >= LIQUIDATION_DISTANCE_FULL_THRESHOLD ? 100 : distance;
