import { useCallback, useEffect, useRef, useState } from 'react';
import { strings } from '../../../../../locales/i18n';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import {
  PERFORMANCE_CONFIG,
  PERPS_CONSTANTS,
  VALIDATION_THRESHOLDS,
} from '../constants/perpsConfig';
import { TRADING_DEFAULTS } from '../constants/hyperLiquidConfig';
import { PERPS_ERROR_CODES } from '../controllers/perpsErrorCodes';
import type { OrderParams } from '../controllers/types';
import type { OrderFormState } from '../types/perps-types';
import { formatPerpsFiat } from '../utils/formatUtils';
import { getMaxOrderValue } from '../utils/hyperLiquidValidation';
import { translatePerpsError } from '../utils/translatePerpsError';
import { usePerpsNetwork } from './usePerpsNetwork';
import { usePerpsTrading } from './usePerpsTrading';
import { useStableArray } from './useStableArray';

interface UsePerpsOrderValidationParams {
  orderForm: OrderFormState;
  positionSize: string;
  assetPrice: number;
  availableBalance: number;
  marginRequired: string;
  existingPositionLeverage?: number;
  skipValidation?: boolean;
  originalUsdAmount?: string; // Original USD input for validation (prevents precision loss from recalculation)
}

interface ValidationResult {
  errors: string[];
  warnings: string[];
  isValid: boolean;
  isValidating: boolean;
}

// Stable empty array references to prevent unnecessary re-renders
const EMPTY_ERRORS: string[] = [];
const EMPTY_WARNINGS: string[] = [];

/**
 * Hook to handle order validation combining protocol-specific and UI-specific rules
 * Uses the existing validateOrder method from the provider
 *
 * Note: Errors are preserved during validation to prevent UI flashing.
 * Errors are only cleared when validation confirms they're resolved.
 */
