import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { strings } from '../../../../../locales/i18n';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import {
  PERFORMANCE_CONFIG,
  PERPS_CONSTANTS,
  VALIDATION_THRESHOLDS,
  TRADING_DEFAULTS,
  PERPS_ERROR_CODES,
  getMaxOrderValue,
  isLimitExecutionOrderType,
  isTriggerOrderType,
  type OrderParams,
  type OrderFormState,
} from '@metamask/perps-controller';
import { formatPerpsFiat } from '../utils/formatUtils';
import { translatePerpsError } from '../utils/translatePerpsError';
import {
  getOrderFormFieldIssues,
  canonicalizeOrderPrice,
  type OrderFormFieldIssue,
} from '../utils/triggerOrderValidation';
import { usePerpsNetwork } from './usePerpsNetwork';
import { usePerpsTrading } from './usePerpsTrading';
import { useStableArray } from './useStableArray';

interface UsePerpsOrderValidationParams {
  orderForm: OrderFormState;
  positionSize: string;
  assetPrice: number;
  /** Max USD that can collateralize a new position (mirrors AccountState.spendableBalance). */
  spendableBalance: number;
  marginRequired: string;
  existingPositionLeverage?: number;
  skipValidation?: boolean;
  originalUsdAmount?: string; // Original USD input for validation (prevents precision loss from recalculation)
  /** When true, passes reduceOnly through to protocol validation. */
  reduceOnly?: boolean;
  /**
   * When true with reduceOnly, skips the UI minimum-amount check and tells the
   * controller to apply its full-close minimum exemption.
   */
  isFullClose?: boolean;
  /** Trigger price for stop/take placements; omitted for market and limit. */
  triggerPrice?: string;
  /** Live mid price used for trigger placement-side validation. */
  midPrice?: number;
  /** Asset size decimals used to canonicalize venue prices. */
  szDecimals?: number;
}

interface ValidationState {
  errors: string[];
  warnings: string[];
  protocolValid: boolean;
  isValidating: boolean;
}

export interface ValidationAttempt {
  errors: string[];
  warnings: string[];
  fieldIssues: OrderFormFieldIssue[];
  isValid: boolean;
}

export interface ValidationResult {
  errors: string[];
  warnings: string[];
  fieldIssues: OrderFormFieldIssue[];
  isValid: boolean;
  isValidating: boolean;
  validateNow: () => Promise<ValidationAttempt>;
}

