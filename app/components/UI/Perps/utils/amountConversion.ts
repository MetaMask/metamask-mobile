import { formatPerpsFiat } from '../utils/formatUtils';
import BN from 'bnjs4';
import { ensureError } from '../../../../util/errorUtils';
import { PERPS_CONSTANTS } from '../constants/perpsConfig';
import type { IPerpsLogger } from '../controllers/types';

/**
 * Optional logger for amount conversion functions.
 * When provided, enables error logging.
 */
export type AmountConversionLogger = IPerpsLogger | undefined;

/**
 * Converts various amount formats to USD display string for Perps
 * Uses existing Perps formatting utilities for consistency
 *
 * @param amount - Amount in various formats (USD string, hex wei, or numeric string)
 * @param logger - Optional logger for error reporting
 * @returns Formatted USD string using Perps formatting standards
 */
export const convertPerpsAmountToUSD = (
  amount: string,
  logger?: AmountConversionLogger,
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

      // For now, use a placeholder ETH price since we don't have real-time price data
      // In a real implementation, this should come from a price feed
      const ethPriceUSD = 2000; // TODO: Replace with actual ETH price from price feed
      const usdValue = ethValue * ethPriceUSD;
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
    logger?.error(ensureError(error), {
      context: {
        name: PERPS_CONSTANTS.FEATURE_NAME,
        data: { message: `Error converting Perps amount to USD: ${amount}` },
      },
    });
    return formatPerpsFiat(0);
  }
};
