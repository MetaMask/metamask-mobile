import { toHex } from '@metamask/controller-utils';
import { isNonEvmChainId } from '../../../../core/Multichain/utils';

/**
 * Formats a chain ID for analytics tracking.
 *
 * For non-EVM chains (e.g., Solana), the chain ID is returned as-is.
 * For EVM chains, the chain ID is converted to hex format.
 *
 * @param chainId - The chain ID to format (can be string or number)
 * @returns The formatted chain ID string, or undefined if chainId is falsy
 */
export const formatChainIdForAnalytics = (
  chainId?: string | number,
): string | undefined => {
  if (!chainId) return undefined;

  const chainIdStr = String(chainId);
  return isNonEvmChainId(chainIdStr) ? chainIdStr : toHex(chainId);
};
