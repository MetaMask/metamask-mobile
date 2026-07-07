import React from 'react';
import { useSelector } from 'react-redux';
import PredictFeed from '../views/PredictFeed';
import PredictHome from '../views/PredictHome';
import { selectPredictHomeRedesignEnabledFlag } from '../selectors/featureFlags';

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

  return homeRedesignEnabled ? <PredictHome /> : <PredictFeed />;
};

export default PredictMarketListRoute;
