import React from 'react';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import OrderDetails from './OrderDetails';
import initialBackgroundState from '../../../../../../util/test/initial-background-state.json';
import { FiatOrder } from '../../../../../../reducers/fiatOrders';
import {
  FIAT_ORDER_PROVIDERS,
  FIAT_ORDER_STATES,
} from '../../../../../../constants/on-ramp';

const mockNavigate = jest.fn();
const mockSetNavigationOptions = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      setOptions: mockSetNavigationOptions,
    }),
  };
});

type DeepPartial<BaseType> = {
  [key in keyof BaseType]?: DeepPartial<BaseType[key]>;
};

const testOrders: DeepPartial<FiatOrder> = {
  id: 'test-order-1',
  account: '0x0',
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
};

jest.mock('../../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../../util/navigation/navUtils'),
  useParams: jest.fn(() => ({
    orderId: 'SOME_ID',
  })),
}));

function render(Component: React.ReactElement, orders = testOrders) {
  return renderWithProvider(Component, {
    state: {
      engine: {
        backgroundState: {
          ...initialBackgroundState,
          PreferencesController: {
            selectedAddress: '0x0',
            identities: {
              '0x0': {
                address: '0x0',
                name: 'Account 1',
              },
            },
          },
          NetworkController: {
            network: '1',
            providerConfig: {
              ticker: 'ETH',
              type: 'mainnet',
              chainId: '1',
            },
          },
        },
      },
      fiatOrders: {
        orders: [orders] as FiatOrder[],
      },
    },
  });
}
describe('OrderDetails', () => {
  it('renders an empty screen layout if there is no order', async () => {
    render(<OrderDetails />);
    expect(screen.toJSON()).toMatchSnapshot();
  });
});
