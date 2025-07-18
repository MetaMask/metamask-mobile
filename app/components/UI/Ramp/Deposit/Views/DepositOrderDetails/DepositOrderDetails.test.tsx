import React from 'react';
import { processFiatOrder } from '../../../index';
import { act, screen, waitFor } from '@testing-library/react-native';
import DepositOrderDetails from './DepositOrderDetails';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import {
  FIAT_ORDER_STATES,
  FIAT_ORDER_PROVIDERS,
} from '../../../../../../constants/on-ramp';
import { DepositOrder, DepositOrderType } from '@consensys/native-ramps-sdk';
import { getOrderById, FiatOrder } from '../../../../../../reducers/fiatOrders';
import AppConstants from '../../../../../../core/AppConstants';

const mockNavigate = jest.fn();
const mockSetOptions = jest.fn();
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
}));

function mockGetUpdatedOrder(order: FiatOrder) {
  return {
    ...order,
    lastTimeFetched: (order.lastTimeFetched || 0) + 100,
  };
}

jest.mock('../../../index', () => ({
  processFiatOrder: jest.fn().mockImplementation((order, onSuccess) => {
    const updatedOrder = mockGetUpdatedOrder(order);
    if (onSuccess) {
      onSuccess(updatedOrder);
    }
    return Promise.resolve();
  }),
}));

describe('DepositOrderDetails Component', () => {
  const mockOrder = {
    id: 'test-order-id-123456',
    provider: FIAT_ORDER_PROVIDERS.TRANSAK,
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
      cryptoCurrency: 'USDC',
      network: 'ethereum',
      providerOrderLink: 'https://transak.com/order/123',
    } as DepositOrder,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getOrderById as jest.Mock).mockReturnValue(mockOrder);
    (processFiatOrder as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    (processFiatOrder as jest.Mock).mockClear();
  });

  it('renders success state correctly', () => {
    renderWithProvider(<DepositOrderDetails />, {
      state: {
        engine: {
          backgroundState,
        },
      },
    });
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders error state correctly', () => {
    const errorOrder = { ...mockOrder, state: FIAT_ORDER_STATES.FAILED };
    (getOrderById as jest.Mock).mockReturnValue(errorOrder);

    renderWithProvider(<DepositOrderDetails />, {
      state: {
        engine: {
          backgroundState,
        },
      },
    });
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders processing state correctly', () => {
    const processingOrder = { ...mockOrder, state: FIAT_ORDER_STATES.PENDING };
    (getOrderById as jest.Mock).mockReturnValue(processingOrder);

    renderWithProvider(<DepositOrderDetails />, {
      state: {
        engine: {
          backgroundState,
        },
      },
    });
    expect(screen.toJSON()).toMatchSnapshot();
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
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders loading state correctly', () => {
    const loadingOrder = { ...mockOrder, state: FIAT_ORDER_STATES.CREATED };
    (getOrderById as jest.Mock).mockReturnValue(loadingOrder);

    renderWithProvider(<DepositOrderDetails />, {
      state: {
        engine: {
          backgroundState,
        },
      },
    });
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders an error screen if a CREATED order cannot be polled on load', async () => {
    const createdOrder = { ...mockOrder, state: FIAT_ORDER_STATES.CREATED };
    (getOrderById as jest.Mock).mockReturnValue(createdOrder);
    (processFiatOrder as jest.Mock).mockImplementationOnce(() => {
      throw new Error('Test error message');
    });

    await waitFor(() => {
      renderWithProvider(<DepositOrderDetails />, {
        state: {
          engine: {
            backgroundState,
          },
        },
      });
    });

    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('calls handleOnRefresh successfully on mount for CREATED orders', async () => {
    const createdOrder = { ...mockOrder, state: FIAT_ORDER_STATES.CREATED };
    (getOrderById as jest.Mock).mockReturnValue(createdOrder);

    await waitFor(() => {
      renderWithProvider(<DepositOrderDetails />, {
        state: {
          engine: {
            backgroundState,
          },
        },
      });
    });

    await waitFor(() => {
      expect(processFiatOrder).toHaveBeenCalledWith(
        createdOrder,
        expect.any(Function),
        expect.any(Function),
        { forced: true },
      );
    });
  });

  it('polls transacted orders using interval', async () => {
    jest.useFakeTimers();
    const createdOrder = { ...mockOrder, state: FIAT_ORDER_STATES.CREATED };
    (getOrderById as jest.Mock).mockReturnValue(createdOrder);

    const intervalCount = 3;

    await waitFor(() => {
      renderWithProvider(<DepositOrderDetails />, {
        state: {
          engine: {
            backgroundState,
          },
        },
      });
    });

    await waitFor(() => {
      expect(processFiatOrder).toHaveBeenCalledTimes(1);
    });

    act(() => {
      jest.advanceTimersByTime(
        AppConstants.FIAT_ORDERS.POLLING_FREQUENCY * intervalCount,
      );
      jest.clearAllTimers();
      jest.useFakeTimers({ legacyFakeTimers: true });
    });

    expect(processFiatOrder).toHaveBeenCalledTimes(1 + intervalCount);
  });
});
