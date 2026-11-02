import React from 'react';
import OrderListItem from './OrderListItem';
import { FiatOrder } from '../../../../../../reducers/fiatOrders';
import renderWithProvider, {
  DeepPartial,
} from '../../../../../../util/test/renderWithProvider';
import {
  FIAT_ORDER_PROVIDERS,
  FIAT_ORDER_STATES,
} from '../../../../../../constants/on-ramp';
import { DepositOrderType } from '../../../types/legacyDeposit';
import { strings } from '../../../../../../../locales/i18n';

const testOrders: DeepPartial<FiatOrder>[] = [
  {
    cryptoAmount: '12.3456789120',
    orderType: 'BUY',
    state: FIAT_ORDER_STATES.COMPLETED,
    createdAt: 1697241014535,
    provider: FIAT_ORDER_PROVIDERS.AGGREGATOR,
    cryptocurrency: 'ETH',
    amount: '123345',
    currency: 'USD',
    network: '1',
    data: {
      cryptoCurrency: {
        decimals: 18,
        name: 'Ethereum',
        symbol: 'ETH',
      },
      provider: {
        name: 'Test Provider',
      },
    },
  },
  {
    cryptoAmount: '12.3456789120',
    orderType: 'BUY',
    state: FIAT_ORDER_STATES.FAILED,
    createdAt: 1697241014535,
    provider: FIAT_ORDER_PROVIDERS.AGGREGATOR,
    cryptocurrency: 'ETH',
    amount: '123345',
    currency: 'USD',
    network: '1',
    data: {
      cryptoCurrency: {
        decimals: 18,
        name: 'Ethereum',
        symbol: 'ETH',
      },
      provider: {
        name: 'Test Provider',
      },
    },
  },
  {
    cryptoAmount: '12.3456789120',
    orderType: 'SELL',
    state: FIAT_ORDER_STATES.CREATED,
    createdAt: 1697241014535,
    provider: FIAT_ORDER_PROVIDERS.AGGREGATOR,
    cryptocurrency: 'ETH',
    amount: '123345',
    currency: 'USD',
    network: '1',
    data: {
      cryptoCurrency: {
        decimals: 18,
        name: 'Ethereum',
        symbol: 'ETH',
      },
      provider: {
        name: 'Test Provider',
      },
    },
  },
  {
    cryptoAmount: '12.3456789120',
    orderType: 'SELL',
    state: 'default' as FIAT_ORDER_STATES,
    createdAt: 1697241014535,
    provider: FIAT_ORDER_PROVIDERS.AGGREGATOR,
    cryptocurrency: 'ETH',
    amount: '123345',
    currency: 'USD',
    network: '1',
    data: {
      cryptoCurrency: {
        decimals: 18,
        name: 'Ethereum',
        symbol: 'ETH',
      },
      provider: {
        name: 'Test Provider',
      },
    },
  },
  {
    cryptoAmount: '12.3456789120',
    orderType: 'SELL',
    state: FIAT_ORDER_STATES.CANCELLED,
    createdAt: 1697241014535,
    provider: FIAT_ORDER_PROVIDERS.AGGREGATOR,
    cryptocurrency: 'ETH',
    amount: '123345',
    currency: 'USD',
    network: '1',
    data: {
      cryptoCurrency: {
        decimals: 18,
        name: 'Ethereum',
        symbol: 'ETH',
      },
      provider: {
        name: 'Test Provider',
      },
    },
  },
  {
    cryptoAmount: '12.3456789120',
    orderType: 'SELL',
    state: FIAT_ORDER_STATES.PENDING,
    createdAt: 1697241014535,
    provider: FIAT_ORDER_PROVIDERS.AGGREGATOR,
    cryptocurrency: 'ETH',
    amount: '123345',
    currency: 'USD',
    network: '1',
    data: {
      cryptoCurrency: {
        decimals: 18,
        name: 'Ethereum',
        symbol: 'ETH',
      },
      provider: {
        name: 'Test Provider',
      },
    },
  },
  {
    cryptoAmount: '12.3456789120',
    orderType: 'BUY',
    state: FIAT_ORDER_STATES.PENDING,
    createdAt: 1697241014535,
    provider: FIAT_ORDER_PROVIDERS.AGGREGATOR,
    cryptocurrency: 'ETH',
    amount: '123345',
    currency: 'USD',
    network: '1',
    data: {
      cryptoCurrency: {
        decimals: 18,
        name: 'Ethereum',
        symbol: 'ETH',
      },
      provider: {
        name: 'Test Provider',
      },
    },
  },
  {
    orderType: 'BUY',
    state: FIAT_ORDER_STATES.PENDING,
    provider: FIAT_ORDER_PROVIDERS.AGGREGATOR,
    cryptocurrency: 'ETH',
    currency: 'USD',
    network: '1',
    data: {
      cryptoCurrency: {
        decimals: 18,
        name: 'Ethereum',
        symbol: 'ETH',
      },
      provider: {
        name: 'Test Provider',
      },
    },
  },
  {
    orderType: 'BUY',
    state: FIAT_ORDER_STATES.PENDING,
    provider: FIAT_ORDER_PROVIDERS.AGGREGATOR,
    cryptocurrency: 'ETH',
    currency: 'USD',
    network: '',
    data: {
      cryptoCurrency: {
        decimals: 18,
        name: 'Ethereum',
        symbol: 'ETH',
      },
      provider: {
        name: 'Test Provider',
      },
    },
  },
  {
    orderType: 'BUY',
    state: FIAT_ORDER_STATES.PENDING,
    provider: FIAT_ORDER_PROVIDERS.AGGREGATOR,
    cryptocurrency: 'ETH',
    currency: 'USD',
    network: 'wrong order network',
    data: {
      cryptoCurrency: {
        decimals: 18,
        name: 'Ethereum',
        symbol: 'ETH',
      },
      provider: {
        name: 'Test Provider',
      },
    },
  },
  {
    orderType: 'DEPOSIT' as DepositOrderType,
    state: FIAT_ORDER_STATES.PENDING,
    provider: FIAT_ORDER_PROVIDERS.DEPOSIT,
    cryptocurrency: 'ETH',
    currency: 'USD',
    network: 'eip155:1',
    data: {
      cryptoCurrency: {
        decimals: 18,
        name: 'Ethereum',
        symbol: 'ETH',
      },
      provider: {
        name: 'Test Provider',
      },
    },
  },
];

describe('OrderListItem', () => {
  it('shows order status unavailable instead of pending when the provider was removed', () => {
    const pendingBuy = testOrders.find(
      (order) =>
        order.state === FIAT_ORDER_STATES.PENDING && order.orderType === 'BUY',
    );

    const { getByText, queryByText } = renderWithProvider(
      <OrderListItem
        order={
          {
            ...pendingBuy,
            providerRemoved: true,
          } as FiatOrder
        }
      />,
    );

    expect(
      getByText(
        strings('fiat_on_ramp_aggregator.order_details.provider_removed'),
      ),
    ).toBeOnTheScreen();
    expect(
      queryByText(strings('fiat_on_ramp_aggregator.order_status_pending')),
    ).not.toBeOnTheScreen();
  });

  it('renders each order without crashing', () => {
    testOrders.forEach((order) => {
      const { unmount } = renderWithProvider(
        <OrderListItem order={order as FiatOrder} />,
      );
      unmount();
    });
  });
});
