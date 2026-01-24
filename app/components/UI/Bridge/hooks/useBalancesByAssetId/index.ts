import { useMemo } from 'react';
import {
  formatAddressToAssetId,
  isNonEvmChainId,
} from '@metamask/bridge-controller';
import { useTokensWithBalance } from '../useTokensWithBalance';
import { CaipAssetType, CaipChainId, Hex } from '@metamask/utils';
import { BridgeToken } from '../../types';

/**
 * Interface for the balance data stored in the lookup map
 */
export interface BalanceData {
  balance: string;
  balanceFiat?: string;
  tokenFiatAmount?: number;
  currencyExchangeRate?: number;
  accountType?: BridgeToken['accountType'];
}

/**
 * Map of assetId (CAIP format) to balance data for O(1) lookup
 * Example: { "eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": { balance: "0.0004", ... } }
 */
export type BalancesByAssetId = Record<CaipAssetType, BalanceData>;

/**
 * Hook to get balances indexed by assetId (CAIP format) for O(1) lookup
 * @param params - Configuration object containing chainIds
 * @returns Object containing tokens array and map of assetId to balance data
 */
export const useBalancesByAssetId = ({
  chainIds,
}: {
  chainIds: (Hex | CaipChainId)[] | undefined;
}): {
  tokensWithBalance: ReturnType<typeof useTokensWithBalance>;
  balancesByAssetId: BalancesByAssetId;
} => {
  const tokensWithBalance = useTokensWithBalance({ chainIds });

  const balancesByAssetId = useMemo(() => {
    const balancesMap: BalancesByAssetId = {};

    tokensWithBalance.forEach((token) => {
      const assetId = formatAddressToAssetId(token.address, token.chainId);
      if (assetId && token.balance) {
        // Normalize assetId because API returns assetId in lowercase for EVM chains
        const normalizedAssetId = isNonEvmChainId(token.chainId)
          ? assetId
          : (assetId.toLowerCase() as CaipAssetType);
        balancesMap[normalizedAssetId] = {
          balance: token.balance,
          balanceFiat: token.balanceFiat,
          tokenFiatAmount: token.tokenFiatAmount,
          currencyExchangeRate: token.currencyExchangeRate,
          accountType: token.accountType,
        };
      }
    });

    return balancesMap;
  }, [tokensWithBalance]);

  return { tokensWithBalance, balancesByAssetId };
};