// Stable empty array references to prevent unnecessary re-renders
const EMPTY_ERRORS: string[] = [];
const EMPTY_WARNINGS: string[] = [];
const FIELD_OWNED_PROTOCOL_ERRORS = new Set<string>([
  PERPS_ERROR_CODES.ORDER_PRICE_REQUIRED,
  PERPS_ERROR_CODES.ORDER_LIMIT_PRICE_REQUIRED,
  PERPS_ERROR_CODES.ORDER_PRICE_POSITIVE,
  PERPS_ERROR_CODES.ORDER_TRIGGER_PRICE_REQUIRED,
  PERPS_ERROR_CODES.ORDER_TRIGGER_PRICE_POSITIVE,
]);

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
    spendableBalance,
    marginRequired,
    existingPositionLeverage,
    skipValidation,
    originalUsdAmount,
    reduceOnly,
    isFullClose,
    triggerPrice,
    midPrice = assetPrice,
    szDecimals,
  } = params;

  const { validateOrder } = usePerpsTrading();
  const network = usePerpsNetwork();

  const [validation, setValidation] = useState<ValidationState>({
    errors: EMPTY_ERRORS,
    warnings: EMPTY_WARNINGS,
    protocolValid: false,
    isValidating: false, // Start with false to prevent initial flickering
  });

  // Use stable array references to prevent unnecessary re-renders
  const stableErrors = useStableArray(validation.errors);
  const stableWarnings = useStableArray(validation.warnings);

  const fieldIssues = useMemo(
    () =>
      getOrderFormFieldIssues({
        orderType: orderForm.type,
        direction: orderForm.direction,
        triggerPrice,
        limitPrice: orderForm.limitPrice,
        midPrice,
        szDecimals,
      }),
    [
      midPrice,
      orderForm.direction,
      orderForm.limitPrice,
      orderForm.type,
      szDecimals,
      triggerPrice,
    ],
  );

  // Use ref to track debounce timer
  const validationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const validationRequestIdRef = useRef(0);
  // Track whether we've completed the first validation so we can skip the debounce for it
  const hasValidatedOnceRef = useRef(false);
  const isImmediateValidationInFlightRef = useRef(false);
  const immediateValidationCountRef = useRef(0);

  const clearValidationTimer = useCallback(() => {
    if (validationTimerRef.current) {
      clearTimeout(validationTimerRef.current);
      validationTimerRef.current = null;
    }
  }, []);

  const performValidation = useCallback(
    async (
      requestId: number,
      requestFieldIssues: OrderFormFieldIssue[],
    ): Promise<ValidationAttempt | undefined> => {
      if (requestId !== validationRequestIdRef.current) {
        return undefined;
      }

      // Set validation state to indicate we're validating
      // but preserve existing errors to prevent flashing
      setValidation((prev) => ({
        ...prev,
        isValidating: true,
      }));

      const completeValidation = (
        errors: string[],
        warnings: string[],
      ): ValidationAttempt | undefined => {
        if (requestId !== validationRequestIdRef.current) {
          return undefined;
        }

        const resolvedErrors = errors.length > 0 ? errors : EMPTY_ERRORS;
        const resolvedWarnings =
          warnings.length > 0 ? warnings : EMPTY_WARNINGS;
        const attempt: ValidationAttempt = {
          errors: resolvedErrors,
          warnings: resolvedWarnings,
          fieldIssues: requestFieldIssues,
          isValid:
            resolvedErrors.length === 0 && requestFieldIssues.length === 0,
        };

        setValidation({
          errors: resolvedErrors,
          warnings: resolvedWarnings,
          protocolValid: resolvedErrors.length === 0,
          isValidating: false,
        });

        return attempt;
      };

      if (!(assetPrice > 0)) {
        return completeValidation(
          [strings('perps.order.validation.market_data_loading')],
          EMPTY_WARNINGS,
        );
      }

      const numericPositionSize = Number.parseFloat(positionSize);
      if (!Number.isFinite(numericPositionSize) || numericPositionSize <= 0) {
        return completeValidation(
          [strings('perps.order.validation.amount_required')],
          EMPTY_WARNINGS,
        );
      }

      // Perform immediate UI validation for critical errors
      const immediateErrors: string[] = [];

      // Balance validation (immediate)
      const requiredMargin = Number.parseFloat(marginRequired);
      if (requiredMargin > spendableBalance) {
        immediateErrors.push(
          strings('perps.order.validation.insufficient_balance', {
            required: marginRequired,
            available: spendableBalance.toString(),
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

      // Full reduce-only closes may be below the normal minimum notional (dust);
      // the controller skips ORDER_SIZE_MIN when reduceOnly && isFullClose.
      const skipMinimumAmount = Boolean(reduceOnly && isFullClose);
      if (!skipMinimumAmount && usdAmount > 0 && usdAmount < minimumOrderSize) {
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
          leverage: orderForm.leverage,
          currentPrice: assetPrice,
          existingPositionLeverage,
          ...(originalUsdAmount !== undefined
            ? { usdAmount: originalUsdAmount }
            : {}),
          ...(isLimitExecutionOrderType(orderForm.type) && orderForm.limitPrice
            ? {
                price: canonicalizeOrderPrice(orderForm.limitPrice, szDecimals),
              }
            : {}),
          ...(isTriggerOrderType(orderForm.type) && triggerPrice?.trim()
            ? {
                triggerPrice: canonicalizeOrderPrice(triggerPrice, szDecimals),
              }
            : {}),
          ...(reduceOnly !== undefined ? { reduceOnly } : {}),
          ...(isFullClose !== undefined ? { isFullClose } : {}),
        };

        // Get protocol-specific validation
        DevLogger.log(
          'usePerpsOrderValidation: Validating order params',
          orderParams,
        );
        const protocolValidation = await validateOrder(orderParams);
        if (requestId !== validationRequestIdRef.current) {
          return undefined;
        }
        DevLogger.log(
          'usePerpsOrderValidation: Validation result',
          protocolValidation,
        );

        // Merge immediate errors with protocol validation results
        const errors: string[] = [...immediateErrors];
        if (
          !protocolValidation.isValid &&
          protocolValidation.error &&
          !(
            requestFieldIssues.length > 0 &&
            FIELD_OWNED_PROTOCOL_ERRORS.has(protocolValidation.error)
          )
        ) {
          // Build context data for error interpolation
          const errorContext: Record<string, unknown> = {};

          // For leverage errors, provide min/max/required/provided values
          if (
            protocolValidation.error ===
            PERPS_ERROR_CODES.ORDER_LEVERAGE_INVALID
          ) {
            errorContext.min = 1;
            // Use default max leverage since we don't have market-specific data here
            errorContext.max = PERPS_CONSTANTS.DefaultMaxLeverage;
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
              PERPS_CONSTANTS.DefaultMaxLeverage,
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
        if (!protocolValidation.isValid && !protocolValidation.error) {
          errors.push(strings('perps.order.validation.failed'));
        }

        const warnings: string[] = [];

        // High leverage warning
        if (orderForm.leverage > VALIDATION_THRESHOLDS.HighLeverageWarning) {
          warnings.push(
            strings('perps.order.validation.high_leverage_warning'),
          );
        }

        return completeValidation(errors, warnings);
      } catch (error) {
        if (requestId !== validationRequestIdRef.current) {
          return undefined;
        }
        DevLogger.log(
          'usePerpsOrderValidation: Error during validation',
          error,
        );
        return completeValidation(
          [strings('perps.order.validation.error')],
          EMPTY_WARNINGS,
        );
      }
    },
    [
      assetPrice,
      existingPositionLeverage,
      isFullClose,
      marginRequired,
      network,
      orderForm.asset,
      orderForm.direction,
      orderForm.leverage,
      orderForm.limitPrice,
      orderForm.type,
      originalUsdAmount,
      positionSize,
      reduceOnly,
      spendableBalance,
      szDecimals,
      triggerPrice,
      validateOrder,
    ],
  );

  useEffect(() => {
    if (isImmediateValidationInFlightRef.current) {
      return;
    }

    const requestId = ++validationRequestIdRef.current;

    clearValidationTimer();

    // Synchronous field validation is derived during render. Reset the
    // asynchronous status while waiting for the next debounced validation.
    setValidation((prev) =>
      prev.isValidating ? { ...prev, isValidating: false } : prev,
    );

    // Skip protocol validation during keypad input to prevent flickering.
    if (skipValidation) {
      return;
    }

    // Run first validation immediately to enable the place-order button ASAP;
    // subsequent changes are debounced to avoid excessive calls during input.
    if (!hasValidatedOnceRef.current) {
      hasValidatedOnceRef.current = true;
      performValidation(requestId, fieldIssues);
      return;
    }

    validationTimerRef.current = setTimeout(() => {
      performValidation(requestId, fieldIssues);
      validationTimerRef.current = null;
    }, PERFORMANCE_CONFIG.ValidationDebounceMs);

    // Cleanup
    return () => {
      clearValidationTimer();
    };
  }, [
    assetPrice,
    clearValidationTimer,
    midPrice,
    orderForm.direction,
    orderForm.limitPrice,
    orderForm.type,
    fieldIssues,
    performValidation,
    positionSize,
    skipValidation,
    szDecimals,
    triggerPrice,
  ]);

  const validateNow = useCallback(async (): Promise<ValidationAttempt> => {
    clearValidationTimer();
    const requestId = ++validationRequestIdRef.current;
    hasValidatedOnceRef.current = true;
    immediateValidationCountRef.current += 1;
    isImmediateValidationInFlightRef.current = true;

    try {
      if (skipValidation) {
        return {
          errors: EMPTY_ERRORS,
          warnings: EMPTY_WARNINGS,
          fieldIssues,
          isValid: false,
        };
      }

      let attempt = await performValidation(requestId, fieldIssues);
      if (!attempt) {
        const retryRequestId = ++validationRequestIdRef.current;
        attempt = await performValidation(retryRequestId, fieldIssues);
      }

      return (
        attempt ?? {
          errors: [strings('perps.order.validation.failed')],
          warnings: EMPTY_WARNINGS,
          fieldIssues,
          isValid: false,
        }
      );
    } finally {
      immediateValidationCountRef.current -= 1;
      isImmediateValidationInFlightRef.current =
        immediateValidationCountRef.current > 0;
    }
  }, [clearValidationTimer, fieldIssues, performValidation, skipValidation]);

  // Return validation with stable array references
  return {
    errors: stableErrors,
    warnings: stableWarnings,
    fieldIssues,
    isValid: validation.protocolValid && fieldIssues.length === 0,
    isValidating: validation.isValidating,
    validateNow,
  };
}
