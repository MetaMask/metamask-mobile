import { formatPerpsFiat } from '../utils/formatUtils';
import { ensureError } from '../../../../util/errorUtils';
import { PERPS_CONSTANTS, type PerpsLogger } from '@metamask/perps-controller';

/**
 * Optional logger for amount conversion functions.
 * When provided, enables error logging.
 */
export type AmountConversionLogger = PerpsLogger | undefined;

/**
 * Converts various amount formats to USD display string for Perps
 * Uses existing Perps formatting utilities for consistency
 *
 * @param amount - Amount in various formats (USD string or numeric string)
 * @param logger - Optional logger for error reporting
 * @returns Formatted USD string using Perps formatting standards, or the Core
 * placeholder (`$---`) when the amount is empty or cannot be read
 */
export const convertPerpsAmountToUSD = (
  amount: string,
  logger?: AmountConversionLogger,
): string => {
  if (!amount) {
    return formatPerpsFiat(undefined);
  }

  try {
    // If it's already a USD string (e.g., "$10.32"), extract numeric value
    if (amount.startsWith('$')) {
      const numericValue = parseFloat(amount.replace('$', ''));
      // Preserve decimals for USD amounts
      return formatPerpsFiat(numericValue);
    }

    // Hex wei input is not supported in the Perps flow (all deposits use ERC-20 USDC)
    if (amount.startsWith('0x')) {
      return formatPerpsFiat(undefined);
    }

    // Otherwise, treat as a direct USD amount (e.g., "1.30" = $1.30)
    const numericValue = parseFloat(amount);
    if (!isNaN(numericValue)) {
      // Preserve decimals for numeric USD amounts
      return formatPerpsFiat(numericValue);
    }

    // Invalid input: the amount is unknown
    return formatPerpsFiat(undefined);
  } catch (error) {
    logger?.error(ensureError(error, 'amountConversion.convertAmountToUsd'), {
      context: {
        name: PERPS_CONSTANTS.FeatureName,
        data: { message: `Error converting Perps amount to USD: ${amount}` },
      },
    });
    return formatPerpsFiat(undefined);
  }
};
