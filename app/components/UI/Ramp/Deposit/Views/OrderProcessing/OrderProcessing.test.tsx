import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import OrderProcessing from './OrderProcessing';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import { getOrderById } from '../../../../../../reducers/fiatOrders';
import Routes from '../../../../../../constants/navigation/Routes';
import { FIAT_ORDER_STATES } from '../../../../../../constants/on-ramp';

const mockNavigate = jest.fn();
const mockSetOptions = jest.fn();
const mockLinkingOpenURL = jest.fn();

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

jest.mock('react-native', () => {
  const actualReactNative = jest.requireActual('react-native');
  return {
    ...actualReactNative,
    Linking: {
      ...actualReactNative.Linking,
      openURL: mockLinkingOpenURL,
    },
  };
});

jest.mock('../../../../../../reducers/fiatOrders', () => ({
  getOrderById: jest.fn(),
}));

describe('OrderProcessing Component', () => {
  const mockOrder = {
    id: 'test-order-id',
    amount: '100',
    currency: 'USD',
    cryptoAmount: '0.05',
    cryptocurrency: 'ETH',
    fee: '2.50',
    state: FIAT_ORDER_STATES.COMPLETED,
    data: {
      providerOrderLink: 'https://transak.com/order/123',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getOrderById as jest.Mock).mockReturnValue(mockOrder);
  });

  it('renders success state correctly', () => {
    renderWithProvider(<OrderProcessing />, {
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

    renderWithProvider(<OrderProcessing />, {
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

    renderWithProvider(<OrderProcessing />, {
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

    renderWithProvider(<OrderProcessing />, {
      state: {
        engine: {
          backgroundState,
        },
      },
    });
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('navigates to correct screen on main button press', () => {
    renderWithProvider(<OrderProcessing />, {
      state: {
        engine: {
          backgroundState,
        },
      },
    });

    const mainButton = screen.getByTestId('main-action-button');
    fireEvent.press(mainButton);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
  });

  it('navigates to build quote on main button press when error state', () => {
    const errorOrder = { ...mockOrder, state: FIAT_ORDER_STATES.FAILED };
    (getOrderById as jest.Mock).mockReturnValue(errorOrder);

    renderWithProvider(<OrderProcessing />, {
      state: {
        engine: {
          backgroundState,
        },
      },
    });

    const mainButton = screen.getByTestId('main-action-button');
    fireEvent.press(mainButton);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.DEPOSIT.BUILD_QUOTE);
  });
});
