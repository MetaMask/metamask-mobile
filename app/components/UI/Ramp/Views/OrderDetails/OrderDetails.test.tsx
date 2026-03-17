import React from 'react';
import { processFiatOrder } from '../../index';
import { screen } from '@testing-library/react-native';
import OrderDetails from './OrderDetails';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import {
  FIAT_ORDER_STATES,
  FIAT_ORDER_PROVIDERS,
} from '../../../../../constants/on-ramp';
import type { RampsOrder } from '@metamask/ramps-controller';
import { getOrderById, FiatOrder } from '../../../../../reducers/fiatOrders';

const mockNavigate = jest.fn();
const mockSetOptions = jest.fn();
const mockGoBack = jest.fn();
const mockDispatch = jest.fn();

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
}));

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      setOptions: mockSetOptions,
      goBack: mockGoBack,
    }),
    useRoute: () => ({
      params: {
        orderId: 'test-order-id',
      },
    }),
  };
});

jest.mock('../../../../../reducers/fiatOrders', () => ({
  getOrderById: jest.fn(),
  updateFiatOrder: jest.fn().mockReturnValue({ type: 'FIAT_UPDATE_ORDER' }),
  getProviderName: jest.fn().mockReturnValue('Transak'),
}));

function mockGetUpdatedOrder(order: FiatOrder) {
  return {
    ...order,
    lastTimeFetched: (order.lastTimeFetched || 0) + 100,
  };
}

jest.mock('../../index', () => ({
  processFiatOrder: jest.fn().mockImplementation((order, onSuccess) => {
    const updatedOrder = mockGetUpdatedOrder(order);
    if (onSuccess) {
      onSuccess(updatedOrder);
    }
    return Promise.resolve();
  }),
}));

describe('Ramps OrderDetails Component', () => {
  const mockRampsOrder: RampsOrder = {
    id: 'provider-order-123',
    isOnlyLink: false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    provider: { id: '/providers/transak', name: 'Transak', links: [] } as any,
    success: true,
    cryptoAmount: 0.05,
    fiatAmount: 100,
    cryptoCurrency: {
      symbol: 'USDC',
      decimals: 6,
      iconUrl: 'https://example.com/usdc.png',
    },
    fiatCurrency: {
      symbol: 'USD',
      decimals: 2,
      denomSymbol: '$',
    },
    providerOrderId: 'transak_order_123',
    providerOrderLink: 'https://transak.com/order/123',
    createdAt: Date.now(),
    paymentMethod: {
      id: '/payments/card',
      name: 'Credit Card',
    },
    totalFeesFiat: 2.5,
    txHash: '',
    walletAddress: '0x1234567890123456789012345678901234567890',
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    status: 'COMPLETED' as any,
    network: {
      name: 'Ethereum',
      chainId: '1',
    },
    canBeUpdated: false,
    idHasExpired: false,
    excludeFromPurchases: false,
    timeDescriptionPending: '1-2 minutes',
    orderType: 'BUY',
  };

  const mockOrder: FiatOrder = {
    id: '/providers/transak/orders/123',
    provider: FIAT_ORDER_PROVIDERS.RAMPS_V2,
    createdAt: Date.now(),
    amount: 100,
    currency: 'USD',
    cryptoAmount: 0.05,
    cryptocurrency: 'USDC',
    fee: 2.5,
    state: FIAT_ORDER_STATES.COMPLETED,
    account: '0x1234567890123456789012345678901234567890',
    network: '1',
    excludeFromPurchases: false,
    orderType: 'BUY',
    data: mockRampsOrder,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getOrderById as jest.Mock).mockReturnValue(mockOrder);
    (processFiatOrder as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders OrderDetails component', () => {
    renderWithProvider(<OrderDetails />, {
      state: {
        engine: {
          backgroundState,
        },
      },
    });

    expect(screen.toJSON()).toBeTruthy();
  });

  it('sets navigation options on mount', () => {
    renderWithProvider(<OrderDetails />, {
      state: {
        engine: {
          backgroundState,
        },
      },
    });

    expect(mockSetOptions).toHaveBeenCalled();
  });
});
