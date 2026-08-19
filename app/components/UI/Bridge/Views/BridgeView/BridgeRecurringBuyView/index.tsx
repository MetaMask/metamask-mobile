import React from 'react';
import { Box } from '@metamask/design-system-react-native';
import { BridgeViewSelectorsIDs } from '../BridgeView.testIds';
import RecurringScheduleFields from '../../../components/RecurringScheduleFields';
import OrdersTabs from '../../../components/OrdersTabs';

const BridgeRecurringBuyView = () => (
  <Box
    twClassName="flex-1 bg-default"
    testID={BridgeViewSelectorsIDs.RECURRING_BUY_CONTAINER}
  >
    <RecurringScheduleFields />
    <OrdersTabs openOrders={{ items: [] }} history={{ items: [] }} />
  </Box>
);

export default BridgeRecurringBuyView;
