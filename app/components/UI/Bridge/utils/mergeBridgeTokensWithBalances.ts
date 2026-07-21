import { isNonEvmChainId } from '@metamask/bridge-controller';
import type { CaipAssetType } from '@metamask/utils';

import type { BalancesByAssetId } from '../hooks/useBalancesByAssetId';
import type { BridgeToken } from '../types';

/**
 * Merges wallet balance data into bridge tokens keyed by CAIP asset ID.
 * Used by popular/search results and the watchlist swap picker.
 */
export const mergeBridgeTokensWithBalances = <
  T extends BridgeToken & { assetId?: CaipAssetType },
>(
  tokens: readonly T[],
  balancesByAssetId: BalancesByAssetId | undefined,
): T[] => {
  if (!balancesByAssetId) {
    return [...tokens];
  }

  return tokens.map((token) => {
    if (!token.assetId) {
      return token;
    }

    const normalizedAssetId = isNonEvmChainId(token.chainId)
      ? token.assetId
      : (String(token.assetId).toLowerCase() as CaipAssetType);
    const balanceData = balancesByAssetId[normalizedAssetId];

    if (!balanceData) {
      return token;
    }

    return {
      ...token,
      balance: balanceData.balance,
      balanceFiat: balanceData.balanceFiat ?? token.balanceFiat,
      tokenFiatAmount: balanceData.tokenFiatAmount ?? token.tokenFiatAmount,
      currencyExchangeRate:
        balanceData.currencyExchangeRate ?? token.currencyExchangeRate,
      accountType: balanceData.accountType ?? token.accountType,
    };
  });
};
