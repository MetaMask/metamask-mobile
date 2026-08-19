import React from 'react';
import { useSelector } from 'react-redux';
import { Box } from '@metamask/design-system-react-native';
import { selectBridgeRecurringBuyFeatureFlags } from '../../../../../../selectors/bridge/featureFlags';
import { BridgeViewSelectorsIDs } from '../BridgeView.testIds';
import RecurringScheduleFields from '../../../components/RecurringScheduleFields';
import OrdersTabs from '../../../components/OrdersTabs';
import { RECURRING_MOCK_OPEN_ORDERS_TAB } from './BridgeRecurringBuyView.mockOpenOrders';

const BridgeRecurringBuyView = () => {
  const enabledChainIds = useSelector(
    selectBridgeRecurringBuyFeatureFlags,
  )?.enabledChainIds;

  return (
    <Box
      twClassName="flex-1 bg-default"
      testID={BridgeViewSelectorsIDs.RECURRING_BUY_CONTAINER}
    >
      <RecurringScheduleFields />
      <OrdersTabs
        enabledChainIds={enabledChainIds}
        openOrders={RECURRING_MOCK_OPEN_ORDERS_TAB}
        history={{ items: [] }}
      />
    </Box>
  );
};

export default BridgeRecurringBuyView;
