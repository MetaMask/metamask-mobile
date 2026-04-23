import { useCallback, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import {
  selectCardHomeData,
  selectCardHomeDataStatus,
  selectCardPrimaryToken,
  selectCardAvailableTokens,
  selectCardFundingTokens,
} from '../../../../selectors/cardController';
import { getAssetBalanceKey } from '../util/getAssetBalanceKey';
import { useAssetBalances } from './useAssetBalances';
import type { CardFundingTokenWithBalance } from '../types';

export const useCardHomeData = () => {
  const data = useSelector(selectCardHomeData);
  const status = useSelector(selectCardHomeDataStatus);
  const primaryTokenRaw = useSelector(selectCardPrimaryToken);
  const availableTokensRaw = useSelector(selectCardAvailableTokens);
  const fundingTokensRaw = useSelector(selectCardFundingTokens);

  // Safety net: if the controller hasn't started a fetch yet (e.g. deep link
  // before KeyringController:unlock fires), kick one off on mount.
  // The controller deduplicates concurrent calls so this is safe to call
  // even when a fetch is already in-flight.
  useEffect(() => {
    if (status === 'idle') {
      Engine.context.CardController.fetchCardHomeData();
    }
    // eslint-disable-next-line react-compiler/react-compiler
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refetch = useCallback(
    () => Engine.context.CardController.fetchCardHomeData(),
    [],
  );

  // One useAssetBalances call covering all known card tokens, deduplicated by key.
  const tokensForBalanceLookup = useMemo(() => {
    const seen = new Set<string>();
    return [
      ...(primaryTokenRaw ? [primaryTokenRaw] : []),
      ...availableTokensRaw,
      ...fundingTokensRaw,
    ].filter((token) => {
      const key = getAssetBalanceKey(token);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [primaryTokenRaw, availableTokensRaw, fundingTokensRaw]);
  const balanceMap = useAssetBalances(tokensForBalanceLookup);

  // Merge balance info into enriched token objects.
  const primaryToken = useMemo((): CardFundingTokenWithBalance | null => {
    if (!primaryTokenRaw) return null;
    const info = balanceMap.get(getAssetBalanceKey(primaryTokenRaw));
    return {
      ...primaryTokenRaw,
      asset: info?.asset,
      balanceFiat: info?.balanceFiat,
      balanceFormatted: info?.balanceFormatted,
      rawFiatNumber: info?.rawFiatNumber,
      rawTokenBalance: info?.rawTokenBalance,
    };
  }, [primaryTokenRaw, balanceMap]);

  const availableTokens = useMemo(
    (): CardFundingTokenWithBalance[] =>
      availableTokensRaw.map((token) => {
        const info = balanceMap.get(getAssetBalanceKey(token));
        return {
          ...token,
          asset: info?.asset,
          balanceFiat: info?.balanceFiat,
          balanceFormatted: info?.balanceFormatted,
          rawFiatNumber: info?.rawFiatNumber,
          rawTokenBalance: info?.rawTokenBalance,
        };
      }),
    [availableTokensRaw, balanceMap],
  );

  const fundingTokens = useMemo(
    (): CardFundingTokenWithBalance[] =>
      fundingTokensRaw.map((token) => {
        const info = balanceMap.get(getAssetBalanceKey(token));
        return {
          ...token,
          asset: info?.asset,
          balanceFiat: info?.balanceFiat,
          balanceFormatted: info?.balanceFormatted,
          rawFiatNumber: info?.rawFiatNumber,
          rawTokenBalance: info?.rawTokenBalance,
        };
      }),
    [fundingTokensRaw, balanceMap],
  );

  return {
    data,
    isLoading: status === 'loading' || status === 'idle',
    isError: status === 'error',
    refetch,
    primaryToken,
    availableTokens,
    fundingTokens,
    balanceMap,
  };
};
