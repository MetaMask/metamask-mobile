import { useMemo } from 'react';
import { CaipAssetType } from '@metamask/utils';
import { isNonEvmChainId } from '@metamask/bridge-controller';
import type { BridgeToken, IncludeAsset, PopularToken } from '../types';
import { BalancesByAssetId } from './useBalancesByAssetId';
import { convertAPITokensToBridgeTokens } from '../utils/tokenUtils';
import { ARC_NATIVE_ASSET_ID } from '../../../hooks/useArcDefaultTokens';

/**
 * Merges API tokens with balance data from the selector
 * @param apiTokens - Tokens from the API (popular or search results)
 * @param balancesByAssetId - Balance data indexed by assetId
 * @returns Tokens with merged balance information
 */
export const useTokensWithBalances = (
  apiTokens: (PopularToken | IncludeAsset)[] | null | undefined,
  balancesByAssetId: BalancesByAssetId,
): BridgeToken[] =>
  useMemo(() => {
    const convertedTokens = convertAPITokensToBridgeTokens(apiTokens);

    return convertedTokens
      .map((token) => {
        // Normalize assetId because API returns assetId in lowercase for EVM chains
        const normalizedAssetId = isNonEvmChainId(token.chainId)
          ? token.assetId
          : (token.assetId?.toLowerCase() as CaipAssetType);
        const balanceData = balancesByAssetId[normalizedAssetId];
        if (balanceData) {
          return {
            ...token,
            balance: balanceData.balance,
            balanceFiat: balanceData.balanceFiat,
            tokenFiatAmount: balanceData.tokenFiatAmount,
            currencyExchangeRate: balanceData.currencyExchangeRate,
            accountType: balanceData.accountType,
          };
        }
        return token;
      })
      .filter((token) => token.assetId !== ARC_NATIVE_ASSET_ID);
  }, [apiTokens, balancesByAssetId]);
