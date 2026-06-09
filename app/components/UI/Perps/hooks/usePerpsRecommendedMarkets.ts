import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PerpsMarketData } from '@metamask/perps-controller';
import { selectPerpsWatchlistMarkets } from '../selectors/perpsController';
import { HOME_SCREEN_CONFIG } from '../constants/perpsConfig';

const DISMISSED_RECOMMENDATIONS_KEY = '@perps/dismissedRecommendations';

interface UsePerpsRecommendedMarketsReturn {
  recommendedMarkets: PerpsMarketData[];
  hasUserDismissed: boolean;
  dismissMarket: (symbol: string) => void;
  addToWatchlist: (symbol: string) => void;
}

/**
 * Provides volume-ranked market recommendations for users with an empty watchlist.
 *
 * Recommendations are the top N markets by 24h volume, excluding any that are
 * already watchlisted. Once the user dismisses (swipes away) any single
 * recommendation, the entire recommendation section is hidden permanently
 * (per spec: "keep recommending until user rejects a suggested market").
 *
 * @param allMarkets - Pre-sorted (volume desc) market data from usePerpsMarkets
 * @param onToggleWatchlist - Callback to add a market to the watchlist
 */
export const usePerpsRecommendedMarkets = (
  allMarkets: PerpsMarketData[],
  onToggleWatchlist: (symbol: string) => void,
): UsePerpsRecommendedMarketsReturn => {
  const watchlistSymbols = useSelector(selectPerpsWatchlistMarkets);
  const [hasUserDismissed, setHasUserDismissed] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(DISMISSED_RECOMMENDATIONS_KEY)
      .then((value) => {
        if (value === 'true') {
          setHasUserDismissed(true);
        }
      })
      .catch(() => {
        // Silently fail — default to showing recommendations
      })
      .finally(() => setIsLoaded(true));
  }, []);

  const dismissMarket = useCallback((_symbol: string) => {
    setHasUserDismissed(true);
    AsyncStorage.setItem(DISMISSED_RECOMMENDATIONS_KEY, 'true').catch(
      () => undefined,
    );
  }, []);

  const addToWatchlist = useCallback(
    (symbol: string) => {
      onToggleWatchlist(symbol);
    },
    [onToggleWatchlist],
  );

  const recommendedMarkets = useMemo(() => {
    if (hasUserDismissed || !isLoaded) {
      return [];
    }

    const watchlistSet = new Set(watchlistSymbols);
    return allMarkets
      .filter((market) => !watchlistSet.has(market.symbol))
      .slice(0, HOME_SCREEN_CONFIG.RecommendedMarketsLimit);
  }, [allMarkets, watchlistSymbols, hasUserDismissed, isLoaded]);

  return {
    recommendedMarkets,
    hasUserDismissed,
    dismissMarket,
    addToWatchlist,
  };
};
