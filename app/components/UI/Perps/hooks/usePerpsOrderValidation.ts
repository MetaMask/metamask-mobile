import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
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

interface CompleteValidationInput {
  requestId: number;
  currentRequestId: number;
  requestFieldIssues: OrderFormFieldIssue[];
  errors: string[];
  warnings: string[];
  protocolValid?: boolean;
  setValidation: Dispatch<SetStateAction<ValidationState>>;
}

interface ValidationPrerequisiteResult {
  errors: string[];
  protocolValid: boolean;
}

const getMinimumOrderSize = (network: 'mainnet' | 'testnet'): number =>
  network === 'mainnet'
    ? TRADING_DEFAULTS.amount.mainnet
    : TRADING_DEFAULTS.amount.testnet;

const getValidationPrerequisiteResult = ({
  assetPrice,
  positionSize,
}: {
  assetPrice: number;
  positionSize: string;
}): ValidationPrerequisiteResult | undefined => {
  if (!(assetPrice > 0)) {
    return {
      errors: EMPTY_ERRORS,
      protocolValid: false,
    };
  }

  const numericPositionSize = Number.parseFloat(positionSize);
  if (!Number.isFinite(numericPositionSize) || numericPositionSize <= 0) {
    return {
      errors: EMPTY_ERRORS,
      protocolValid: false,
    };
  }

  return undefined;
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

const getProtocolValidationError = ({
  protocolValidation,
  immediateErrors,
  requestFieldIssues,
  orderForm,
  existingPositionLeverage,
  minimumOrderSize,
}: ProtocolValidationErrorsInput): string | undefined => {
  const { error } = protocolValidation;
  if (
    protocolValidation.isValid ||
    !error ||
    (requestFieldIssues.length > 0 && FIELD_OWNED_PROTOCOL_ERRORS.has(error))
  ) {
    return undefined;
  }

  const translatedError = translatePerpsError(
    error,
    getProtocolErrorContext({
      error,
      orderForm,
      existingPositionLeverage,
      minimumOrderSize,
    }),
  );
  if (
    immediateErrors.some((existingError) =>
      existingError.includes(translatedError),
    )
  ) {
    return undefined;
  }

  return translatedError;
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
  const protocolError = getProtocolValidationError({
    protocolValidation,
    immediateErrors,
    requestFieldIssues,
    orderForm,
    existingPositionLeverage,
    minimumOrderSize,
  });

  if (protocolError) {
    errors.push(protocolError);
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

const completeValidation = ({
  requestId,
  currentRequestId,
  requestFieldIssues,
  errors,
  warnings,
  protocolValid,
  setValidation,
}: CompleteValidationInput): ValidationAttempt | undefined => {
  if (requestId !== currentRequestId) {
    return undefined;
  }

  const resolvedErrors = errors.length > 0 ? errors : EMPTY_ERRORS;
  const resolvedWarnings = warnings.length > 0 ? warnings : EMPTY_WARNINGS;
  const resolvedProtocolValid = protocolValid ?? resolvedErrors.length === 0;
  const attempt: ValidationAttempt = {
    errors: resolvedErrors,
    warnings: resolvedWarnings,
    fieldIssues: requestFieldIssues,
    isValid: resolvedProtocolValid && requestFieldIssues.length === 0,
  };

  setValidation({
    errors: resolvedErrors,
    warnings: resolvedWarnings,
    protocolValid: resolvedProtocolValid,
    isValidating: false,
  });

  return attempt;
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

      const prerequisiteResult = getValidationPrerequisiteResult({
        assetPrice,
        positionSize,
      });
      if (prerequisiteResult) {
        return completeValidation({
          requestId,
          currentRequestId: validationRequestIdRef.current,
          requestFieldIssues,
          errors: prerequisiteResult.errors,
          warnings: EMPTY_WARNINGS,
          protocolValid: prerequisiteResult.protocolValid,
          setValidation,
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
        if (requestId !== validationRequestIdRef.current) {
          return undefined;
        }
        DevLogger.log(
          'usePerpsOrderValidation: Validation result',
          protocolValidation,
        );

        return completeValidation({
          requestId,
          currentRequestId: validationRequestIdRef.current,
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
          setValidation,
        });
      } catch (error) {
        if (requestId !== validationRequestIdRef.current) {
          return undefined;
        }
        DevLogger.log(
          'usePerpsOrderValidation: Error during validation',
          error,
        );
        return completeValidation({
          requestId,
          currentRequestId: validationRequestIdRef.current,
          requestFieldIssues,
          errors: [strings('perps.order.validation.error')],
          warnings: EMPTY_WARNINGS,
          setValidation,
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
