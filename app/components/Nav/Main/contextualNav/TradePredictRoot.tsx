import React from 'react';

import { PredictRoot } from '../../../UI/PredictNext';
import TradeFeatureRoot from './TradeFeatureRoot';

/**
 * Predictions opened from anywhere. The trading footer shows when Trade
 * opened it, and it does not list Perps or Predict sub-sections.
 */
const TradePredictRoot = () => (
  <TradeFeatureRoot hub="predictions">
    <PredictRoot />
  </TradeFeatureRoot>
);

export default TradePredictRoot;
