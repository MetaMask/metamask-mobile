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

interface WatchlistPerpsProviderProps {
  children: React.ReactNode;
  testStreamManager?: PerpsStreamManager;
}

/**
 * Supplies Perps contexts to the full-screen watchlist sibling route.
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
    isUnifiedWatchlistEnabled &&
    isPerpsFeatureEnabled;

  return (
    <PerpsConnectionProvider isEnabled={isEnabled} suppressErrorView>
      <PerpsStreamProvider testStreamManager={testStreamManager}>
        {children}
      </PerpsStreamProvider>
    </PerpsConnectionProvider>
  );
};

export default WatchlistPerpsProvider;
