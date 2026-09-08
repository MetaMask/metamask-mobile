import React from 'react';
import {
  FontWeight,
  Tag,
  TagSeverity,
  TextColor,
} from '@metamask/design-system-react-native';
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

const MOCK_RECURRING_HISTORY_ORDER = {
  id: 'mock-recurring-history-filled',
  token: MOCK_DEST_TOKEN,
};

type MockRecurringHistoryOrder = typeof MOCK_RECURRING_HISTORY_ORDER;

function renderRecurringHistoryOrder(item: MockRecurringHistoryOrder) {
  return (
    <OpenOrderRow
      token={item.token}
      title={strings('bridge.tabs.recurring')}
      subtitle={strings('bridge.recurring.pair', {
        source: 'ETH',
        dest: item.token.symbol,
      })}
      primaryValue={`+0.325 ${item.token.symbol}`}
      secondaryValue="-0.1 ETH"
      primaryColor={TextColor.SuccessDefault}
      titleEndAccessory={
        <Tag severity={TagSeverity.Success}>
          {strings('bridge.recurring.filled')}
        </Tag>
      }
    />
  );
}

export const RECURRING_MOCK_HISTORY_TAB: OrdersTabConfig<MockRecurringHistoryOrder> =
  {
    items: [MOCK_RECURRING_HISTORY_ORDER],
    renderItem: renderRecurringHistoryOrder,
    keyExtractor: (item) => item.id,
    getItemChainId: (item) => item.token.chainId,
  };