export function usePerpsOrderValidation(
  params: UsePerpsOrderValidationParams,
): ValidationResult {
  const {
    orderForm,
    positionSize,
    assetPrice,
    availableBalance,
    marginRequired,
    existingPositionLeverage,
    skipValidation,
    originalUsdAmount,
  } = params;

  const { validateOrder } = usePerpsTrading();
  const network = usePerpsNetwork();

  const [validation, setValidation] = useState<ValidationResult>({
    errors: EMPTY_ERRORS,
    warnings: EMPTY_WARNINGS,
    isValid: false,
    isValidating: false, // Start with false to prevent initial flickering
  });

  // Use stable array references to prevent unnecessary re-renders
  const stableErrors = useStableArray(validation.errors);
  const stableWarnings = useStableArray(validation.warnings);

  // Use ref to track debounce timer
  const validationTimerRef = useRef<NodeJS.Timeout | null>(null);

  const performValidation = useCallback(async () => {
    // Set validation state to indicate we're validating
    // but preserve existing errors to prevent flashing
    setValidation((prev) => ({
      ...prev,
      isValidating: true,
    }));

    // Perform immediate UI validation for critical errors
    const immediateErrors: string[] = [];

    // Balance validation (immediate)
    const requiredMargin = Number.parseFloat(marginRequired);
    if (requiredMargin > availableBalance) {
      immediateErrors.push(
        strings('perps.order.validation.insufficient_balance', {
          required: marginRequired,
          available: availableBalance.toString(),
        }),
      );
    }

    // Minimum order size validation using original USD input (prevents precision loss)
    // Validate USD amount directly (source of truth) instead of recalculated value
    // This prevents validation flash when price updates cause rounding near the $10 minimum
    const usdAmount = Number.parseFloat(originalUsdAmount || '0');
    const minimumOrderSize =
      network === 'mainnet'
        ? TRADING_DEFAULTS.amount.mainnet
        : TRADING_DEFAULTS.amount.testnet;

    if (usdAmount > 0 && usdAmount < minimumOrderSize) {
      immediateErrors.push(
        strings('perps.order.validation.minimum_amount', {
          amount: minimumOrderSize.toString(),
        }),
      );
    }

    try {
      // Convert form state to OrderParams for protocol validation
      const orderParams: OrderParams = {
        symbol: orderForm.asset,
        isBuy: orderForm.direction === 'long',
        size: positionSize, // Use BTC amount, not USD amount
        orderType: orderForm.type,
        price: orderForm.limitPrice,
        leverage: orderForm.leverage,
        currentPrice: assetPrice,
        existingPositionLeverage,
        usdAmount: originalUsdAmount, // Pass USD as source of truth for validation
      };

      // Get protocol-specific validation
      DevLogger.log(
        'usePerpsOrderValidation: Validating order params',
        orderParams,
      );
      const protocolValidation = await validateOrder(orderParams);
      DevLogger.log(
        'usePerpsOrderValidation: Validation result',
        protocolValidation,
      );

      // Merge immediate errors with protocol validation results
      const errors: string[] = [...immediateErrors];
      if (!protocolValidation.isValid && protocolValidation.error) {
        // Build context data for error interpolation
        const errorContext: Record<string, unknown> = {};

        // For leverage errors, provide min/max/required/provided values
        if (
          protocolValidation.error === PERPS_ERROR_CODES.ORDER_LEVERAGE_INVALID
        ) {
          errorContext.min = 1;
          // Use default max leverage since we don't have market-specific data here
          errorContext.max = PERPS_CONSTANTS.DEFAULT_MAX_LEVERAGE;
        } else if (
          protocolValidation.error ===
          PERPS_ERROR_CODES.ORDER_LEVERAGE_BELOW_POSITION
        ) {
          errorContext.required = existingPositionLeverage;
          errorContext.provided = orderForm.leverage;
        } else if (
          protocolValidation.error ===
          PERPS_ERROR_CODES.ORDER_MAX_VALUE_EXCEEDED
        ) {
          // Calculate max order value based on default leverage and order type
          const maxValue = getMaxOrderValue(
            PERPS_CONSTANTS.DEFAULT_MAX_LEVERAGE,
            orderForm.type,
          );
          errorContext.maxValue = formatPerpsFiat(maxValue, {
            minimumDecimals: 0,
            maximumDecimals: 0,
          }).replace('$', '');
        } else if (
          protocolValidation.error === PERPS_ERROR_CODES.ORDER_SIZE_MIN
        ) {
          // Provide minimum amount for the error message
          errorContext.amount = minimumOrderSize.toString();
        } else if (
          protocolValidation.error === PERPS_ERROR_CODES.ORDER_UNKNOWN_COIN
        ) {
          // Provide the symbol that was not found
          errorContext.symbol = orderForm.asset;
        }

        // Translate error codes from provider to user-friendly messages
        const translatedError = translatePerpsError(
          protocolValidation.error,
          errorContext,
        );
        // Only add protocol error if not already covered by immediate validation
        if (!errors.some((e) => e.includes(translatedError))) {
          errors.push(translatedError);
        }
      }

      const warnings: string[] = [];

      // High leverage warning
      if (orderForm.leverage > VALIDATION_THRESHOLDS.HIGH_LEVERAGE_WARNING) {
        warnings.push(strings('perps.order.validation.high_leverage_warning'));
      }

      setValidation({
        errors: errors.length > 0 ? errors : EMPTY_ERRORS,
        warnings: warnings.length > 0 ? warnings : EMPTY_WARNINGS,
        isValid: errors.length === 0,
        isValidating: false,
      });
    } catch (error) {
      DevLogger.log('usePerpsOrderValidation: Error during validation', error);
      setValidation({
        errors: [strings('perps.order.validation.error')],
        warnings: EMPTY_WARNINGS,
        isValid: false,
        isValidating: false,
      });
    }
  }, [
    orderForm.asset,
    orderForm.direction,
    orderForm.leverage,
    orderForm.limitPrice,
    orderForm.type,
    positionSize,
    assetPrice,
    availableBalance,
    marginRequired,
    existingPositionLeverage,
    originalUsdAmount,
    validateOrder,
    network,
  ]);

  useEffect(() => {
    // Skip validation during keypad input to prevent flickering
    if (skipValidation) {
      return;
    }

    // Skip validation if critical data is missing
    if (!positionSize || assetPrice === 0) {
      setValidation((prev) => ({
        ...prev,
        isValidating: false,
        // Keep existing errors but mark as invalid
        isValid: false,
      }));
      return;
    }

    // Clear existing timer
    if (validationTimerRef.current) {
      clearTimeout(validationTimerRef.current);
    }

    // Debounce validation to avoid excessive calls
    validationTimerRef.current = setTimeout(() => {
      performValidation();
      validationTimerRef.current = null;
    }, PERFORMANCE_CONFIG.VALIDATION_DEBOUNCE_MS);

    // Cleanup
    return () => {
      if (validationTimerRef.current) {
        clearTimeout(validationTimerRef.current);
      }
    };
  }, [performValidation, positionSize, assetPrice, skipValidation]);

  // Return validation with stable array references
  return {
    errors: stableErrors,
    warnings: stableWarnings,
    isValid: validation.isValid,
    isValidating: validation.isValidating,
  };
}
