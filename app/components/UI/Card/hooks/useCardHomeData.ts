import { useCallback, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import {
  selectCardHomeData,
  selectCardHomeDataStatus,
} from '../../../../selectors/cardController';
import { toCardTokenAllowance } from '../util/toCardTokenAllowance';
import { getAssetBalanceKey } from '../util/getAssetBalanceKey';
import { useAssetBalances } from './useAssetBalances';
import type { CardAssetWithBalance } from '../types';

export const useCardHomeData = () => {
  const data = useSelector(selectCardHomeData);
  const status = useSelector(selectCardHomeDataStatus);

  // Safety net: if the controller hasn't started a fetch yet (e.g. deep link
  // before KeyringController:unlock fires), kick one off on mount.
  // The controller deduplicates concurrent calls so this is safe to call
  // even when a fetch is already in-flight.
  useEffect(() => {
    if (status === 'idle') {
      Engine.context.CardController.fetchCardHomeData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refetch = useCallback(
    () => Engine.context.CardController.fetchCardHomeData(),
    [],
  );

  // Convert all CardFundingAsset arrays to CardTokenAllowance once.
  // This is the single place where this type bridge occurs.
  const primaryAssetToken = useMemo(
    () => (data?.primaryAsset ? toCardTokenAllowance(data.primaryAsset) : null),
    [data?.primaryAsset],
  );

  const supportedAssetTokens = useMemo(
    () => (data?.supportedTokens ?? []).map(toCardTokenAllowance),
    [data?.supportedTokens],
  );

  const allAssetTokens = useMemo(
    () => (data?.assets ?? []).map(toCardTokenAllowance),
    [data?.assets],
  );

  // One useAssetBalances call covering all known card tokens.
  const allTokensForBalance = useMemo(
    () => [
      ...(primaryAssetToken ? [primaryAssetToken] : []),
      ...supportedAssetTokens,
      ...allAssetTokens,
    ],
    [primaryAssetToken, supportedAssetTokens, allAssetTokens],
  );
  const assetBalancesMap = useAssetBalances(allTokensForBalance);

  // Merge balance info into enriched token objects.
  const primaryAsset = useMemo((): CardAssetWithBalance | null => {
    if (!primaryAssetToken) return null;
    const info = assetBalancesMap.get(getAssetBalanceKey(primaryAssetToken));
    return {
      ...primaryAssetToken,
      asset: info?.asset,
      balanceFiat: info?.balanceFiat ?? '',
      balanceFormatted: info?.balanceFormatted ?? '',
      rawFiatNumber: info?.rawFiatNumber,
      rawTokenBalance: info?.rawTokenBalance,
    };
  }, [primaryAssetToken, assetBalancesMap]);

  const supportedAssets = useMemo(
    (): CardAssetWithBalance[] =>
      supportedAssetTokens.map((token) => {
        const info = assetBalancesMap.get(getAssetBalanceKey(token));
        return {
          ...token,
          asset: info?.asset,
          balanceFiat: info?.balanceFiat ?? '',
          balanceFormatted: info?.balanceFormatted ?? '',
          rawFiatNumber: info?.rawFiatNumber,
          rawTokenBalance: info?.rawTokenBalance,
        };
      }),
    [supportedAssetTokens, assetBalancesMap],
  );

  const assetTokens = useMemo(
    (): CardAssetWithBalance[] =>
      allAssetTokens.map((token) => {
        const info = assetBalancesMap.get(getAssetBalanceKey(token));
        return {
          ...token,
          asset: info?.asset,
          balanceFiat: info?.balanceFiat ?? '',
          balanceFormatted: info?.balanceFormatted ?? '',
          rawFiatNumber: info?.rawFiatNumber,
          rawTokenBalance: info?.rawTokenBalance,
        };
      }),
    [allAssetTokens, assetBalancesMap],
  );

  return {
    data,
    isLoading: status === 'loading' || status === 'idle',
    isError: status === 'error',
    refetch,
    primaryAsset,
    supportedAssets,
    assetTokens,
    assetBalancesMap,
  };
};
