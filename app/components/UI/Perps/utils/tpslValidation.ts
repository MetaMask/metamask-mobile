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

import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';

interface ValidationParams {
  currentPrice: number;
  direction?: 'long' | 'short';
  leverage?: number;
  entryPrice?: number; // For existing positions
  liquidationPrice?: string;
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
 * Validates if a stop loss price is beyond the liquidation price
 * For long positions: stop loss must be ABOVE liquidation price
 * For short positions: stop loss must be BELOW liquidation price
 *
 */
export const isStopLossBeyondLiquidationPrice = (
  price?: string,
  liquidationPrice?: string,
  direction?: 'long' | 'short',
) => {
  if (!liquidationPrice || !direction || !price) return true;

  // Clean up string values if necessary ($ or ,)
  const slPriceNum = parseFloat(price.replace(/[$,]/g, ''));
  const liquidationPriceNum = parseFloat(liquidationPrice.replace(/[$,]/g, ''));

  if (isNaN(slPriceNum) || isNaN(liquidationPriceNum)) return true;

  const isLong = direction === 'long';

  const fixedSlPrice = slPriceNum.toFixed(2);
  const fixedLiquidationPrice = liquidationPriceNum.toFixed(2);

  return isLong
    ? fixedSlPrice > fixedLiquidationPrice
    : fixedSlPrice < fixedLiquidationPrice;
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

  if (params.liquidationPrice) {
    isValid =
      isValid &&
      isStopLossBeyondLiquidationPrice(
        stopLossPrice,
        params.liquidationPrice,
        params.direction,
      );
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
 * Gets the direction text for stop loss liquidation error message
 */
export const getStopLossLiquidationErrorDirection = (
  direction?: 'long' | 'short',
): string => {
  if (!direction) return '';
  return direction === 'long' ? 'above' : 'below';
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
 * Calculates the trigger price for a given RoE percentage
 * RoE% = (PnL / marginUsed) * 100
 * PnL = (exitPrice - entryPrice) * size (for long)
 * PnL = (entryPrice - exitPrice) * size (for short)
 *
 * @param roePercentage The target RoE percentage (e.g., 10 for +10%, -5 for -5%)
 * @param isProfit Whether this is for take profit (true) or stop loss (false)
 * @param params Entry price, direction, and leverage
 * @returns The calculated trigger price as a string
 */
export const calculatePriceForRoE = (
  roePercentage: number,
  isProfit: boolean,
  { currentPrice, direction, leverage = 1, entryPrice }: ValidationParams,
): string => {
  // Use entry price if available (for existing positions), otherwise use current price
  const basePrice = entryPrice || currentPrice;
  if (!basePrice || basePrice <= 0) {
    return '';
  }

  const isLong = direction === 'long';

  // Prevent stop loss from exceeding maximum possible loss
  // Maximum theoretical loss is 100% * leverage (before liquidation)
  // But we'll cap it at 99% to avoid negative prices
  if (!isProfit && Math.abs(roePercentage) >= leverage * 99) {
    // Cap at 99% of max loss to prevent negative prices
    roePercentage = -(leverage * 99);
  }

  DevLogger.log('[TPSL Debug] calculatePriceForRoE inputs:', {
    roePercentage,
    isProfit,
    basePrice,
    currentPrice,
    entryPrice,
    direction,
    leverage,
    isLong,
  });

  // RoE% = (PnL / marginUsed) * 100
  // PnL = RoE% * marginUsed / 100
  // marginUsed = positionValue / leverage
  // positionValue = entryPrice * size
  // Therefore: PnL = RoE% * (entryPrice * size) / (leverage * 100)
  // Simplifying: PnL/positionValue = RoE% / (leverage * 100)
  // priceChange/entryPrice = RoE% / (leverage * 100)
  // priceChange = entryPrice * RoE% / (leverage * 100)

  const priceChangeRatio = roePercentage / (leverage * 100);

  let calculatedPrice: number;
  if (isProfit) {
    // For take profit
    if (isLong) {
      // Long TP: price needs to go up
      calculatedPrice = basePrice * (1 + priceChangeRatio);
    } else {
      // Short TP: price needs to go down
      calculatedPrice = basePrice * (1 - priceChangeRatio);
    }
  } else if (isLong) {
    // For stop loss (negative RoE)
    // Long SL: price needs to go down
    calculatedPrice = basePrice * (1 - Math.abs(priceChangeRatio));
    // Ensure price never goes negative
    if (calculatedPrice <= 0) {
      calculatedPrice = basePrice * 0.01; // Minimum 1% of base price
    }
  } else {
    // Short SL: price needs to go up
    calculatedPrice = basePrice * (1 + Math.abs(priceChangeRatio));
  }

  // Determine appropriate precision based on the price magnitude
  // For very small prices (like PEPE), use more decimal places
  let precision = 2;
  if (calculatedPrice < 0.01) {
    precision = 8; // For prices less than $0.01, use 8 decimal places
  } else if (calculatedPrice < 1) {
    precision = 6; // For prices less than $1, use 6 decimal places
  } else if (calculatedPrice < 100) {
    precision = 4; // For prices less than $100, use 4 decimal places
  }

  let finalResult = calculatedPrice.toFixed(precision);

  // Apply clean formatting - remove unnecessary trailing zeros and decimal point
  const numValue = parseFloat(finalResult);
  if (numValue % 1 === 0) {
    // If it's a whole number, show without decimals
    finalResult = numValue.toString();
  } else {
    // Otherwise, use the formatted result but remove trailing zeros
    finalResult = parseFloat(finalResult).toString();
  }

  DevLogger.log('[TPSL Debug] calculatePriceForRoE result:', {
    priceChangeRatio,
    calculatedPrice,
    precision,
    beforeCleanup: calculatedPrice.toFixed(precision),
    finalResult,
  });

  return finalResult;
};

/**
 * Calculates the RoE percentage for a given trigger price
 *
 * @param price The trigger price (as string, may include formatting)
 * @param isProfit Whether this is for take profit (true) or stop loss (false)
 * @param params Current/entry price, direction, and leverage
 * @returns The RoE percentage as a string
 */
export const calculateRoEForPrice = (
  price: string,
  isProfit: boolean,
  { currentPrice, direction, leverage = 1, entryPrice }: ValidationParams,
): string => {
  // Use entry price if available (for existing positions), otherwise use current price
  const basePrice = entryPrice || currentPrice;
  if (!basePrice || basePrice <= 0 || !price) {
    return '';
  }

  const priceNum = parseFloat(price.replace(/[$,]/g, ''));
  if (isNaN(priceNum) || priceNum <= 0) return '';

  const isLong = direction === 'long';

  // Calculate price change ratio
  const priceChangeRatio = (priceNum - basePrice) / basePrice;

  // RoE% = priceChangeRatio * leverage * 100
  let roePercentage = Math.abs(priceChangeRatio * leverage * 100);

  // Determine sign based on direction and whether it's profit or loss
  if (isProfit) {
    // For take profit, check if price moved in the right direction
    const isValidProfit = isLong ? priceNum > basePrice : priceNum < basePrice;
    if (!isValidProfit) roePercentage = -roePercentage;
  } else {
    // For stop loss, check if price moved in the wrong direction (loss)
    const isValidLoss = isLong ? priceNum < basePrice : priceNum > basePrice;
    if (!isValidLoss) roePercentage = -roePercentage;
  }

  if (roePercentage < 0) {
    roePercentage = 0;
  }

  return roePercentage.toFixed(2);
};

/**
 * Safely parse RoE percentage to avoid NaN display in UI
 * @param roePercent - RoE percentage string from calculateRoEForPrice
 * @returns Formatted percentage string or empty string for invalid input
 */
export const safeParseRoEPercentage = (roePercent: string): string => {
  if (!roePercent || roePercent.trim() === '') {
    return ''; // Return empty string for invalid input
  }

  const parsed = parseFloat(roePercent);
  if (isNaN(parsed)) {
    return ''; // Return empty string for NaN
  }

  const absValue = Math.abs(parsed);
  // Show clean integers when possible (10% instead of 10.00%)
  return absValue % 1 === 0 ? absValue.toFixed(0) : absValue.toFixed(2);
};

/**
 * Format RoE percentage for display based on focus state
 * @param value - The raw percentage value as string
 * @param isFocused - Whether the input is currently focused
 * @returns Formatted percentage string for display
 */
export const formatRoEPercentageDisplay = (
  value: string,
  isFocused: boolean,
): string => {
  if (!value || value.trim() === '') {
    return '';
  }

  // When focused, preserve the exact user input including decimal points
  if (isFocused) {
    // Only allow valid numeric patterns
    if (value === '.' || /^\d*\.?\d*$/.test(value)) {
      return value;
    }
  }

  const parsed = parseFloat(value);
  if (isNaN(parsed)) {
    return '';
  }

  const absValue = Math.abs(parsed);

  if (isFocused) {
    // This branch shouldn't be reached now, but keep as fallback
    return absValue.toString();
  }

  // When not focused, show clean display format
  return absValue % 1 === 0 ? absValue.toFixed(0) : absValue.toFixed(2);
};

/**
 * Calculate the maximum allowed stop loss percentage based on leverage
 * @param leverage The position leverage
 * @returns The maximum stop loss percentage (as a positive number)
 */
export const getMaxStopLossPercentage = (leverage: number): number =>
  // Maximum theoretical loss is 100% * leverage (before liquidation)
  // But we cap it at 99% to avoid negative prices and leave room for fees
  Math.min(leverage * 99, 999);

/**
 * Validate if a stop loss percentage is within allowed bounds
 * @param percentage The stop loss percentage (as a positive number)
 * @param leverage The position leverage
 * @returns True if valid, false otherwise
 */
export const isValidStopLossPercentage = (
  percentage: number,
  leverage: number,
): boolean => {
  if (percentage <= 0) return false;
  const maxAllowed = getMaxStopLossPercentage(leverage);
  return percentage <= maxAllowed;
};
