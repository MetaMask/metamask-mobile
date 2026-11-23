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

import {
  isPositiveTriggerPrice,
  isStopLossSafeFromLiquidation,
  isValidStopLossPrice,
  isValidTakeProfitPrice,
  type OrderType,
} from '@metamask/perps-controller';
// Re-export significant figures utilities from controller for backwards compatibility
export {
  countSignificantFigures,
  hasExceededSignificantFigures,
  roundToSignificantFigures,
} from '@metamask/perps-controller';

export interface PerpsOrderTpSlWarningsInput {
  orderType: OrderType;
  limitPrice?: string;
  direction: 'long' | 'short';
  takeProfitPrice?: string;
  stopLossPrice?: string;
  /** Current liquidation price for the prospective order. */
  liquidationPrice: string;
  /** Mid/market price used as the validation reference for market orders. */
  marketPrice: number;
}

export interface PerpsOrderTpSlWarnings {
  /** Stop loss sits at/beyond the liquidation price. */
  doesStopLossRiskLiquidation: boolean;
  /** Take profit is on the wrong side of the reference price. */
  isTakeProfitPriceInvalid: boolean;
  /** Stop loss is on the wrong side of the reference price. */
  isStopLossPriceInvalid: boolean;
  /** Which price the warnings validated against ('entry' for priced limit, else 'current'). */
  tpslPriceType: 'entry' | 'current';
}

/**
 * Pure derivation of the order-form TP/SL warning flags shared by the lite
 * (`PerpsOrderView`) and Pro (`usePerpsProOrderForm`) order forms. For priced
 * limit orders the limit price is the validation reference; otherwise the
 * market price is used. Mirrors the lite form's original inline logic exactly.
 *
 * @param input - TP/SL warning inputs.
 * @returns The three warning flags plus the reference price type.
 */
export const getPerpsOrderTpSlWarnings = ({
  orderType,
  limitPrice,
  direction,
  takeProfitPrice,
  stopLossPrice,
  liquidationPrice,
  marketPrice,
}: PerpsOrderTpSlWarningsInput): PerpsOrderTpSlWarnings => {
  const doesStopLossRiskLiquidation = Boolean(
    stopLossPrice &&
      !isStopLossSafeFromLiquidation(
        stopLossPrice,
        liquidationPrice,
        direction,
      ),
  );

  const isLimitWithPrice = orderType === 'limit' && Boolean(limitPrice);
  const validationReferencePrice = isLimitWithPrice
    ? Number.parseFloat(String(limitPrice))
    : marketPrice;
  const tpslPriceType = isLimitWithPrice ? 'entry' : 'current';

  const isTakeProfitPriceInvalid = Boolean(
    takeProfitPrice?.trim() &&
      (!isPositiveTriggerPrice(takeProfitPrice) ||
        (validationReferencePrice > 0 &&
          !isValidTakeProfitPrice(takeProfitPrice, {
            currentPrice: validationReferencePrice,
            direction,
          }))),
  );

  const isStopLossPriceInvalid = Boolean(
    stopLossPrice?.trim() &&
      (!isPositiveTriggerPrice(stopLossPrice) ||
        (validationReferencePrice > 0 &&
          !isValidStopLossPrice(stopLossPrice, {
            currentPrice: validationReferencePrice,
            direction,
          }))),
  );

  return {
    doesStopLossRiskLiquidation,
    isTakeProfitPriceInvalid,
    isStopLossPriceInvalid,
    tpslPriceType,
  };
};

/**
 * Gets the direction text for take profit error message.
 *
 * @param direction - The position direction (long or short)
 * @returns Direction text (above/below) or empty string if no direction
 */
export const getTakeProfitErrorDirection = (
  direction?: 'long' | 'short',
): string => {
  if (!direction) return '';
  return direction === 'long' ? 'above' : 'below';
};

/**
 * Gets the direction text for stop loss error message.
 *
 * @param direction - The position direction (long or short)
 * @returns Direction text (below/above) or empty string if no direction
 */
