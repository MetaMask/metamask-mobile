import { useCallback, useEffect, useState } from 'react';
import { strings } from '../../../../../locales/i18n';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import { VALIDATION_THRESHOLDS } from '../constants/perpsConfig';
import type { ClosePositionParams, OrderType } from '../controllers/types';
import { usePerpsTrading } from './usePerpsTrading';

interface UsePerpsClosePositionValidationParams {
  symbol: string;
  closePercentage: number;
  closeAmount: string;
  orderType: OrderType;
  limitPrice?: string;
  currentPrice: number;
  positionSize: number; // Absolute size of the position
  positionValue: number; // Total position value in USD
  minimumOrderAmount: number; // Minimum order size in USD
  closingValue: number; // Value being closed in USD
  remainingPositionValue: number; // Value remaining after close (kept for interface completeness)
  receiveAmount: number; // Amount user will receive after fees
  isPartialClose: boolean;
  skipValidation?: boolean;
}

interface ValidationResult {
  errors: string[];
  warnings: string[];
  isValid: boolean;
  isValidating: boolean;
}

/**
 * Hook to handle close position validation combining protocol-specific and UI-specific rules
 * Uses the existing validateClosePosition method from the provider for protocol validation
 * and adds UI-specific validation on top
 *
 * VALIDATION LOGIC:
 *
 * ==========================================
 * ERRORS (Block user action - button disabled)
 * ==========================================
 *
 * 1. PROTOCOL VALIDATION FAILURE
 * - Any validation error from the provider (e.g., insufficient balance, invalid params)
 * - Example: User has $100 balance but tries to close position requiring $150 margin
 *
 * 2. PARTIAL CLOSE WITH REMAINDER BELOW MINIMUM
 * - When closing part of a position leaves remainder below minimum order amount
 * - Minimum: $6 (mainnet) or $11 (testnet)
 * - Example: ERROR - Closing 95% of a $100 position leaves $5 (below $6 minimum)
 * - Example: ERROR - Closing $94 of a $100 position leaves $6 (exactly at minimum, allowed)
 *
 * 3. FULL CLOSE BELOW MINIMUM ORDER AMOUNT
 * - When closing 100% but the total position value is below minimum
 * - Example: ERROR - Trying to close a $5 position (below $6 minimum on mainnet)
 * - Note: This shouldn't happen if positions were opened correctly
 *
 * 4. MISSING LIMIT PRICE (checked by protocol validation)
 * - Limit orders require a price to be specified
 * - Example: ERROR - Limit order with no price or price <= 0
 * - Note: This is validated by the provider, not duplicate-checked in UI
 *
 * 5. ZERO AMOUNT FOR MARKET ORDER
 * - Market orders with 0% close percentage
 * - Example: ERROR - Slider at 0% for market order
 *
 * ==========================================
 * WARNINGS (Non-blocking - yellow text, user can proceed)
 * ==========================================
 *
 * 1. LIMIT PRICE FAR FROM MARKET (>VALIDATION_THRESHOLDS.LIMIT_PRICE_DIFFERENCE_WARNING)
 * - Warns when limit price unlikely to execute soon
 * - Example: WARNING - BTC at $50,000, limit set at $60,000 (20% higher)
 * - Example: WARNING - ETH at $3,000, limit set at $2,500 (16.7% lower)
 * - User can still place the order if they want
 *
 * 2. VERY SMALL PARTIAL CLOSE (<VALIDATION_THRESHOLDS.SMALL_CLOSE_PERCENTAGE_WARNING of position)
 * - Warns about closing tiny portions that may not be worth the fees
 * - Example: WARNING - Closing only 5% of a $1,000 position ($50)
 * - Example: WARNING - Closing only 2% of a $5,000 position ($100)
 * - Useful for taking small profits but may not justify transaction costs
 *
 * 3. NEGATIVE RECEIVE AMOUNT
 * - When fees exceed the recoverable value from the position
 * - Example: WARNING - Closing will cost you $2 due to fees and losses
 * - User can still proceed to close the position if they choose to exit
 *
 * ==========================================
 * SPECIAL BEHAVIORS:
 * ==========================================
 *
 * - VALIDATION IS ASYNC: Protocol validation may take time, isValidating flag indicates loading
 *
 * - ERRORS TAKE PRECEDENCE: If both errors and warnings exist, button is disabled
 */
