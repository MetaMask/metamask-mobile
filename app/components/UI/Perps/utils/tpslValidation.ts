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

/**
 * Checks if take profit or stop loss values have changed from their initial values
 * @param currentTakeProfitPrice Current take profit price value
 * @param currentStopLossPrice Current stop loss price value
 * @param initialTakeProfitPrice Initial take profit price value
 * @param initialStopLossPrice Initial stop loss price value
 * @returns true if either value has changed, false if both are unchanged
 */
export const hasTPSLValuesChanged = (
  currentTakeProfitPrice: string | undefined,
  currentStopLossPrice: string | undefined,
  initialTakeProfitPrice: string | undefined,
  initialStopLossPrice: string | undefined,
): boolean => {
  // Normalize values - remove formatting, convert to numbers for comparison
  const normalizeValue = (value: string | undefined): number | undefined => {
    if (!value || value.trim() === '') return undefined;
    const cleaned = value.replace(/[$,]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? undefined : parsed;
  };

  const normalizedCurrentTP = normalizeValue(currentTakeProfitPrice);
  const normalizedCurrentSL = normalizeValue(currentStopLossPrice);
  const normalizedInitialTP = normalizeValue(initialTakeProfitPrice);
  const normalizedInitialSL = normalizeValue(initialStopLossPrice);

  // Check if take profit has changed
  const tpChanged = normalizedCurrentTP !== normalizedInitialTP;

  // Check if stop loss has changed
  const slChanged = normalizedCurrentSL !== normalizedInitialSL;

  return tpChanged || slChanged;
};

/**
 * Calculates RoE percentage for a given target price
 * RoE = (P&L / Margin) * 100
 * @param targetPrice The target price (TP or SL)
 * @param entryPrice The position entry price
 * @param margin The margin used for the position
 * @param size The position size
 * @param direction The position direction
 */
export const calculateRoEForPrice = (
  targetPrice: string,
  entryPrice: number,
  margin: number,
  size: number,
  direction: 'long' | 'short',
): string => {
  if (!targetPrice || !entryPrice || !margin) return '';

  const target = parseFloat(targetPrice.replace(/[$,]/g, ''));
  if (isNaN(target)) return '';

  // Calculate P&L at target price
  const priceDiff = target - entryPrice;
  const pnl = direction === 'long'
    ? priceDiff * Math.abs(size)
    : -priceDiff * Math.abs(size);

  // Calculate RoE
  const roe = (pnl / margin) * 100;
  return roe.toFixed(2);
};

/**
 * Calculates target price for a given RoE percentage
 * @param roePercentage The desired RoE percentage
 * @param entryPrice The position entry price
 * @param margin The margin used for the position
 * @param size The position size
 * @param direction The position direction
 */
export const calculatePriceForRoE = (
  roePercentage: number,
  entryPrice: number,
  margin: number,
  size: number,
  direction: 'long' | 'short',
): string => {
  if (!entryPrice || !margin || !size) return '';

  // Calculate required P&L for target RoE
  const targetPnl = (roePercentage / 100) * margin;

  // Calculate price difference needed
  const priceDiff = direction === 'long'
    ? targetPnl / Math.abs(size)
    : -targetPnl / Math.abs(size);

  const targetPrice = entryPrice + priceDiff;
  return targetPrice.toFixed(2);
};
