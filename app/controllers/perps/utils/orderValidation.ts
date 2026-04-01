/**
 * Provider-agnostic order validation utilities.
 *
 * These validations check basic order shape (coin, size, price) and apply
 * to all perps providers, not just HyperLiquid.
 */

import { PERPS_ERROR_CODES } from '../perpsErrorCodes';

/**
 * Validate order parameters.
 * Basic validation - checks required fields are present.
 * Amount validation (size/USD) is handled by validateOrder.
 *
 * @param params - Order parameters to validate
 * @param params.coin - The trading pair coin symbol
 * @param params.size - The order size as string
 * @param params.price - The order price as string
 * @param params.orderType - The order type (market or limit)
 * @returns Validation result with isValid flag and optional error message
 */
export function validateOrderParams(params: {
  coin?: string;
  size?: string;
  price?: string;
  orderType?: 'market' | 'limit';
}): { isValid: boolean; error?: string } {
  if (!params.coin) {
    return {
      isValid: false,
      error: PERPS_ERROR_CODES.ORDER_COIN_REQUIRED,
    };
  }

  // Note: Size validation removed - validateOrder handles amount validation using USD as source of truth

  // Require price for limit orders
  if (params.orderType === 'limit' && !params.price) {
    return {
      isValid: false,
      error: PERPS_ERROR_CODES.ORDER_LIMIT_PRICE_REQUIRED,
    };
  }

  if (params.price && Number.parseFloat(params.price) <= 0) {
    return {
      isValid: false,
      error: PERPS_ERROR_CODES.ORDER_PRICE_POSITIVE,
    };
  }

  return { isValid: true };
}
