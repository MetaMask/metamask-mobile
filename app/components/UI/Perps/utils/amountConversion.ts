import { formatPerpsFiat } from '../utils/formatUtils';
import BN from 'bnjs4';
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
 * @param amount - Amount in various formats (USD string, hex wei, or numeric string)
 * @param logger - Optional logger for error reporting
 * @param ethPriceUSD - Current ETH price in USD, required when amount is a hex wei value
 * @returns Formatted USD string using Perps formatting standards
 */
export const convertPerpsAmountToUSD = (
  amount: string,
  logger?: AmountConversionLogger,
  ethPriceUSD?: number,
): string => {
  if (!amount) {
    return formatPerpsFiat(0);
  }

  try {
    // If it's already a USD string (e.g., "$10.32"), extract numeric value
    if (amount.startsWith('$')) {
      const numericValue = parseFloat(amount.replace('$', ''));
      // Preserve decimals for USD amounts
      return formatPerpsFiat(numericValue);
    }

    // Check if it's a hex value (starts with 0x) - treat as wei
    if (amount.startsWith('0x')) {
      const weiBN = new BN(amount, 16);
      const ethBN = weiBN.div(new BN(10).pow(new BN(18)));
      const ethValue = ethBN.toNumber();
      const usdValue = ethValue * (ethPriceUSD ?? 0);
      // Preserve decimals for converted amounts
      return formatPerpsFiat(usdValue);
    }

    // Otherwise, treat as a direct USD amount (e.g., "1.30" = $1.30)
    const numericValue = parseFloat(amount);
    if (!isNaN(numericValue)) {
      // Preserve decimals for numeric USD amounts
      return formatPerpsFiat(numericValue);
    }

    // Invalid input - return formatted zero
    return formatPerpsFiat(0);
  } catch (error) {
    logger?.error(ensureError(error, 'amountConversion.convertAmountToUsd'), {
      context: {
        name: PERPS_CONSTANTS.FeatureName,
        data: { message: `Error converting Perps amount to USD: ${amount}` },
      },
    });
    return formatPerpsFiat(0);
  }
};
