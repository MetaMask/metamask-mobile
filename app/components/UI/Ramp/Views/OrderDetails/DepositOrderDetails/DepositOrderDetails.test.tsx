import React from 'react';
import { screen } from '@testing-library/react-native';
import DepositOrderDetails from './DepositOrderDetails';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import {
  FIAT_ORDER_STATES,
  FIAT_ORDER_PROVIDERS,
} from '../../../../../../constants/on-ramp';
import { DepositOrder, DepositOrderType } from '../../../types/legacyDeposit';
import { getOrderById } from '../../../../../../reducers/fiatOrders';
import { MOCK_DEPOSIT_ORDER, MOCK_US_REGION } from '../../../testUtils';

const mockNavigate = jest.fn();
const mockSetOptions = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      setOptions: mockSetOptions,
    }),
    useRoute: () => ({
      params: {
        orderId: 'test-order-id',
      },
    }),
  };
});

jest.mock('../../../../../../reducers/fiatOrders', () => ({
  getOrderById: jest.fn(),
  updateFiatOrder: jest.fn().mockReturnValue({ type: 'FIAT_UPDATE_ORDER' }),
  getDetectedGeolocation: jest.fn(),
}));

describe('DepositOrderDetails Component', () => {
  const mockOrder = {
    id: 'test-order-id-123456',
    provider: FIAT_ORDER_PROVIDERS.DEPOSIT,
    createdAt: Date.now(),
    amount: '100',
    currency: 'USD',
    cryptoAmount: '0.05',
    cryptocurrency: 'USDC',
    fee: '2.50',
    state: FIAT_ORDER_STATES.COMPLETED,
    account: '0x1234567890123456789012345678901234567890',
    network: 'eip155:1',
    excludeFromPurchases: false,
    orderType: DepositOrderType.Deposit,
    data: {
      ...MOCK_DEPOSIT_ORDER,
      id: 'test-deposit-order-1',
      provider: 'deposit',
      providerOrderId: 'deposit_123',
      providerOrderLink: 'https://example.com/order/123',
      createdAt: Date.now(),
      status: 'COMPLETED',
      timeDescriptionPending: '1-2 days',
      fiatAmountInUsd: 100,
      feesInUsd: 2.5,
      region: MOCK_US_REGION,
      paymentDetails: [],
    } as DepositOrder,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getOrderById as jest.Mock).mockReturnValue(mockOrder);
  });

  it('renders completed order from persisted state', () => {
    renderWithProvider(<DepositOrderDetails />, {
      state: {
        engine: {
          backgroundState,
        },
      },
    });
    expect(screen.getByText('Order ID')).toBeOnTheScreen();
    expect(screen.getByText('Total')).toBeOnTheScreen();
  });

  it('renders failed order from persisted state', () => {
    const errorOrder = { ...mockOrder, state: FIAT_ORDER_STATES.FAILED };
    (getOrderById as jest.Mock).mockReturnValue(errorOrder);

    renderWithProvider(<DepositOrderDetails />, {
      state: {
        engine: {
          backgroundState,
        },
      },
    });
    expect(screen.getByText('Order ID')).toBeOnTheScreen();
    expect(screen.getByText('Total')).toBeOnTheScreen();
  });

  it('renders pending order from persisted state', () => {
    const processingOrder = { ...mockOrder, state: FIAT_ORDER_STATES.PENDING };
    (getOrderById as jest.Mock).mockReturnValue(processingOrder);

    renderWithProvider(<DepositOrderDetails />, {
      state: {
        engine: {
          backgroundState,
        },
      },
    });
    expect(screen.getByText('Order ID')).toBeOnTheScreen();
    expect(screen.getByText('Total')).toBeOnTheScreen();
  });

  it('renders CREATED order from persisted state', () => {
    const createdOrder = { ...mockOrder, state: FIAT_ORDER_STATES.CREATED };
    (getOrderById as jest.Mock).mockReturnValue(createdOrder);

    renderWithProvider(<DepositOrderDetails />, {
      state: {
        engine: {
          backgroundState,
        },
      },
    });
    expect(screen.getByText('Order ID')).toBeOnTheScreen();
    expect(screen.getByText('Total')).toBeOnTheScreen();
  });

  it('renders no order found state', () => {
    (getOrderById as jest.Mock).mockReturnValue(null);

    renderWithProvider(<DepositOrderDetails />, {
      state: {
        engine: {
          backgroundState,
        },
      },
    });
    expect(screen.queryByText('Order ID')).not.toBeOnTheScreen();
    expect(screen.queryByText('Total')).not.toBeOnTheScreen();
  });
});
