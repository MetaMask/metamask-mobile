import React from 'react';
import { useSelector } from 'react-redux';
import PredictFeed from '../views/PredictFeed';
import PredictHome from '../views/PredictHome';
import { selectPredictHomeRedesignEnabledFlag } from '../selectors/featureFlags';
import { useRoute, type RouteProp } from '@react-navigation/native';
import type { PredictStackParamList } from '../types/navigation';
import { resolvePinnedMarketListVenue } from '../../PredictNext/navigation/root/laneResolution';
import PredictNextStack from '../../PredictNext/navigation/PredictNextStack';
import { PredictImplementationSwitch } from '../../PredictNext/implementation';

/**
 * MARKET_LIST route component selector.
 *
 * Serves the Active Venue through the implementation switch, so the
 * PredictNext stack gets that Venue; legacy feed and search parameters stay
 * on Polymarket. On the legacy branch it renders the
 * redesigned `PredictHome` shell when `predictHomeRedesign` is enabled,
 * otherwise the existing `PredictFeed`. Kept in its own
 * module (not `routes/index.tsx`) so it can be imported by tests without
 * pulling the full Predict navigation stack.
 */
const PredictMarketListRoute = () => {
  const homeRedesignEnabled = useSelector(selectPredictHomeRedesignEnabledFlag);
  const params =
    useRoute<RouteProp<PredictStackParamList, 'PredictMarketList'>>().params;

  return (
    <PredictImplementationSwitch
      pinnedVenue={resolvePinnedMarketListVenue(params)}
      legacy={homeRedesignEnabled ? <PredictHome /> : <PredictFeed />}
      next={<PredictNextStack />}
      resolving={null}
    />
  );
};

export default PredictMarketListRoute;
