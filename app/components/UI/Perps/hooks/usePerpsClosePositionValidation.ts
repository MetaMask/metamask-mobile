import { useEffect, useState } from 'react';
import { strings } from '../../../../../locales/i18n';
import type { OrderType, ClosePositionParams } from '../controllers/types';
import { usePerpsTrading } from './usePerpsTrading';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';

interface UsePerpsClosePositionValidationParams {
  coin: string;
  closePercentage: number;
  closeAmount: string;
  orderType: OrderType;
  limitPrice?: string;
  currentPrice: number;
  positionSize: number; // Absolute size of the position
  positionValue: number; // Total position value in USD
  minimumOrderAmount: number; // Minimum order size in USD
  closingValue: number; // Value being closed in USD
  remainingPositionValue: number; // Value remaining after close
  receiveAmount: number; // Amount user will receive after fees
  isPartialClose: boolean;
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
 */
export function usePerpsClosePositionValidation(
  params: UsePerpsClosePositionValidationParams,
): ValidationResult {
  const {
    coin,
    closePercentage,
    closeAmount,
    orderType,
    limitPrice,
    currentPrice,
    minimumOrderAmount,
    closingValue,
    remainingPositionValue,
    receiveAmount,
    isPartialClose,
  } = params;

  const { validateClosePosition } = usePerpsTrading();

  const [validation, setValidation] = useState<ValidationResult>({
    errors: [],
    warnings: [],
    isValid: false,
    isValidating: true,
  });

  useEffect(() => {
    // Skip validation if critical data is missing
    if (!coin || currentPrice === 0) {
      setValidation({
        errors: [],
        warnings: [],
        isValid: false,
        isValidating: false,
      });
      return;
    }

    const performValidation = async () => {
      setValidation((prev) => ({ ...prev, isValidating: true }));

      try {
        // Prepare params for protocol validation
        const closeParams: ClosePositionParams = {
          coin,
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
        const errors: string[] = protocolValidation.isValid
          ? []
          : protocolValidation.error
          ? [protocolValidation.error]
          : [];
        const warnings: string[] = [];

        // UI-specific validations that don't belong in the provider

        // Check partial close constraints
        if (closePercentage > 0 && closePercentage < 100) {
          // For any partial close, ensure remaining position meets minimum
          if (remainingPositionValue < minimumOrderAmount) {
            errors.push(
              strings('perps.close_position.minimum_remaining_error', {
                minimum: minimumOrderAmount.toString(),
                remaining: remainingPositionValue.toFixed(2),
              }),
            );
          }
        } else if (closePercentage === 100) {
          // For full closes, check if the close order value meets minimum
          if (closingValue > 0 && closingValue < minimumOrderAmount) {
            errors.push(
              strings('perps.order.validation.minimum_amount', {
                amount: minimumOrderAmount.toString(),
              }),
            );
          }
        }

        // Check if user will receive a positive amount after fees
        if (receiveAmount <= 0) {
          errors.push(strings('perps.close_position.negative_receive_amount'));
        }

        // Limit order specific validation
        if (orderType === 'limit') {
          if (!limitPrice || parseFloat(limitPrice) <= 0) {
            errors.push(strings('perps.order.validation.limit_price_required'));
          } else {
            const limitPriceNum = parseFloat(limitPrice);
            // Add warning if limit price is far from current price
            const priceDifference = Math.abs(
              (limitPriceNum - currentPrice) / currentPrice,
            );
            if (priceDifference > 0.1) {
              // More than 10% difference
              warnings.push(
                strings('perps.order.validation.limit_price_far_warning'),
              );
            }
          }
        }

        // Market order validation
        if (orderType === 'market' && closePercentage === 0) {
          errors.push(strings('perps.close_position.no_amount_selected'));
        }

        // Add warning for very small partial closes
        if (isPartialClose && closePercentage < 10) {
          warnings.push(
            strings('perps.close_position.small_close_warning', {
              percentage: closePercentage.toString(),
            }),
          );
        }

        setValidation({
          errors,
          warnings,
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
    };

    performValidation();
  }, [
    coin,
    closePercentage,
    closeAmount,
    orderType,
    limitPrice,
    currentPrice,
    minimumOrderAmount,
    closingValue,
    remainingPositionValue,
    receiveAmount,
    isPartialClose,
    validateClosePosition,
  ]);

  return validation;
}
