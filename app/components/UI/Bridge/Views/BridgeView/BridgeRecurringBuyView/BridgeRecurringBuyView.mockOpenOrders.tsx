import React from 'react';
import {
  FontWeight,
  Tag,
  TagSeverity,
  TextColor,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import OpenOrderRow from '../../../components/OpenOrderRow';
import type { OpenOrderRowProps } from '../../../components/OpenOrderRow/OpenOrderRow.types';
import type { OrdersTabConfig } from '../../../components/OrdersTabs';
import type { BridgeToken } from '../../../types';

const MOCK_DEST_TOKEN: BridgeToken = {
  address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  chainId: '0x1',
  decimals: 6,
  symbol: 'USDC',
  name: 'USD Coin',
};

const MOCK_RECURRING_VARIANTS = ['open', 'filled'] as const;

export const MOCK_RECURRING_OPEN_ORDERS = MOCK_RECURRING_VARIANTS.map(
  (variant) => ({
    id: `mock-recurring-${variant}`,
    token: MOCK_DEST_TOKEN,
    variant,
  }),
);

type MockRecurringOpenOrder = (typeof MOCK_RECURRING_OPEN_ORDERS)[number];

function getRecurringOpenOrderSlots(
  item: MockRecurringOpenOrder,
): Pick<
  OpenOrderRowProps,
  | 'title'
  | 'subtitle'
  | 'primaryValue'
  | 'secondaryValue'
  | 'primaryColor'
  | 'titleEndAccessory'
> {
  const pair = strings('bridge.recurring.pair', {
    source: 'ETH',
    dest: item.token.symbol,
  });

  switch (item.variant) {
    case 'filled':
      return {
        title: strings('bridge.tabs.recurring'),
        subtitle: pair,
        primaryValue: `+0.325 ${item.token.symbol}`,
        secondaryValue: '-0.1 ETH',
        primaryColor: TextColor.SuccessDefault,
        titleEndAccessory: (
          <Tag severity={TagSeverity.Success}>
            {strings('bridge.recurring.filled')}
          </Tag>
        ),
      };
    case 'open':
      return {
        title: pair,
        subtitle: strings('bridge.recurring.schedule_summary', {
          interval: '1 day',
          count: '5',
        }),
        primaryValue: `+0.325 ${item.token.symbol}`,
        secondaryValue: strings('bridge.recurring.percent_filled', {
          percent: '49',
        }),
        primaryColor: TextColor.SuccessDefault,
      };
  }
}

function renderRecurringOpenOrder(item: MockRecurringOpenOrder) {
  return (
    <OpenOrderRow token={item.token} {...getRecurringOpenOrderSlots(item)} />
  );
}

export const RECURRING_MOCK_OPEN_ORDERS_TAB: OrdersTabConfig<MockRecurringOpenOrder> =
  {
    items: MOCK_RECURRING_OPEN_ORDERS,
    renderItem: renderRecurringOpenOrder,
    keyExtractor: (item) => item.id,
    getItemChainId: (item) => item.token.chainId,
  };
