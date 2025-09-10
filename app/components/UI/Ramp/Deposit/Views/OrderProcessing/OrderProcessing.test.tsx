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
const mockUseDepositSDK = jest.fn();
const mockCancelOrder = jest.fn();

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

jest.mock('../../sdk', () => ({
  useDepositSDK: () => mockUseDepositSDK(),
  DepositSDKProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('../../hooks/useDepositSdkMethod', () => ({
  useDepositSdkMethod: jest.fn().mockImplementation((config) => {
    if (config?.method === 'cancelOrder') {
      return [{ error: null }, mockCancelOrder];
    }
    return [{ error: null }, jest.fn()];
  }),
}));

jest.mock('../../utils', () => ({
  formatCurrency: jest.fn((amount, currency) => {
    if (currency === 'USD') {
      return `$${parseFloat(amount).toFixed(2)}`;
    }
    return `${currency} ${amount}`;
  }),
  hasDepositOrderField: jest.fn(() => true),
}));

describe('OrderProcessing Component', () => {
  const mockOrder = {
    id: 'test-order-id',
    amount: '100',
    currency: 'USD',
    cryptoAmount: '0.05',
    cryptocurrency: 'USDC',
    fee: '2.50',
    state: FIAT_ORDER_STATES.COMPLETED,
    network: 'eip155:1',
    data: {
      cryptoCurrency: 'USDC',
      network: 'ethereum',
      providerOrderLink: 'https://transak.com/order/123',
      fiatAmount: '100',
      exchangeRate: '2000',
      totalFeesFiat: '2.50',
      networkFees: '2.50',
      partnerFees: '2.50',
      paymentMethod: 'credit_debit_card',
      walletAddress: '0x1234567890123456789012345678901234567890',
      fiatCurrency: 'USD',
    },
  };

  const mockSelectedRegion = {
    isoCode: 'US',
    flag: '🇺🇸',
    name: 'United States',
    currency: 'USD',
    supported: true,
  };

  const mockSelectedWalletAddress =
    '0x1234567890123456789012345678901234567890';

  beforeEach(() => {
    jest.clearAllMocks();
    (getOrderById as jest.Mock).mockReturnValue(mockOrder);
    mockUseDepositSDK.mockReturnValue({
      isAuthenticated: false,
      selectedRegion: mockSelectedRegion,
      selectedWalletAddress: mockSelectedWalletAddress,
    });
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

  it('renders created state correctly', () => {
    const createdOrder = { ...mockOrder, state: FIAT_ORDER_STATES.CREATED };
    (getOrderById as jest.Mock).mockReturnValue(createdOrder);

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
