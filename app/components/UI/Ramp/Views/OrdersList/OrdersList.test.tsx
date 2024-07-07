import React from 'react';
import OrdersList from './OrdersList';
import {
  FIAT_ORDER_PROVIDERS,
  FIAT_ORDER_STATES,
} from '../../../../../constants/on-ramp';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { FiatOrder } from '../../../../../reducers/fiatOrders';
import initialBackgroundState from '../../../../../util/test/initial-background-state.json';
import { fireEvent, screen } from '@testing-library/react-native';
import { createMockAccountsControllerState } from '../../../../../util/test/accountsControllerTestUtils';

type DeepPartial<BaseType> = {
  [key in keyof BaseType]?: DeepPartial<BaseType[key]>;
};

const MOCK_ADDRESS = '0xe64dD0AB5ad7e8C5F2bf6Ce75C34e187af8b920A';

const testOrders: DeepPartial<FiatOrder>[] = [
  {
    id: 'test-order-1',
    account: MOCK_ADDRESS,
    network: '1',
    cryptoAmount: '0.01231324',
    orderType: 'BUY',
    state: FIAT_ORDER_STATES.COMPLETED,
    createdAt: 1697242033399,
    provider: FIAT_ORDER_PROVIDERS.AGGREGATOR,
    cryptocurrency: 'ETH',
    amount: '34.23',
    currency: 'USD',
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
    id: 'test-order-2',
    account: MOCK_ADDRESS,
    network: '1',
    cryptoAmount: '0.01231324',
    orderType: 'SELL',
    state: FIAT_ORDER_STATES.PENDING,
    createdAt: 1697242033399,
    provider: FIAT_ORDER_PROVIDERS.AGGREGATOR,
    cryptocurrency: 'ETH',
    amount: '34.23',
    currency: 'USD',
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
    id: 'test-order-3',
    account: MOCK_ADDRESS,
    network: '1',
    cryptoAmount: '0.01231324',
    orderType: 'BUY',
    state: FIAT_ORDER_STATES.PENDING,
    createdAt: 1697242033399,
    provider: FIAT_ORDER_PROVIDERS.AGGREGATOR,
    cryptocurrency: 'ETH',
    amount: '34.23',
    currency: 'USD',
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
    id: 'test-order-4',
    account: MOCK_ADDRESS,
    network: '1',
    orderType: 'BUY',
    state: FIAT_ORDER_STATES.PENDING,
    provider: FIAT_ORDER_PROVIDERS.AGGREGATOR,
    cryptocurrency: 'ETH',
    currency: 'USD',
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

const MOCK_ACCOUNTS_CONTROLLER_STATE = createMockAccountsControllerState([
  MOCK_ADDRESS,
]);

function render(Component: React.ReactElement, orders = testOrders) {
  return renderWithProvider(Component, {
    state: {
      engine: {
        backgroundState: {
          ...initialBackgroundState,
          NetworkController: {
            network: '1',
            providerConfig: {
              ticker: 'ETH',
              type: 'mainnet',
              chainId: '0x1',
            },
          },
          AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
        },
      },
      fiatOrders: {
        orders: orders as FiatOrder[],
      },
    },
  });
}

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

describe('OrdersList', () => {
  it('renders correctly', () => {
    render(<OrdersList />);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders buy only correctly when pressing buy filter', () => {
    render(<OrdersList />);
    fireEvent.press(screen.getByRole('button', { name: 'Purchased' }));
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders sell only correctly when pressing sell filter', () => {
    render(<OrdersList />);
    fireEvent.press(screen.getByRole('button', { name: 'Sold' }));
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders empty sell message', () => {
    render(
      <OrdersList />,
      [testOrders[0]], // a buy order,
    );
    fireEvent.press(screen.getByRole('button', { name: 'Sold' }));
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders empty buy message', () => {
    render(
      <OrdersList />,
      [testOrders[1]], // a sell order,
    );
    fireEvent.press(screen.getByRole('button', { name: 'Purchased' }));
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('resets filter to all after other filter was set', () => {
    render(<OrdersList />);
    fireEvent.press(screen.getByRole('button', { name: 'Sold' }));
    expect(screen.toJSON()).toMatchSnapshot();
    fireEvent.press(screen.getByRole('button', { name: 'All' }));
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('navigates when pressing item', () => {
    render(<OrdersList />);
    fireEvent.press(screen.getByRole('button', { name: 'Sold' }));
    fireEvent.press(screen.getByRole('button', { name: /Sold ETH/ }));
    expect(mockNavigate).toHaveBeenCalled();
    expect(mockNavigate.mock.calls).toMatchInlineSnapshot(`
      [
        [
          "OrderDetails",
          {
            "orderId": "test-order-2",
          },
        ],
      ]
    `);
  });
});
