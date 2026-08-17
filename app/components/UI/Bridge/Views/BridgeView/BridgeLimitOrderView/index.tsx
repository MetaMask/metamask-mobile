import React from 'react';
import { Box } from '@metamask/design-system-react-native';
import { BridgeViewSelectorsIDs } from '../BridgeView.testIds';

const BridgeLimitOrderView = () => (
  <Box
    twClassName="flex-1 bg-default"
    testID={BridgeViewSelectorsIDs.LIMIT_ORDER_CONTAINER}
  />
);

export default BridgeLimitOrderView;
