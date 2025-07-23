/**
 * Utility functions for validating Take Profit and Stop Loss prices based on position direction
 *
 * For Long positions:
 * - Take Profit must be above current price (profit when price goes up)
 * - Stop Loss must be below current price (loss when price goes down)
 *
 * For Short positions:
 * - Take Profit must be below current price (profit when price goes down)
 * - Stop Loss must be above current price (loss when price goes up)
 */

interface ValidationParams {
  currentPrice: number;
  direction?: 'long' | 'short';
}

/**
 * Validates if a take profit price is valid for the given direction
 */
export const isValidTakeProfitPrice = (
  price: string,
  { currentPrice, direction }: ValidationParams,
): boolean => {
  if (!currentPrice || !direction || !price) return true;

  const tpPrice = parseFloat(price.replace(/[$,]/g, ''));
  if (isNaN(tpPrice)) return true;

  const isLong = direction === 'long';
  return isLong ? tpPrice > currentPrice : tpPrice < currentPrice;
};

/**
 * Validates if a stop loss price is valid for the given direction
 */
export const isValidStopLossPrice = (
  price: string,
  { currentPrice, direction }: ValidationParams,
): boolean => {
  if (!currentPrice || !direction || !price) return true;

  const slPrice = parseFloat(price.replace(/[$,]/g, ''));
  if (isNaN(slPrice)) return true;

  const isLong = direction === 'long';
  return isLong ? slPrice < currentPrice : slPrice > currentPrice;
};

/**
 * Validates both take profit and stop loss prices
 */
export const validateTPSLPrices = (
  takeProfitPrice: string | undefined,
  stopLossPrice: string | undefined,
  params: ValidationParams,
): boolean => {
  if (!params.currentPrice || !params.direction) return true;

  let isValid = true;

  if (takeProfitPrice) {
    isValid = isValid && isValidTakeProfitPrice(takeProfitPrice, params);
  }

  if (stopLossPrice) {
    isValid = isValid && isValidStopLossPrice(stopLossPrice, params);
  }

  return isValid;
};

/**
 * Gets the direction text for take profit error message
 */
export const getTakeProfitErrorDirection = (
  direction?: 'long' | 'short',
): string => {
  if (!direction) return '';
  return direction === 'long' ? 'above' : 'below';
};

/**
 * Gets the direction text for stop loss error message
 */
export const getStopLossErrorDirection = (
  direction?: 'long' | 'short',
): string => {
  if (!direction) return '';
  return direction === 'long' ? 'below' : 'above';
};

/**
 * Calculates price based on percentage change from current price
 * @param percentage The percentage change
 * @param isProfit Whether this is for take profit (true) or stop loss (false)
 * @param params Current price and direction
 * @returns The calculated price as a string
 */
export const calculatePriceForPercentage = (
  percentage: number,
  isProfit: boolean,
  { currentPrice, direction }: ValidationParams,
): string => {
  if (!currentPrice) return '';

  // For long positions: profit = price up, loss = price down
  // For short positions: profit = price down, loss = price up
  const isLong = direction === 'long';
  const profitMultiplier = isLong ? 1 + percentage / 100 : 1 - percentage / 100;
  const lossMultiplier = isLong ? 1 - percentage / 100 : 1 + percentage / 100;
  const multiplier = isProfit ? profitMultiplier : lossMultiplier;

  const calculatedPrice = currentPrice * multiplier;
  // Return raw number string without formatting
  return calculatedPrice.toFixed(2);
};

/**
 * Calculates percentage change based on target price
 * @param price The target price (as string, may include formatting)
 * @param isProfit Whether this is for take profit (true) or stop loss (false)
 * @param params Current price and direction
 * @returns The percentage as a string
 */
export const calculatePercentageForPrice = (
  price: string,
  isProfit: boolean,
  { currentPrice, direction }: ValidationParams,
): string => {
  if (!currentPrice || !price) return '';

  const priceNum = parseFloat(price.replace(/[$,]/g, ''));
  if (isNaN(priceNum)) return '';

  const isLong = direction === 'long';
  const priceDiff = priceNum - currentPrice;
  const percentage = Math.abs((priceDiff / currentPrice) * 100);

  // Validate direction consistency
  if (isProfit) {
    // For profit: long needs higher price, short needs lower price
    const isValidDirection = isLong ? priceDiff > 0 : priceDiff < 0;
    return isValidDirection
      ? percentage.toFixed(2)
      : `-${percentage.toFixed(2)}`;
  }
  // For loss: long needs lower price, short needs higher price
  const isValidDirection = isLong ? priceDiff < 0 : priceDiff > 0;
  return isValidDirection ? percentage.toFixed(2) : `-${percentage.toFixed(2)}`;
};
