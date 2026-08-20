import React from 'react';
import {
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

const MOCK_LIMIT_VARIANTS = [
  'open',
  'insufficient-gas',
  'filled',
  'expired',
] as const;

export const MOCK_LIMIT_OPEN_ORDERS = MOCK_LIMIT_VARIANTS.map((variant) => ({
  id: `mock-limit-${variant}`,
  token: MOCK_DEST_TOKEN,
  variant,
}));

type MockLimitOpenOrder = (typeof MOCK_LIMIT_OPEN_ORDERS)[number];

function getLimitOpenOrderSlots(
  item: MockLimitOpenOrder,
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

function renderLimitOpenOrder(item: MockLimitOpenOrder) {
  return (
    <OpenOrderRow
      token={item.token}
      title={strings('bridge.limit.pair', {
        source: 'ETH',
        dest: item.token.symbol,
      })}
      {...getLimitOpenOrderSlots(item)}
    />
  );
}

export const LIMIT_MOCK_OPEN_ORDERS_TAB: OrdersTabConfig<MockLimitOpenOrder> = {
  items: MOCK_LIMIT_OPEN_ORDERS,
  renderItem: renderLimitOpenOrder,
  keyExtractor: (item) => item.id,
  getItemChainId: (item) => item.token.chainId,
};
