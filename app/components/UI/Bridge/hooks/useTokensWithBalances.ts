import { useMemo } from 'react';
import type { BridgeToken, IncludeAsset, PopularToken } from '../types';
import { BalancesByAssetId } from './useBalancesByAssetId';
import { convertAPITokensToBridgeTokens } from '../utils/tokenUtils';
import { mergeBridgeTokensWithBalances } from '../utils/mergeBridgeTokensWithBalances';
import { isArcUsdcErc20AssetId } from '../../../../enablement/assets/arc';

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

    return mergeBridgeTokensWithBalances(
      convertedTokens,
      balancesByAssetId,
    ).filter((token) => !isArcUsdcErc20AssetId(token.assetId));
  }, [apiTokens, balancesByAssetId]);
