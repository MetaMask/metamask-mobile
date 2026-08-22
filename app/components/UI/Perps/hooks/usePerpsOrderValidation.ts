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
  /**
   * When true, the caller renders its own funding message for the selected
   * payment method, so the generic balance error is kept out of `errors`
   * instead of being shown a second time. The order still reports as invalid.
   */
  skipBalanceError?: boolean;
}

interface ValidationState {
  errors: string[];
  warnings: string[];
  protocolValid: boolean;
  isValidating: boolean;
  hasSuppressedBalanceError: boolean;
  /**
   * Generic balance-error string last written into `errors`. Kept so a later
   * `skipBalanceError` flip can drop it from the returned list before the
   * debounced validation run finishes.
   */
  balanceError?: string;
}

export interface ValidationResult {
  errors: string[];
  warnings: string[];
  fieldIssues: OrderFormFieldIssue[];
  isValid: boolean;
  isValidating: boolean;
  /**
   * True when `skipBalanceError` withheld the balance message. The order is
   * invalid with no message to show for it, so the caller must supply its own.
   */
  hasSuppressedBalanceError: boolean;
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
    skipBalanceError,
  } = params;

  const { validateOrder } = usePerpsTrading();
  const network = usePerpsNetwork();

  const [validation, setValidation] = useState<ValidationState>({
    errors: EMPTY_ERRORS,
    warnings: EMPTY_WARNINGS,
    protocolValid: false,
    isValidating: false, // Start with false to prevent initial flickering
    hasSuppressedBalanceError: false,
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

  const performValidation = useCallback(
    async (requestId: number, requestFieldIssues: OrderFormFieldIssue[]) => {
      if (requestId !== validationRequestIdRef.current) {
        return;
      }

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
      const isBalanceInsufficient = requiredMargin > spendableBalance;
      const balanceError = isBalanceInsufficient
        ? strings('perps.order.validation.insufficient_balance', {
            required: marginRequired,
            available: spendableBalance.toString(),
          })
        : undefined;
      if (balanceError && !skipBalanceError) {
        immediateErrors.push(balanceError);
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
          return;
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

        const warnings: string[] = [];

        // High leverage warning
        if (orderForm.leverage > VALIDATION_THRESHOLDS.HighLeverageWarning) {
          warnings.push(
            strings('perps.order.validation.high_leverage_warning'),
          );
        }

        setValidation({
          errors: errors.length > 0 ? errors : EMPTY_ERRORS,
          warnings: warnings.length > 0 ? warnings : EMPTY_WARNINGS,
          // A suppressed balance error still blocks the order; only its message
          // is left to the caller's own funding message.
          protocolValid: errors.length === 0 && !isBalanceInsufficient,
          isValidating: false,
          hasSuppressedBalanceError:
            isBalanceInsufficient && !!skipBalanceError,
          balanceError: skipBalanceError ? undefined : balanceError,
        });
      } catch (error) {
        if (requestId !== validationRequestIdRef.current) {
          return;
        }
        DevLogger.log(
          'usePerpsOrderValidation: Error during validation',
          error,
        );
        setValidation({
          errors: [strings('perps.order.validation.error')],
          warnings: EMPTY_WARNINGS,
          protocolValid: false,
          isValidating: false,
          hasSuppressedBalanceError: false,
          balanceError: undefined,
        });
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
      skipBalanceError,
      spendableBalance,
      szDecimals,
      triggerPrice,
      validateOrder,
    ],
  );

  useEffect(() => {
    const requestId = ++validationRequestIdRef.current;

    // Synchronous field validation is derived during render. Only the
    // asynchronous validation status belongs in state.
    setValidation((prev) => ({
      ...prev,
      isValidating: !skipValidation,
    }));

    // Skip protocol validation during keypad input to prevent flickering.
    if (skipValidation) {
      return;
    }

    // Skip validation if critical data is missing
    const numericPositionSize = Number.parseFloat(positionSize);
    if (!Number.isFinite(numericPositionSize) || numericPositionSize <= 0) {
      setValidation((prev) => ({
        ...prev,
        errors: EMPTY_ERRORS,
        isValidating: false,
        protocolValid: false,
        // Nothing was suppressed here: the order is blocked on size, not funds.
        hasSuppressedBalanceError: false,
        balanceError: undefined,
      }));
      return;
    }

    if (assetPrice === 0) {
      setValidation((prev) => ({
        ...prev,
        isValidating: false,
        // Keep existing errors but mark as invalid
        protocolValid: false,
      }));
      return;
    }

    // Clear existing timer
    if (validationTimerRef.current) {
      clearTimeout(validationTimerRef.current);
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
      if (validationTimerRef.current) {
        clearTimeout(validationTimerRef.current);
      }
    };
  }, [
    assetPrice,
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

  // Return validation with stable array references
  return {
    errors:
      skipBalanceError && validation.balanceError
        ? stableErrors.filter((error) => error !== validation.balanceError)
        : stableErrors,
    warnings: stableWarnings,
    fieldIssues,
    isValid: validation.protocolValid && fieldIssues.length === 0,
    isValidating: validation.isValidating,
    hasSuppressedBalanceError: validation.hasSuppressedBalanceError,
  };
}