export function usePerpsClosePositionValidation(
  params: UsePerpsClosePositionValidationParams,
): ValidationResult {
  const {
    symbol,
    closePercentage,
    closeAmount,
    orderType,
    limitPrice,
    currentPrice,
    minimumOrderAmount,
    closingValue,
    receiveAmount,
    isPartialClose,
    positionValue,
    skipValidation,
  } = params;

  const { validateClosePosition } = usePerpsTrading();

  const [validation, setValidation] = useState<ValidationResult>({
    errors: [],
    warnings: [],
    isValid: false,
    isValidating: false, // Start with false to prevent initial flickering
  });

  const performValidation = useCallback(async () => {
    setValidation((prev) => ({ ...prev, isValidating: true }));

    try {
      // Prepare params for protocol validation
      const closeParams: ClosePositionParams = {
        symbol,
        size: closePercentage === 100 ? undefined : closeAmount.toString(),
        orderType,
        price: orderType === 'limit' ? limitPrice : undefined,
        currentPrice,
      };

      // Get protocol-specific validation
      DevLogger.log(
        'usePerpsClosePositionValidation: Validating close params',
        closeParams,
      );
      const protocolValidation = await validateClosePosition(closeParams);
      DevLogger.log(
        'usePerpsClosePositionValidation: Protocol validation result',
        protocolValidation,
      );

      // Start with protocol validation results
      const errors: string[] = [];
      if (!protocolValidation.isValid && protocolValidation.error) {
        errors.push(protocolValidation.error);
      }
      const warnings: string[] = [];

      // UI-specific validations that don't belong in the provider

      // Special case: if the total position is below minimum, user must close 100%
      if (isPartialClose && positionValue < minimumOrderAmount) {
        errors.push(
          strings('perps.close_position.must_close_full_below_minimum'),
        );
      }
      // Check minimum for partial closes (not for 100% closes)
      // Skip this check if the entire position is below minimum (already handled above)
      else if (isPartialClose && closingValue < minimumOrderAmount) {
        errors.push(
          strings('perps.order.validation.minimum_amount', {
            amount: minimumOrderAmount.toString(),
          }),
        );
      }

      // Warn if user will receive negative amount (but allow them to proceed)
      if (receiveAmount < 0) {
        warnings.push(
          strings('perps.close_position.negative_receive_warning', {
            amount: Math.abs(receiveAmount).toFixed(2),
          }),
        );
      }

      // Limit order specific validation (price warning only - required check is done by protocol)
      if (
        orderType === 'limit' &&
        limitPrice &&
        Number.parseFloat(limitPrice) > 0
      ) {
        const limitPriceNum = Number.parseFloat(limitPrice);
        // Add warning if limit price is far from current price
        const priceDifference = Math.abs(
          (limitPriceNum - currentPrice) / currentPrice,
        );
        if (
          priceDifference > VALIDATION_THRESHOLDS.LIMIT_PRICE_DIFFERENCE_WARNING
        ) {
          warnings.push(
            strings('perps.order.validation.limit_price_far_warning'),
          );
        }
      }

      // Market order validation
      if (orderType === 'market' && closePercentage === 0) {
        errors.push(strings('perps.close_position.no_amount_selected'));
      }

      setValidation({
        errors: [...new Set(errors)], // Deduplicate errors
        warnings: [...new Set(warnings)], // Deduplicate warnings
        isValid: errors.length === 0,
        isValidating: false,
      });
    } catch (error) {
      DevLogger.log(
        'usePerpsClosePositionValidation: Error during validation',
        error,
      );
      setValidation({
        errors: [strings('perps.order.validation.error')],
        warnings: [],
        isValid: false,
        isValidating: false,
      });
    }
  }, [
    symbol,
    closePercentage,
    closeAmount,
    orderType,
    limitPrice,
    currentPrice,
    minimumOrderAmount,
    closingValue,
    receiveAmount,
    isPartialClose,
    positionValue,
    validateClosePosition,
  ]);

  useEffect(() => {
    // Skip validation during keypad input to prevent flickering
    if (skipValidation) {
      return;
    }

    // Skip validation if critical data is missing
    if (!symbol || currentPrice === 0) {
      setValidation({
        errors: [],
        warnings: [],
        isValid: false,
        isValidating: false,
      });
      return;
    }

    performValidation();
  }, [performValidation, symbol, currentPrice, skipValidation]);

  return validation;
}
