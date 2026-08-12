import React from 'react';
import { useSelector } from 'react-redux';
import PredictFeed from '../views/PredictFeed';
import PredictHome from '../views/PredictHome';
import { selectPredictHomeRedesignEnabledFlag } from '../selectors/featureFlags';
import { useRoute, type RouteProp } from '@react-navigation/native';
import type { PredictStackParamList } from '../types/navigation';
import { selectPredictConfig } from '../../PredictNext/selectors/predictConfig';
import { resolvePredictMarketListLane } from '../root/laneResolution';
import PredictNextStack from '../../PredictNext/navigation/PredictNextStack';

/**
 * MARKET_LIST route component selector.
 *
 * Renders the redesigned `PredictHome` shell when `predictHomeRedesign` is
 * enabled, otherwise falls back to the existing `PredictFeed`. Kept in its own
 * module (not `routes/index.tsx`) so it can be imported by tests without
 * pulling the full Predict navigation stack.
 */
const PredictMarketListRoute = () => {
  const homeRedesignEnabled = useSelector(selectPredictHomeRedesignEnabledFlag);
  const config = useSelector(selectPredictConfig);
  const params =
    useRoute<RouteProp<PredictStackParamList, 'PredictMarketList'>>().params;

  if (resolvePredictMarketListLane(config, params) === 'kalshi') {
    return <PredictNextStack />;
  }
  return homeRedesignEnabled ? <PredictHome /> : <PredictFeed />;
};

export default PredictMarketListRoute;
