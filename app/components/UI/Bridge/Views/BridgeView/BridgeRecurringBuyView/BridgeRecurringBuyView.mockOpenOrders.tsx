import React from 'react';
import { TextColor } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import OpenOrderRow from '../../../components/OpenOrderRow';
import type { OrdersTabConfig } from '../../../components/OrdersTabs';
import type { BridgeToken } from '../../../types';

const MOCK_DEST_TOKEN: BridgeToken = {
  address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  chainId: '0x1',
  decimals: 6,
  symbol: 'USDC',
  name: 'USD Coin',
};

const MOCK_RECURRING_OPEN_ORDER = {
  id: 'mock-recurring-open',
  token: MOCK_DEST_TOKEN,
};

export const MOCK_RECURRING_OPEN_ORDERS = [MOCK_RECURRING_OPEN_ORDER];

type MockRecurringOpenOrder = (typeof MOCK_RECURRING_OPEN_ORDERS)[number];

function renderRecurringOpenOrder(item: MockRecurringOpenOrder) {
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

export const RECURRING_MOCK_OPEN_ORDERS_TAB: OrdersTabConfig<MockRecurringOpenOrder> =
  {
    items: MOCK_RECURRING_OPEN_ORDERS,
    renderItem: renderRecurringOpenOrder,
    keyExtractor: (item) => item.id,
    getItemChainId: (item) => item.token.chainId,
  };
