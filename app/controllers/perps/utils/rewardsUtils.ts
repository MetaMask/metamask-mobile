/**
 * Shared rewards utilities for Perps components
 * Handles CAIP account formatting and rewards integration
 *
 * Portable: no mobile-specific imports.
 * Logger is injected as optional parameter for platform-agnostic error reporting.
 */
import {
  toCaipAccountId,
  CaipAccountId,
  parseCaipChainId,
} from '@metamask/utils';
import { ensureError } from './errorUtils';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import { toChecksumHexAddress } from '@metamask/controller-utils';
import type { PerpsLogger } from '../types';

/**
 * Formats an address to CAIP-10 account ID format
 *
 * @param address - The wallet address to format
 * @param chainId - The chain ID (e.g., '1' for mainnet, '42161' for Arbitrum)
 * @param logger - Optional logger for error reporting
 * @returns CAIP-10 formatted account ID or null if formatting fails
 *
 * @example
 * ```typescript
 * const caipId = formatAccountToCaipAccountId('0x123...', '42161');
 * // Returns: 'eip155:42161:0x123...'
 * ```
 */
export const formatAccountToCaipAccountId = (
  address: string,
  chainId: string,
  logger?: PerpsLogger,
): CaipAccountId | null => {
  try {
    const caipChainId = formatChainIdToCaip(chainId);
    const { namespace, reference } = parseCaipChainId(caipChainId);

    // Normalize EVM addresses to checksummed format for consistent CAIP IDs
    let normalizedAddress = address;
    if (namespace === 'eip155') {
      normalizedAddress = toChecksumHexAddress(address);
    }

    return toCaipAccountId(namespace, reference, normalizedAddress);
  } catch (error) {
    logger?.error(
      ensureError(error, 'rewardsUtils.formatAccountToCaipAccountId'),
      {
        context: {
          name: 'rewardsUtils.formatAccountToCaipAccountId',
          data: { address, chainId },
        },
      },
    );
    return null;
  }
};

/**
 * Type guard to check if a value is a valid CAIP account ID
 *
 * @param value - Value to check
 * @returns True if value is a valid CAIP account ID
 */
export const isCaipAccountId = (value: unknown): value is CaipAccountId => {
  if (typeof value !== 'string') return false;

  // CAIP-10 format: namespace:reference:account_address
  const parts = value.split(':');
  return parts.length >= 3 && parts[0] === 'eip155';
};

/**
 * Helper to handle rewards-related errors consistently
 *
 * @param error - The error that occurred
 * @param logger - Optional logger for error reporting
 * @param context - Optional context information
 * @returns A user-friendly error message
 */
export const handleRewardsError = (
  error: unknown,
  logger?: PerpsLogger,
  context?: Record<string, unknown>,
): string => {
  logger?.error(ensureError(error, 'rewardsUtils.handleRewardsError'), {
    context: {
      name: 'rewardsUtils.handleRewardsError',
      data: { additionalContext: context },
    },
  });

  return 'Rewards operation failed';
};
