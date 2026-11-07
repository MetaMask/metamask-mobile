import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { V6BalanceItem } from '@metamask/core-backend';
import { useSelector } from 'react-redux';
import { apiClient } from '../../../../../core/apiClient';
import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';
import { selectSelectedAccountGroupInternalAccounts } from '../../../../../selectors/multichainAccounts/accountTreeController';
import { selectSelectedInternalAccountByScope } from '../../../../../selectors/multichainAccounts/accounts';
import {
  getAssetPreferences,
  getAssetsBalance,
  getAssetsInfo,
  getCustomAssets,
} from '../../../../../selectors/assets/assets-controller';
import { selectMultichainAssetsAllIgnoredAssets } from '../../../../../selectors/multichain/multichain';
import { selectNetworkConfigurationsByCaipChainId } from '../../../../../selectors/networkController';
import useAssetVisibility from '../../../../UI/TokenDetails/components/useAssetVisibility';
import {
  buildCaip10AccountIds,
  classifyOwnedBalances,
  importOwnedTokens,
  indexWalletTokens,
  type ClassifiedOwnedToken,
  type OwnedTokenAccount,
} from './ownedTokenModel';

const OWNED_TOKENS_STALE_TIME_MS = 60_000;

async function fetchAllOwnedBalances(
  accounts: readonly OwnedTokenAccount[],
  chainIds: readonly string[],
): Promise<V6BalanceItem[]> {
  const accountIds = buildCaip10AccountIds(accounts, chainIds);
  if (accountIds.length === 0) {
    return [];
  }

  // filterSupportedTokens=false keeps balances the token list would drop,
  // including contracts detection chose not to surface.
  const response = await apiClient.accounts.fetchV6MultiAccountBalances(
    accountIds,
    {
      filterSupportedTokens: false,
      includeDeFiBalances: false,
      includePrices: true,
    },
  );
  return response.balances ?? [];
}

export function useOwnedTokens() {
  const accounts = useSelector(selectSelectedAccountGroupInternalAccounts);
  const networkConfigurations = useSelector(
    selectNetworkConfigurationsByCaipChainId,
  );
  const customAssets = useSelector(getCustomAssets);
  const assetsBalance = useSelector(getAssetsBalance);
  const assetPreferences = useSelector(getAssetPreferences);
  const assetsInfo = useSelector(getAssetsInfo);
  const ignoredAssetsByAccount = useSelector(
    selectMultichainAssetsAllIgnoredAssets,
  );
  const accountByScope = useSelector(selectSelectedInternalAccountByScope);
  const { handleAddCustomAsset } = useAssetVisibility();

  const accountKey = accounts.map((account) => account.id).join(',');
  const chainIds = useMemo(
    () => Object.keys(networkConfigurations).sort(),
    [networkConfigurations],
  );
  const queryAccounts = useMemo<OwnedTokenAccount[]>(
    () =>
      accounts.map((account) => ({
        address: account.address,
        scopes: account.scopes,
      })),
    [accounts],
  );

  const query = useQuery({
    queryKey: ['import-owned-tokens', accountKey, chainIds.join(',')],
    queryFn: () => fetchAllOwnedBalances(queryAccounts, chainIds),
    enabled: queryAccounts.length > 0 && chainIds.length > 0,
    staleTime: OWNED_TOKENS_STALE_TIME_MS,
  });

  const knownImageByAssetId = useMemo(() => {
    const images = new Map<string, string>();
    Object.entries(assetsInfo).forEach(([assetId, info]) => {
      if (!info.image) {
        return;
      }
      images.set(assetId, info.image);
      images.set(assetId.toLowerCase(), info.image);
    });
    return images;
  }, [assetsInfo]);

  const tokens = useMemo(() => {
    const ignoredAssetIds = Object.values(ignoredAssetsByAccount ?? {}).flat();
    const index = indexWalletTokens({
      customAssets,
      assetsBalance,
      assetsInfo,
      assetPreferences,
      ignoredAssetIds,
    });
    return classifyOwnedBalances(query.data ?? [], index).map((token) => {
      const knownImage =
        knownImageByAssetId.get(token.assetId) ??
        knownImageByAssetId.get(token.assetId.toLowerCase());
      return knownImage ? { ...token, imageUrl: knownImage } : token;
    });
  }, [
    customAssets,
    assetsBalance,
    assetsInfo,
    assetPreferences,
    ignoredAssetsByAccount,
    knownImageByAssetId,
    query.data,
  ]);

  const addTokens = useCallback(
    async (selected: readonly ClassifiedOwnedToken[]) => {
      const result = await importOwnedTokens(selected, {
        unhideAsset: (assetId) =>
          Engine.context.AssetsController.unhideAsset(assetId),
        addCustomAsset: handleAddCustomAsset,
        accountForChain: accountByScope,
      });
      if (result.failed > 0) {
        Logger.error(
          new Error(`Failed to add ${result.failed} owned tokens`),
          'OwnedTokens: import failed',
        );
      }
      return result;
    },
    [accountByScope, handleAddCustomAsset],
  );

  return {
    tokens,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    addTokens,
  };
}
