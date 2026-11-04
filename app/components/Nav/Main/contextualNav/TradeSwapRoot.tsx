import React from 'react';

import { BridgeScreenStack } from '../../../UI/Bridge/routes';
import TradeFeatureRoot from './TradeFeatureRoot';

/** Swap opened from anywhere. The trading footer shows when Trade opened it. */
const TradeSwapRoot = () => (
  <TradeFeatureRoot hub="swap">
    <BridgeScreenStack />
  </TradeFeatureRoot>
);

export default TradeSwapRoot;
