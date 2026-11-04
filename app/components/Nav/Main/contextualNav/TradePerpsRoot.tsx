import React from 'react';

import PerpsScreenStack from '../../../UI/Perps/routes';
import TradeFeatureRoot from './TradeFeatureRoot';

/** Perps opened from anywhere. The trading footer shows when Trade opened it. */
const TradePerpsRoot = () => (
  <TradeFeatureRoot hub="perps">
    <PerpsScreenStack />
  </TradeFeatureRoot>
);

export default TradePerpsRoot;
