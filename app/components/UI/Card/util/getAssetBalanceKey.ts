import type { CardFundingToken } from '../types';

/**
 * Returns the map key used to look up a token's balance in the map returned
 * by useAssetBalances. Centralised here so the key format is defined once.
 */
export function getAssetBalanceKey(
  token: Pick<CardFundingToken, 'address' | 'caipChainId' | 'walletAddress'>,
): string {
  return `${token.address?.toLowerCase()}-${token.caipChainId}-${token.walletAddress?.toLowerCase()}`;
}
