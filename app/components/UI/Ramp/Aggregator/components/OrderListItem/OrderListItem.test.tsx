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
import { DepositOrderType } from '@consensys/native-ramps-sdk';

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
  it('should render correctly', () => {
    testOrders.forEach((order) => {
      const rendered = renderWithProvider(
        <OrderListItem order={order as FiatOrder} />,
      );
      expect(rendered.toJSON()).toMatchSnapshot();
    });
  });
});
