import { useCallback, useEffect, useState, useRef } from 'react';
import { strings } from '../../../../../locales/i18n';
import type { OrderParams } from '../controllers/types';
import type { OrderFormState } from '../types';
import { usePerpsTrading } from './usePerpsTrading';
import {
  HYPERLIQUID_MAINNET_CHAIN_ID,
  HYPERLIQUID_TESTNET_CHAIN_ID,
} from '../constants/hyperLiquidConfig';
import {
  VALIDATION_THRESHOLDS,
  PERFORMANCE_CONFIG,
} from '../constants/perpsConfig';
import type { PerpsToken } from '../components/PerpsTokenSelector';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';

interface UsePerpsOrderValidationParams {
  orderForm: OrderFormState;
  positionSize: string;
  assetPrice: number;
  availableBalance: number;
  marginRequired: string;
  selectedPaymentToken?: PerpsToken | null;
}

interface ValidationResult {
  errors: string[];
  warnings: string[];
  isValid: boolean;
  isValidating: boolean;
}

/**
 * Hook to handle order validation combining protocol-specific and UI-specific rules
 * Uses the existing validateOrder method from the provider
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
    selectedPaymentToken,
  } = params;

  const { validateOrder } = usePerpsTrading();

  const [validation, setValidation] = useState<ValidationResult>({
    errors: [],
    warnings: [],
    isValid: false,
    isValidating: false, // Start with false to prevent initial flickering
  });

  // Use ref to track debounce timer
  const validationTimerRef = useRef<NodeJS.Timeout | null>(null);

  const performValidation = useCallback(async () => {
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

    // Payment token validation (immediate)
    const tokenChainId = selectedPaymentToken?.chainId;
    if (
      tokenChainId &&
      tokenChainId !== HYPERLIQUID_MAINNET_CHAIN_ID &&
      tokenChainId !== HYPERLIQUID_TESTNET_CHAIN_ID
    ) {
      immediateErrors.push(
        strings('perps.order.validation.only_hyperliquid_usdc'),
      );
    }

    // Update with immediate errors first
    setValidation((prev) => ({
      ...prev,
      errors: immediateErrors,
      isValid: immediateErrors.length === 0,
      isValidating: true,
    }));

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
        errors,
        warnings,
        isValid: errors.length === 0,
        isValidating: false,
      });
    } catch (error) {
      DevLogger.log('usePerpsOrderValidation: Error during validation', error);
      setValidation({
        errors: [strings('perps.order.validation.error')],
        warnings: [],
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
    selectedPaymentToken?.chainId,
    validateOrder,
  ]);

  useEffect(() => {
    // Skip validation if critical data is missing
    if (!positionSize || assetPrice === 0) {
      setValidation({
        errors: [],
        warnings: [],
        isValid: false,
        isValidating: false,
      });
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

  return validation;
}
