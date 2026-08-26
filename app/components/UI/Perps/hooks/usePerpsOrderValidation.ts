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

export interface ValidationResult extends ValidationAttempt {
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

type OrderFormValidationData = Pick<
  OrderFormState,
  'asset' | 'direction' | 'leverage' | 'limitPrice' | 'type'
>;

interface BuildOrderParamsInput {
  orderForm: OrderFormValidationData;
  positionSize: string;
  assetPrice: number;
  existingPositionLeverage?: number;
  originalUsdAmount?: string;
  reduceOnly?: boolean;
  isFullClose?: boolean;
  triggerPrice?: string;
  szDecimals?: number;
}

interface ImmediateValidationInput {
  marginRequired: string;
  spendableBalance: number;
  originalUsdAmount?: string;
  minimumOrderSize: number;
  reduceOnly?: boolean;
  isFullClose?: boolean;
}

interface ProtocolValidationResult {
  isValid: boolean;
  error?: string;
}

interface ProtocolValidationErrorsInput {
  protocolValidation: ProtocolValidationResult;
  immediateErrors: string[];
  requestFieldIssues: OrderFormFieldIssue[];
  orderForm: OrderFormValidationData;
  existingPositionLeverage?: number;
  minimumOrderSize: number;
}

interface BuildValidationOutcomeInput {
  requestFieldIssues: OrderFormFieldIssue[];
  errors: string[];
  warnings: string[];
  protocolValid?: boolean;
}

interface ValidationOutcome {
  attempt: ValidationAttempt;
  state: ValidationState;
}

const getMinimumOrderSize = (network: 'mainnet' | 'testnet'): number =>
  network === 'mainnet'
    ? TRADING_DEFAULTS.amount.mainnet
    : TRADING_DEFAULTS.amount.testnet;

const isValidationReady = ({
  assetPrice,
  positionSize,
}: {
  assetPrice: number;
  positionSize: string;
}): boolean => {
  if (!(assetPrice > 0)) {
    return false;
  }

  const numericPositionSize = Number.parseFloat(positionSize);
  return Number.isFinite(numericPositionSize) && numericPositionSize > 0;
};

const getImmediateValidationErrors = ({
  marginRequired,
  spendableBalance,
  originalUsdAmount,
  minimumOrderSize,
  reduceOnly,
  isFullClose,
}: ImmediateValidationInput): string[] => {
  const errors: string[] = [];
  const requiredMargin = Number.parseFloat(marginRequired);

  if (requiredMargin > spendableBalance) {
    errors.push(
      strings('perps.order.validation.insufficient_balance', {
        required: marginRequired,
        available: spendableBalance.toString(),
      }),
    );
  }

  const usdAmount = Number.parseFloat(originalUsdAmount || '0');
  const skipMinimumAmount = Boolean(reduceOnly && isFullClose);
  if (!skipMinimumAmount && usdAmount > 0 && usdAmount < minimumOrderSize) {
    errors.push(
      strings('perps.order.validation.minimum_amount', {
        amount: minimumOrderSize.toString(),
      }),
    );
  }

  return errors;
};

const buildOrderParams = ({
  orderForm,
  positionSize,
  assetPrice,
  existingPositionLeverage,
  originalUsdAmount,
  reduceOnly,
  isFullClose,
  triggerPrice,
  szDecimals,
}: BuildOrderParamsInput): OrderParams => ({
  symbol: orderForm.asset,
  isBuy: orderForm.direction === 'long',
  size: positionSize,
  orderType: orderForm.type,
  leverage: orderForm.leverage,
  currentPrice: assetPrice,
  existingPositionLeverage,
  ...(originalUsdAmount !== undefined ? { usdAmount: originalUsdAmount } : {}),
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
});

const getProtocolErrorContext = ({
  error,
  orderForm,
  existingPositionLeverage,
  minimumOrderSize,
}: {
  error?: string;
  orderForm: OrderFormValidationData;
  existingPositionLeverage?: number;
  minimumOrderSize: number;
}): Record<string, unknown> => {
  switch (error) {
    case PERPS_ERROR_CODES.ORDER_LEVERAGE_INVALID:
      return {
        min: 1,
        max: PERPS_CONSTANTS.DefaultMaxLeverage,
      };
    case PERPS_ERROR_CODES.ORDER_LEVERAGE_BELOW_POSITION:
      return {
        required: existingPositionLeverage,
        provided: orderForm.leverage,
      };
    case PERPS_ERROR_CODES.ORDER_MAX_VALUE_EXCEEDED: {
      const maxValue = getMaxOrderValue(
        PERPS_CONSTANTS.DefaultMaxLeverage,
        orderForm.type,
      );
      return {
        maxValue: formatPerpsFiat(maxValue, {
          minimumDecimals: 0,
          maximumDecimals: 0,
        }).replace('$', ''),
      };
    }
    case PERPS_ERROR_CODES.ORDER_SIZE_MIN:
      return { amount: minimumOrderSize.toString() };
    case PERPS_ERROR_CODES.ORDER_UNKNOWN_COIN:
      return { symbol: orderForm.asset };
    default:
      return {};
  }
};

const getProtocolValidationErrors = ({
  protocolValidation,
  immediateErrors,
  requestFieldIssues,
  orderForm,
  existingPositionLeverage,
  minimumOrderSize,
}: ProtocolValidationErrorsInput): string[] => {
  const errors = [...immediateErrors];
  const { error } = protocolValidation;
  const isFieldOwnedError =
    error !== undefined &&
    requestFieldIssues.length > 0 &&
    FIELD_OWNED_PROTOCOL_ERRORS.has(error);

  if (!protocolValidation.isValid && error && !isFieldOwnedError) {
    const translatedError = translatePerpsError(
      error,
      getProtocolErrorContext({
        error,
        orderForm,
        existingPositionLeverage,
        minimumOrderSize,
      }),
    );
    const isDuplicate = immediateErrors.some((existingError) =>
      existingError.includes(translatedError),
    );
    if (!isDuplicate) {
      errors.push(translatedError);
    }
  }

  if (!protocolValidation.isValid && !protocolValidation.error) {
    errors.push(strings('perps.order.validation.failed'));
  }

  return errors;
};

const getValidationWarnings = (leverage: number): string[] => {
  if (leverage <= VALIDATION_THRESHOLDS.HighLeverageWarning) {
    return EMPTY_WARNINGS;
  }

  return [strings('perps.order.validation.high_leverage_warning')];
};

const buildValidationOutcome = ({
  requestFieldIssues,
  errors,
  warnings,
  protocolValid,
}: BuildValidationOutcomeInput): ValidationOutcome => {
  const resolvedErrors = errors.length > 0 ? errors : EMPTY_ERRORS;
  const resolvedWarnings = warnings.length > 0 ? warnings : EMPTY_WARNINGS;
  const resolvedProtocolValid = protocolValid ?? resolvedErrors.length === 0;
  const attempt: ValidationAttempt = {
    errors: resolvedErrors,
    warnings: resolvedWarnings,
    fieldIssues: requestFieldIssues,
    isValid: resolvedProtocolValid && requestFieldIssues.length === 0,
  };

  return {
    attempt,
    state: {
      errors: resolvedErrors,
      warnings: resolvedWarnings,
      protocolValid: resolvedProtocolValid,
      isValidating: false,
    },
  };
};

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
  const orderFormValidationData = useMemo<OrderFormValidationData>(
    () => ({
      asset: orderForm.asset,
      direction: orderForm.direction,
      leverage: orderForm.leverage,
      limitPrice: orderForm.limitPrice,
      type: orderForm.type,
    }),
    [
      orderForm.asset,
      orderForm.direction,
      orderForm.leverage,
      orderForm.limitPrice,
      orderForm.type,
    ],
  );

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

