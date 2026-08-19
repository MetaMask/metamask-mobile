import React from 'react';
import {
  Box,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Tag,
  TagSeverity,
  TextColor,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { BridgeViewSelectorsIDs } from '../BridgeView.testIds';
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

const MOCK_LIMIT_VARIANTS = [
  'open',
  'insufficient-gas',
  'filled',
  'expired',
] as const;

const MOCK_OPEN_ORDERS = MOCK_LIMIT_VARIANTS.map((variant) => ({
  id: `mock-limit-${variant}`,
  token: MOCK_DEST_TOKEN,
  variant,
}));

function getLimitOpenOrderSlots(
  item: (typeof MOCK_OPEN_ORDERS)[number],
): Pick<
  OpenOrderRowProps,
  | 'subtitle'
  | 'primaryValue'
  | 'secondaryValue'
  | 'primaryColor'
  | 'titleColor'
  | 'subtitleColor'
  | 'titleEndAccessory'
> {
  const limitPrice = strings('bridge.limit.limit_price', {
    symbol: item.token.symbol,
  });

  switch (item.variant) {
    case 'insufficient-gas':
      return {
        subtitle: strings('bridge.limit.not_enough_gas'),
        primaryValue: '$208.99',
        secondaryValue: limitPrice,
        titleColor: TextColor.WarningDefault,
        subtitleColor: TextColor.WarningDefault,
        titleEndAccessory: (
          <Icon
            name={IconName.Warning}
            color={IconColor.WarningDefault}
            size={IconSize.Sm}
          />
        ),
      };
    case 'filled':
      return {
        subtitle: strings('bridge.limit.filled_at', { date: 'Mar 12' }),
        primaryValue: `+0.325 ${item.token.symbol}`,
        secondaryValue: '-0.1 ETH',
        primaryColor: TextColor.SuccessDefault,
        titleEndAccessory: (
          <Tag severity={TagSeverity.Success}>
            {strings('bridge.limit.filled')}
          </Tag>
        ),
      };
    case 'expired':
      return {
        subtitle: strings('bridge.limit.expired_after', { duration: 'X' }),
        primaryValue: '$208.99',
        secondaryValue: limitPrice,
        titleEndAccessory: (
          <Tag severity={TagSeverity.Neutral}>
            {strings('bridge.limit.expired')}
          </Tag>
        ),
      };
    case 'open':
      return {
        subtitle: strings('bridge.limit.expiry', { timeLeft: '4d left' }),
        primaryValue: '$208.99',
        secondaryValue: limitPrice,
      };
  }
}

function renderLimitOpenOrder(item: (typeof MOCK_OPEN_ORDERS)[number]) {
  return (
    <OpenOrderRow
      token={item.token}
      title={strings('bridge.limit.pair', {
        source: 'ETH',
        dest: item.token.symbol,
      })}
      subtitleFontWeight={FontWeight.Medium}
      {...getLimitOpenOrderSlots(item)}
    />
  );
}

const BridgeLimitOrderView = () => (
  <Box
    twClassName="flex-1 bg-default"
    testID={BridgeViewSelectorsIDs.LIMIT_ORDER_CONTAINER}
  >
    <OrdersTabs
      openOrders={{
        items: MOCK_OPEN_ORDERS,
        renderItem: renderLimitOpenOrder,
        keyExtractor: (item) => item.id,
      }}
      history={{ items: [] }}
    />
  </Box>
);

export default BridgeLimitOrderView;
