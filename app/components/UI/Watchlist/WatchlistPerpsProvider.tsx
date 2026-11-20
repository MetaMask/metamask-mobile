import React from 'react';
import { useSelector } from 'react-redux';
import { selectPerpsEnabledFlag } from '../Perps/selectors/featureFlags';
import { PerpsConnectionProvider } from '../Perps/providers/PerpsConnectionProvider';
import {
  PerpsStreamProvider,
  type PerpsStreamManager,
} from '../Perps/providers/PerpsStreamManager';
import {
  selectTokenWatchlistEnabled,
  selectUnifiedWatchlistEnabled,
} from '../Assets/selectors/featureFlags';
import { TEMPORARY_ENABLE_WATCHLIST_PERPS } from './watchlistFeatureOverrides';

interface WatchlistPerpsProviderProps {
  children: React.ReactNode;
  testStreamManager?: PerpsStreamManager;
}

/**
 * Provides the Perps contexts needed by the full-screen watchlist.
 *
 * The Homepage already owns these providers. The full-screen route is a
 * sibling route, so it needs its own context boundary. Connection polling is
 * disabled when the mixed watchlist rollout is not active.
 */
const WatchlistPerpsProvider = ({
  children,
  testStreamManager,
}: WatchlistPerpsProviderProps) => {
  const isTokenWatchlistEnabled = useSelector(selectTokenWatchlistEnabled);
  const isUnifiedWatchlistEnabled = useSelector(selectUnifiedWatchlistEnabled);
  const isPerpsFeatureEnabled = useSelector(selectPerpsEnabledFlag);
  const isEnabled =
    isTokenWatchlistEnabled &&
    (isUnifiedWatchlistEnabled || TEMPORARY_ENABLE_WATCHLIST_PERPS) &&
    (isPerpsFeatureEnabled || TEMPORARY_ENABLE_WATCHLIST_PERPS);

  return (
    <PerpsConnectionProvider isEnabled={isEnabled} suppressErrorView>
      <PerpsStreamProvider testStreamManager={testStreamManager}>
        {children}
      </PerpsStreamProvider>
    </PerpsConnectionProvider>
  );
};

export default WatchlistPerpsProvider;