      const finalizeValidation = (
        input: BuildValidationOutcomeInput,
      ): ValidationAttempt => {
        const outcome = buildValidationOutcome(input);
        if (requestId === validationRequestIdRef.current) {
          setValidation(outcome.state);
        }
        return outcome.attempt;
      };

      // Set validation state to indicate we're validating
      // but preserve existing errors to prevent flashing
      setValidation((prev) => ({
        ...prev,
        isValidating: true,
      }));

      const validationReady = isValidationReady({
        assetPrice,
        positionSize,
      });
      if (!validationReady) {
        return finalizeValidation({
          requestFieldIssues,
          errors: EMPTY_ERRORS,
          warnings: EMPTY_WARNINGS,
          protocolValid: false,
        });
      }

      const minimumOrderSize = getMinimumOrderSize(network);
      const immediateErrors = getImmediateValidationErrors({
        marginRequired,
        spendableBalance,
        originalUsdAmount,
        minimumOrderSize,
        reduceOnly,
        isFullClose,
      });

      try {
        const orderParams = buildOrderParams({
          orderForm: orderFormValidationData,
          positionSize,
          assetPrice,
          existingPositionLeverage,
          originalUsdAmount,
          reduceOnly,
          isFullClose,
          triggerPrice,
          szDecimals,
        });

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

        return finalizeValidation({
          requestFieldIssues,
          errors: getProtocolValidationErrors({
            protocolValidation,
            immediateErrors,
            requestFieldIssues,
            orderForm: orderFormValidationData,
            existingPositionLeverage,
            minimumOrderSize,
          }),
          warnings: getValidationWarnings(orderFormValidationData.leverage),
        });
      } catch (error) {
        DevLogger.log(
          'usePerpsOrderValidation: Error during validation',
          error,
        );
        return finalizeValidation({
          requestFieldIssues,
          errors: [strings('perps.order.validation.error')],
          warnings: EMPTY_WARNINGS,
        });
      }
    },
    [
      assetPrice,
      existingPositionLeverage,
      isFullClose,
      marginRequired,
      network,
      orderFormValidationData,
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
    const requestId = ++validationRequestIdRef.current;

    clearValidationTimer();

    // Synchronous field validation is derived during render. Lite also uses
    // this pending state to block submission throughout the debounce window;
    // Pro intentionally maps its CTA spinner only to active placement.
    setValidation((prev) => ({
      ...prev,
      isValidating: !skipValidation,
    }));

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

    if (skipValidation) {
      return {
        errors: EMPTY_ERRORS,
        warnings: EMPTY_WARNINGS,
        fieldIssues,
        isValid: false,
      };
    }

    const attempt = await performValidation(requestId, fieldIssues);
    return (
      attempt ?? {
        errors: [strings('perps.order.validation.failed')],
        warnings: EMPTY_WARNINGS,
        fieldIssues,
        isValid: false,
      }
    );
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
