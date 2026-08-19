import React from 'react';
import { Box } from '@metamask/design-system-react-native';
import { BridgeViewSelectorsIDs } from '../BridgeView.testIds';
import OrdersTabs from '../../../components/OrdersTabs';

const BridgeLimitOrderView = () => (
  <Box
    twClassName="flex-1 bg-default"
    testID={BridgeViewSelectorsIDs.LIMIT_ORDER_CONTAINER}
  >
    <OrdersTabs openOrders={{ items: [] }} history={{ items: [] }} />
  </Box>
);

export default BridgeLimitOrderView;
