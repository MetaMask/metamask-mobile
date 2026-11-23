import React from 'react';
import OrderListItem from './OrderListItem';
import { FiatOrder } from '../../../../../../reducers/fiatOrders';
import renderWithProvider, {
  DeepPartial,
} from '../../../../../../util/test/renderWithProvider';
import { screen } from '@testing-library/react-native';
import { OrderOrderTypeEnum } from '@consensys/on-ramp-sdk/dist/API';
import {
  FIAT_ORDER_PROVIDERS,
  FIAT_ORDER_STATES,
} from '../../../../../../constants/on-ramp';
import { DepositOrderType } from '../../../types/legacyDeposit';

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
  it('renders each order without crashing', () => {
    testOrders.forEach((order) => {
      const { unmount } = renderWithProvider(
        <OrderListItem order={order as FiatOrder} />,
      );
      unmount();
    });
  });

  describe('fiat amount', () => {
    const baseOrder: FiatOrder = {
      id: 'order-1',
      provider: FIAT_ORDER_PROVIDERS.AGGREGATOR,
      createdAt: 1697241014535,
      amount: '1234.5',
      currency: 'USD',
      cryptoAmount: '0.5',
      cryptocurrency: 'ETH',
      state: FIAT_ORDER_STATES.COMPLETED,
      account: '0x0000000000000000000000000000000000000001',
      network: '1',
      excludeFromPurchases: false,
      orderType: OrderOrderTypeEnum.Buy,
      data: { order: {}, transfer: {} },
    };

    it.each([
      ['1234.5', 'USD', '$1,234.50'],
      ['1234.5', 'EUR', '€1,234.50'],
      ['not-a-number', 'USD', '...'],
      ['1234.5', '', '...'],
    ])('formats %s %s as %s', (amount, currency, expected) => {
      renderWithProvider(
        <OrderListItem order={{ ...baseOrder, amount, currency }} />,
      );

      expect(screen.getByText(expected)).toBeOnTheScreen();
    });
  });
});
