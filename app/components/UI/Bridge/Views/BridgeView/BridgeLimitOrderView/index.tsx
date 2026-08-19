import React from 'react';
import { useSelector } from 'react-redux';
import { Box } from '@metamask/design-system-react-native';
import { selectBridgeLimitOrderFeatureFlags } from '../../../../../../selectors/bridge/featureFlags';
import { BridgeViewSelectorsIDs } from '../BridgeView.testIds';
import OrdersTabs from '../../../components/OrdersTabs';
import { LIMIT_MOCK_OPEN_ORDERS_TAB } from './BridgeLimitOrderView.mockOpenOrders';

const BridgeLimitOrderView = () => {
  const enabledChainIds = useSelector(
    selectBridgeLimitOrderFeatureFlags,
  )?.enabledChainIds;

  return (
    <Box
      twClassName="flex-1 bg-default"
      testID={BridgeViewSelectorsIDs.LIMIT_ORDER_CONTAINER}
    >
      <OrdersTabs
        enabledChainIds={enabledChainIds}
        openOrders={LIMIT_MOCK_OPEN_ORDERS_TAB}
        history={{ items: [] }}
      />
    </Box>
  );
};

export default BridgeLimitOrderView;
