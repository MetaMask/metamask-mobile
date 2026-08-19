import React from 'react';
import { Box } from '@metamask/design-system-react-native';
import { BridgeViewSelectorsIDs } from '../BridgeView.testIds';
import RecurringScheduleFields from '../../../components/RecurringScheduleFields';

const BridgeRecurringBuyView = () => (
  <Box
    twClassName="flex-1 bg-default"
    testID={BridgeViewSelectorsIDs.RECURRING_BUY_CONTAINER}
  >
    <RecurringScheduleFields />
  </Box>
);

export default BridgeRecurringBuyView;
