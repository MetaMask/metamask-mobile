import { useCallback, useEffect, useState, useRef } from 'react';
import { strings } from '../../../../../locales/i18n';
import type { OrderParams } from '../controllers/types';
import type { OrderFormState } from '../types';
import { usePerpsTrading } from './usePerpsTrading';
import { useStableArray } from './useStableArray';
import {
  VALIDATION_THRESHOLDS,
  PERFORMANCE_CONFIG,
} from '../constants/perpsConfig';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';

interface UsePerpsOrderValidationParams {
  orderForm: OrderFormState;
  positionSize: string;
  assetPrice: number;
  availableBalance: number;
  marginRequired: string;
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
  } = params;

  const { validateOrder } = usePerpsTrading();

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
    const requiredMargin = parseFloat(marginRequired);
    if (requiredMargin > availableBalance) {
      immediateErrors.push(
        strings('perps.order.validation.insufficient_balance', {
          required: marginRequired,
          available: availableBalance.toString(),
        }),
      );
    }

    try {
      // Convert form state to OrderParams for protocol validation
      const orderParams: OrderParams = {
        coin: orderForm.asset,
        isBuy: orderForm.direction === 'long',
        size: positionSize, // Use BTC amount, not USD amount
        orderType: orderForm.type,
        price: orderForm.limitPrice,
        leverage: orderForm.leverage,
        currentPrice: assetPrice,
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
        // Only add protocol error if not already covered by immediate validation
        const errorStr = protocolValidation.error;
        if (!errors.some((e) => e.includes(errorStr))) {
          errors.push(protocolValidation.error);
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
    validateOrder,
  ]);

  useEffect(() => {
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
  }, [performValidation, positionSize, assetPrice]);

  // Return validation with stable array references
  return {
    errors: stableErrors,
    warnings: stableWarnings,
    isValid: validation.isValid,
    isValidating: validation.isValidating,
  };
}
