/**
 * Shared rewards utilities for Perps components
 * Handles CAIP account formatting and rewards integration
 */
import {
  toCaipAccountId,
  CaipAccountId,
  parseCaipChainId,
} from '@metamask/utils';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import Logger from '../../../../util/Logger';

/**
 * Formats an address to CAIP-10 account ID format
 *
 * @param address - The wallet address to format
 * @param chainId - The chain ID (e.g., '1' for mainnet, '42161' for Arbitrum)
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
): CaipAccountId | null => {
  try {
    const caipChainId = formatChainIdToCaip(chainId);
    const { namespace, reference } = parseCaipChainId(caipChainId);
    return toCaipAccountId(namespace, reference, address);
  } catch (error) {
    Logger.error(error as Error, {
      message: 'Rewards: Failed to format CAIP Account ID',
      context: 'rewardsUtils.formatAccountToCaipAccountId',
      address,
      chainId,
    });
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
 * @param context - Optional context information
 * @returns A user-friendly error message
 */
export const handleRewardsError = (
  error: unknown,
  context?: Record<string, unknown>,
): string => {
  Logger.error(error as Error, {
    message: 'Rewards: Error occurred',
    context: 'rewardsUtils.handleRewardsError',
    additionalContext: context,
  });

  return 'Rewards operation failed';
};
