import React from 'react';
import {
  Box,
  FontWeight,
  Tag,
  TagSeverity,
  TextColor,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { BridgeViewSelectorsIDs } from '../BridgeView.testIds';
import RecurringScheduleFields from '../../../components/RecurringScheduleFields';
import OrdersTabs from '../../../components/OrdersTabs';
import OpenOrderRow from '../../../components/OpenOrderRow';
import type { OpenOrderRowProps } from '../../../components/OpenOrderRow/OpenOrderRow.types';
import type { BridgeToken } from '../../../types';

const MOCK_DEST_TOKEN: BridgeToken = {
  address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  chainId: '0x1',
  decimals: 6,
  symbol: 'USDC',
  name: 'USD Coin',
};

const MOCK_RECURRING_VARIANTS = ['open', 'filled'] as const;

const MOCK_OPEN_ORDERS = MOCK_RECURRING_VARIANTS.map((variant) => ({
  id: `mock-recurring-${variant}`,
  token: MOCK_DEST_TOKEN,
  variant,
}));

function getRecurringOpenOrderSlots(
  item: (typeof MOCK_OPEN_ORDERS)[number],
): Pick<
  OpenOrderRowProps,
  | 'title'
  | 'subtitle'
  | 'primaryValue'
  | 'secondaryValue'
  | 'primaryColor'
  | 'subtitleFontWeight'
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
        subtitleFontWeight: FontWeight.Medium,
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

function renderRecurringOpenOrder(item: (typeof MOCK_OPEN_ORDERS)[number]) {
  return <OpenOrderRow token={item.token} {...getRecurringOpenOrderSlots(item)} />;
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
        getItemChainId: (item) => item.token.chainId,
      }}
      history={{ items: [] }}
    />
  </Box>
);

export default BridgeRecurringBuyView;
