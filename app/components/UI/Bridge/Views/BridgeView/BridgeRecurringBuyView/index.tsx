import React from 'react';
import { Box } from '@metamask/design-system-react-native';
import { BridgeViewSelectorsIDs } from '../BridgeView.testIds';

// === ATTENTION ===
//
// Access recurring buy feature flags like this:
//
// const recurringBuyFeatureFlags = useSelector(selectBridgeRecurringBuyFeatureFlags);
//
// ===

const BridgeRecurringBuyView = () => (
  <Box
    twClassName="flex-1 bg-default"
    testID={BridgeViewSelectorsIDs.RECURRING_BUY_CONTAINER}
  />
);

export default BridgeRecurringBuyView;
