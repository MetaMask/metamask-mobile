import type { BridgeToken } from '../../../../../UI/Bridge/types';

/**
 * Stable identity for a token across the QuickBuy token pickers: the
 * lower-cased address joined with its chain id (`address:chainId`). Shared by
 * both the "Pay with" (buy) and "Receive" (sell) flows so row keys and
 * selection comparisons behave identically.
 */
export const getTokenKey = (
  token: Pick<BridgeToken, 'address' | 'chainId'>,
): string => `${token.address.toLowerCase()}:${token.chainId}`;
