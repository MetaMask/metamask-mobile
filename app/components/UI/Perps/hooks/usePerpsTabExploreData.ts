import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { usePerpsMarkets } from './usePerpsMarkets';
import { selectPerpsWatchlistMarkets } from '../selectors/perpsController';
import type {
  PerpsMarketData,
  PerpsNavigationParamList,
} from '../controllers/types';
import Routes from '../../../../constants/navigation/Routes';

const EXPLORE_MARKETS_LIMIT = 8;

interface UsePerpsTabExploreDataOptions {
  /** Skip fetching when user has positions/orders */
  enabled: boolean;
}

interface UsePerpsTabExploreDataResult {
  /** Top 8 crypto + equity markets by volume */
  exploreMarkets: PerpsMarketData[];
  /** Markets in user's watchlist */
  watchlistMarkets: PerpsMarketData[];
  /** Loading state for markets data */
  isLoading: boolean;
  /** Navigate to market details */
  handleMarketPress: (market: PerpsMarketData) => void;
  /** Navigate to market list with "all" filter */
  handleSeeAllMarketsPress: () => void;
}

/**
 * Business logic hook for Perps tab explore data.
 * Used when user has no open positions or orders.
 *
 * Provides:
 * - Top 8 markets by volume (crypto + equity)
 * - Watchlist markets
 * - Navigation handlers
 */
export const usePerpsTabExploreData = ({
  enabled,
}: UsePerpsTabExploreDataOptions): UsePerpsTabExploreDataResult => {
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();

  // Fetch markets (skip when disabled to avoid unnecessary data fetching)
  const { markets, isLoading } = usePerpsMarkets({
    skipInitialFetch: !enabled,
    showZeroVolume: false,
  });

  // Get watchlist symbols from Redux
  const watchlistSymbols = useSelector(selectPerpsWatchlistMarkets);

  // Filter explore markets: crypto + equity, top 8 by volume
  // Markets are already sorted by volume from usePerpsMarkets
  const exploreMarkets = useMemo(() => {
    if (!enabled) return [];
    return markets
      .filter((m) => !m.marketType || m.marketType === 'equity')
      .slice(0, EXPLORE_MARKETS_LIMIT);
  }, [markets, enabled]);

  // Filter watchlist markets
  const watchlistMarkets = useMemo(() => {
    if (!enabled) return [];
    return markets.filter((m) => watchlistSymbols.includes(m.symbol));
  }, [markets, watchlistSymbols, enabled]);

  // Navigate to market details
  const handleMarketPress = useCallback(
    (market: PerpsMarketData) => {
      navigation.navigate(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_DETAILS,
        params: { market },
      });
    },
    [navigation],
  );

  // Navigate to market list with "all" filter
  const handleSeeAllMarketsPress = useCallback(() => {
    navigation.navigate(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.MARKET_LIST,
      params: { defaultMarketTypeFilter: 'all' },
    });
  }, [navigation]);

  return {
    exploreMarkets,
    watchlistMarkets,
    isLoading,
    handleMarketPress,
    handleSeeAllMarketsPress,
  };
};
