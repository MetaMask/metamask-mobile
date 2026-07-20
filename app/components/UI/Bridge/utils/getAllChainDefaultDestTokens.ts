import { DefaultSwapDestTokens } from '../constants/default-swap-dest-tokens';
import { BridgeToken } from '../types';
import { getSwapDestToken } from './getSwapDestToken';

/**
 * Returns every chain-wide default destination token across all configured
 * chains (one entry per chain, no per-source overrides). Useful for building
 * curated token lists.
 */
export const getAllChainDefaultDestTokens = (): BridgeToken[] =>
  Object.keys(DefaultSwapDestTokens)
    .map((chainId) => getSwapDestToken(chainId))
    .filter((token): token is BridgeToken => token !== undefined);