export const getStopLossErrorDirection = (
  direction?: 'long' | 'short',
): string => {
  if (!direction) return '';
  return direction === 'long' ? 'below' : 'above';
};

/**
 * Gets the direction text for stop loss liquidation error message.
 *
 * @param direction - The position direction (long or short)
 * @returns Direction text (above/below) or empty string if no direction
 */
export const getStopLossLiquidationErrorDirection = (
  direction?: 'long' | 'short',
): string => {
  if (!direction) return '';
  return direction === 'long' ? 'above' : 'below';
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
 * Format RoE percentage for display based on focus state
 * @param value - The raw percentage value as string
 * @param isFocused - Whether the input is currently focused
 * @param includeSign - When false, omit `+`/`-` (the Auto Close badge owns the sign)
 * @returns Formatted percentage string for display
 */
export const formatRoEPercentageDisplay = (
  value: string,
  isFocused: boolean,
  includeSign: boolean = true,
): string => {
  if (!value || value.trim() === '') {
    return '';
  }

  // When focused, preserve the exact user input including signs and decimal points
  if (isFocused) {
    // Allow valid numeric patterns with optional sign and space
    if (
      value === '.' ||
      value === '+' ||
      value === '-' ||
      /^[+-]?\s?\d*\.?\d*$/.test(value)
    ) {
      return value;
    }
  }

  const parsed = parseFloat(value);
  if (isNaN(parsed)) {
    return '';
  }

  if (isFocused) {
    // This branch shouldn't be reached now, but keep as fallback
    return value;
  }

  // When not focused, show clean display format with appropriate sign
  const absValue = Math.abs(parsed);
  const formattedValue =
    absValue % 1 === 0 ? absValue.toFixed(0) : absValue.toFixed(2);

  if (!includeSign) {
    return formattedValue;
  }

  // Always show sign for display
  if (parsed >= 0) {
    return `+ ${formattedValue}`;
  }
  return `- ${formattedValue}`;
};

/**
 * Sanitizes input text for percentage fields by handling signs and decimal points
 * @param text - Raw input text
 * @param currentValue - Current field value for length comparison (optional)
 * @param maxDecimalPlaces - Maximum allowed decimal places (default: 5)
 * @returns Sanitized text with proper sign and decimal handling, or null if validation fails
 */
export const sanitizePercentageInput = (
  text: string,
  currentValue?: string,
  maxDecimalPlaces: number = 5,
): string | null => {
  // Allow numbers, decimal point, and plus/minus signs
  // Also handle en-dash (–) and em-dash (—) which might come from typing --
  const sanitized = text.replace(/[–—]/g, '-').replace(/[^0-9.+-]/g, '');

  // Handle sign placement - only allow at the beginning
  let finalValue = sanitized;
  if (sanitized.includes('+') || sanitized.includes('-')) {
    // Remove duplicate consecutive signs but keep the first one
    // e.g., "++" becomes "+", "--" becomes "-"
    finalValue = sanitized.replace(/([+-])\1+/g, '$1');

    // Only do mixed sign cleanup if there are actually mixed signs
    // Check if there are different types of signs in the string
    const hasPlus = finalValue.includes('+');
    const hasMinus = finalValue.includes('-');
    if (hasPlus && hasMinus) {
      // Mixed signs - keep only the first sign
      const firstSignMatch = /[+-]/.exec(finalValue);
      if (firstSignMatch) {
        const sign = firstSignMatch[0];
        const restOfString = finalValue.substring(1);
        const numberPart = restOfString.replace(/[+-]/g, '');
        finalValue = numberPart ? sign + numberPart : sign;
      }
    }
  }

  // Prevent multiple decimal points
  const parts = finalValue.replace(/[+-]/g, '').split('.');
  if (parts.length > 2) return null; // Return null for invalid input

  // Allow erasing but prevent adding when there are more than maxDecimalPlaces decimal places
  if (currentValue !== undefined) {
    const decimalPart = parts[1];
    if (
      decimalPart?.length > maxDecimalPlaces &&
      finalValue.length >= currentValue.length
    ) {
      return null; // Return null to prevent the update
    }
  }

  return finalValue;
};
