/**
 * Position calculation utilities for closing positions
 */
import { CLOSE_POSITION_CONFIG } from '../constants/perpsConfig';

interface CloseAmountFromPercentageParams {
  percentage: number;
  positionSize: number;
  currentPrice: number;
}

interface CloseAmountLimitsParams {
  amount: number;
  maxAmount: number;
  minAmount?: number;
}

interface CloseAmountDisplayParams {
  value: string;
  displayMode: 'usd' | 'token';
  decimals?: number;
}

interface CloseValueParams {
  amount: number;
  price: number;
}

/**
 * Calculate close amounts from percentage for both USD and token modes
 * @param params - Percentage, position size, and current price
 * @returns Object with token amount and USD value
 */
export function calculateCloseAmountFromPercentage(
  params: CloseAmountFromPercentageParams,
): { tokenAmount: number; usdValue: number } {
  const { percentage, positionSize, currentPrice } = params;

  if (
    isNaN(percentage) ||
    isNaN(positionSize) ||
    isNaN(currentPrice) ||
    percentage < 0 ||
    percentage > 100
  ) {
    return { tokenAmount: 0, usdValue: 0 };
  }

  const tokenAmount = (percentage / 100) * Math.abs(positionSize);
  const usdValue = tokenAmount * currentPrice;

  return {
    tokenAmount: Number(
      tokenAmount.toFixed(CLOSE_POSITION_CONFIG.AMOUNT_CALCULATION_PRECISION),
    ),
    usdValue: Number(
      usdValue.toFixed(CLOSE_POSITION_CONFIG.USD_DECIMAL_PLACES),
    ),
  };
}

/**
 * Validate and clamp close amount within limits
 * @param params - Amount to validate, maximum allowed, and optional minimum
 * @returns Clamped amount within valid range
 */
export function validateCloseAmountLimits(
  params: CloseAmountLimitsParams,
): number {
  const { amount, maxAmount, minAmount = 0 } = params;

  if (isNaN(amount) || amount < 0) {
    return 0;
  }

  return Math.max(minAmount, Math.min(amount, maxAmount));
}

/**
 * Format close amount for display based on mode and decimals
 * @param params - Value string, display mode, and decimal places
 * @returns Formatted string with appropriate decimal precision
 */
export function formatCloseAmountDisplay(
  params: CloseAmountDisplayParams,
): string {
  const { value, displayMode, decimals } = params;

  if (!value || value === '') {
    return '0';
  }

  const numericValue = parseFloat(value);
  if (isNaN(numericValue)) {
    return '0';
  }

  const decimalPlaces =
    decimals ??
    (displayMode === 'usd'
      ? CLOSE_POSITION_CONFIG.USD_DECIMAL_PLACES
      : CLOSE_POSITION_CONFIG.AMOUNT_CALCULATION_PRECISION);

  // For USD mode, limit input to specified decimal places
  if (displayMode === 'usd' && value.includes('.')) {
    const parts = value.split('.');
    const integerPart = parts[0] || '0';
    const decimalPart = (parts[1] || '').slice(
      0,
      CLOSE_POSITION_CONFIG.USD_DECIMAL_PLACES,
    );
    return `${integerPart}${decimalPart ? '.' + decimalPart : ''}`;
  }

  return numericValue.toFixed(decimalPlaces);
}

/**
 * Calculate USD value for a given token amount
 * @param params - Token amount and current price
 * @returns USD value formatted to 2 decimal places
 */
export function calculateCloseValue(params: CloseValueParams): number {
  const { amount, price } = params;

  if (isNaN(amount) || isNaN(price) || amount < 0 || price <= 0) {
    return 0;
  }

  const value = amount * price;
  return Number(value.toFixed(CLOSE_POSITION_CONFIG.USD_DECIMAL_PLACES));
}

/**
 * Calculate percentage from token amount
 * @param tokenAmount - Amount in token units
 * @param totalPositionSize - Total position size in token units
 * @returns Percentage (0-100)
 */
export function calculatePercentageFromTokenAmount(
  tokenAmount: number,
  totalPositionSize: number,
): number {
  if (
    isNaN(tokenAmount) ||
    isNaN(totalPositionSize) ||
    totalPositionSize === 0
  ) {
    return 0;
  }

  const percentage =
    (Math.abs(tokenAmount) / Math.abs(totalPositionSize)) * 100;
  return Math.max(0, Math.min(100, percentage));
}

/**
 * Calculate percentage from USD amount
 * @param usdAmount - Amount in USD
 * @param totalPositionValue - Total position value in USD
 * @returns Percentage (0-100)
 */
export function calculatePercentageFromUSDAmount(
  usdAmount: number,
  totalPositionValue: number,
): number {
  if (
    isNaN(usdAmount) ||
    isNaN(totalPositionValue) ||
    totalPositionValue === 0
  ) {
    return 0;
  }

  const percentage = (usdAmount / totalPositionValue) * 100;
  return Math.max(0, Math.min(100, percentage));
}
