import React from 'react';
import { Box, TextColor } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { BridgeViewSelectorsIDs } from '../BridgeView.testIds';
import RecurringScheduleFields from '../../../components/RecurringScheduleFields';
import OrdersTabs from '../../../components/OrdersTabs';
import OpenOrderRow from '../../../components/OpenOrderRow';
import type { BridgeToken } from '../../../types';

const MOCK_DEST_TOKEN: BridgeToken = {
  address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  chainId: '0x1',
  decimals: 6,
  symbol: 'USDC',
  name: 'USD Coin',
};

const MOCK_OPEN_ORDERS = [{ id: 'mock-recurring-1', token: MOCK_DEST_TOKEN }];

function renderRecurringOpenOrder(item: (typeof MOCK_OPEN_ORDERS)[number]) {
  return (
    <OpenOrderRow
      token={item.token}
      title={strings('bridge.recurring.pair', {
        source: 'ETH',
        dest: item.token.symbol,
      })}
      subtitle={strings('bridge.recurring.schedule_summary', {
        interval: '1 day',
        count: '5',
      })}
      primaryValue={`+0.325 ${item.token.symbol}`}
      secondaryValue={strings('bridge.recurring.percent_filled', {
        percent: '49',
      })}
      primaryColor={TextColor.SuccessDefault}
    />
  );
}

const BridgeRecurringBuyView = () => (
  <Box
    twClassName="flex-1 bg-default"
    testID={BridgeViewSelectorsIDs.RECURRING_BUY_CONTAINER}
  >
    <RecurringScheduleFields />
    <OrdersTabs
      openOrders={{
        items: MOCK_OPEN_ORDERS,
        renderItem: renderRecurringOpenOrder,
        keyExtractor: (item) => item.id,
      }}
      history={{ items: [] }}
    />
  </Box>
);

export default BridgeRecurringBuyView;
