import { useCallback } from 'react';
import type { PerpsMarketData } from '@metamask/perps-controller';
import { usePerpsNavigation } from '../../Perps/hooks/usePerpsNavigation';
import { usePerpsWatchlistActions } from '../../Perps/hooks/usePerpsWatchlistActions';

interface UseUnifiedWatchlistPerpsHandlersParams {
  source: string;
  canRefresh: boolean;
  refresh: () => Promise<void>;
}

interface UseUnifiedWatchlistPerpsHandlersResult {
  addPerpToWatchlist: (symbol: string) => Promise<boolean>;
  removePerpFromWatchlist: (symbol: string) => Promise<boolean>;
  handlePerpPress: (market: PerpsMarketData) => void;
  retryHandler: (() => void) | undefined;
}

/**
 * Shared Perps navigation, watchlist mutation, and retry handlers for unified
 * watchlist views.
 */
export const useUnifiedWatchlistPerpsHandlers = ({
  source,
  canRefresh,
  refresh,
}: UseUnifiedWatchlistPerpsHandlersParams): UseUnifiedWatchlistPerpsHandlersResult => {
  const { navigateToMarketDetails } = usePerpsNavigation();
  const {
    addToWatchlist: addPerpToWatchlist,
    removeFromWatchlist: removePerpFromWatchlist,
  } = usePerpsWatchlistActions(source, { showToasts: false });

  const handlePerpPress = useCallback(
    (market: PerpsMarketData) => {
      navigateToMarketDetails(market, source);
    },
    [navigateToMarketDetails, source],
  );

  const retryHandler = canRefresh
    ? (): void => {
        refresh().catch(() => undefined);
      }
    : undefined;

  return {
    addPerpToWatchlist,
    removePerpFromWatchlist,
    handlePerpPress,
    retryHandler,
  };
};
