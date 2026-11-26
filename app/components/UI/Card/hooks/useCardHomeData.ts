import { useCallback, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import {
  selectCardHomeData,
  selectCardHomeDataStatus,
  selectCardPrimaryToken,
  selectCardAvailableTokens,
  selectCardFundingTokens,
  selectIsCardAuthenticated,
  selectCardHomeDataFetchedThisSession,
  CARD_HOME_PROTOTYPE_VIEW, // PROTOTYPE-DO-NOT-MERGE
} from '../../../../selectors/cardController';
import { getAssetBalanceKey } from '../util/getAssetBalanceKey';
import { useAssetBalances } from './useAssetBalances';
import { ensureCardFundingTokensImported } from '../util/ensureCardFundingTokensImported';
import { useEnsureCardNetworkExists } from './useEnsureCardNetworkExists';
import type { CardFundingTokenWithBalance } from '../types';
import { useMockCashback } from '../cashbackPanelPrototype'; // PROTOTYPE-DO-NOT-MERGE

export const useCardHomeData = () => {
  const data = useSelector(selectCardHomeData);
  const status = useSelector(selectCardHomeDataStatus);
  const primaryTokenRaw = useSelector(selectCardPrimaryToken);
  const availableTokensRaw = useSelector(selectCardAvailableTokens);
  const fundingTokensRaw = useSelector(selectCardFundingTokens);
  const isCardAuthenticated = useSelector(selectIsCardAuthenticated);
  const fetchedThisSession = useSelector(selectCardHomeDataFetchedThisSession);
  const { ensureNetworkExists } = useEnsureCardNetworkExists();

  // Logged-out cardholders no longer have a dashboard, so there is nothing
  // to fetch until a provider session exists.
  useEffect(() => {
    if (
      isCardAuthenticated &&
      (status === 'idle' || status === 'error' || !fetchedThisSession)
    ) {
      Engine.context.CardController.fetchCardHomeData();
    }
  }, [isCardAuthenticated, status, fetchedThisSession]);

  const refetch = useCallback(() => {
    if (!isCardAuthenticated) {
      return Promise.resolve();
    }
    return Engine.context.CardController.fetchCardHomeData({ force: true });
  }, [isCardAuthenticated]);

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

  useEffect(() => {
    ensureCardFundingTokensImported(
      tokensForBalanceLookup,
      ensureNetworkExists,
    );
  }, [tokensForBalanceLookup, ensureNetworkExists]);

  const balanceMap = useAssetBalances(tokensForBalanceLookup);
  const mockCashback = useMockCashback(); // PROTOTYPE-DO-NOT-MERGE

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
      isUnavailable: info?.isUnavailable,
      // PROTOTYPE-DO-NOT-MERGE: the test wallet is empty, so fake the card balance.
      ...(CARD_HOME_PROTOTYPE_VIEW && CARD_HOME_PROTOTYPE_VIEW !== 'LOADING'
        ? CARD_HOME_PROTOTYPE_VIEW === 'ZERO'
          ? {
              balanceFiat: '$0.00',
              balanceFormatted: '0 USDC',
              rawFiatNumber: 0,
              rawTokenBalance: 0,
              isUnavailable: false,
            } // PROTOTYPE-DO-NOT-MERGE
          : {
              balanceFiat: `$${(125.4 + mockCashback.claimedTotal).toFixed(2)}`,
              balanceFormatted: `${(125.4 + mockCashback.claimedTotal).toFixed(2)} USDC`,
              rawFiatNumber: 125.4 + mockCashback.claimedTotal,
              rawTokenBalance: 125.4 + mockCashback.claimedTotal,
              isUnavailable: false,
            } // PROTOTYPE-DO-NOT-MERGE
        : {}),
    };
  }, [primaryTokenRaw, balanceMap, mockCashback.claimedTotal]); // PROTOTYPE-DO-NOT-MERGE

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
          isUnavailable: info?.isUnavailable,
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
          isUnavailable: info?.isUnavailable,
        };
      }),
    [fundingTokensRaw, balanceMap],
  );

  const hasData = data !== null;

  // Idle with no session never starts a fetch. Treating it as loading left
  // the signed-out identity-review layout on a skeleton instead of the card.
  const isAwaitingHomeData =
    isCardAuthenticated &&
    !hasData &&
    (status === 'loading' || status === 'idle');

  return {
    data,
    isLoading: isAwaitingHomeData,
    isRefreshing: hasData && status === 'loading',
    isError: !hasData && status === 'error',
    refetch,
    primaryToken,
    availableTokens,
    fundingTokens,
    balanceMap,
  };
};
