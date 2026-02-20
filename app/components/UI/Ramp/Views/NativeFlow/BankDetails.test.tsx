import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import V2BankDetails from './BankDetails';
import { ThemeContext, mockTheme } from '../../../../../util/theme';
import { FIAT_ORDER_STATES } from '../../../../../constants/on-ramp';

const mockNavigate = jest.fn();
const mockSetOptions = jest.fn();
const mockDispatch = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    setOptions: mockSetOptions,
    dispatch: mockDispatch,
  }),
  StackActions: {
    replace: (route: string, params: unknown) => ({
      type: 'Navigation/REPLACE',
      routeName: route,
      params,
    }),
  },
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string, params?: Record<string, unknown>) => {
    if (params) return `${key}`;
    return key;
  },
  I18nEvents: { addListener: jest.fn() },
}));

jest.mock('../../../Navbar', () => ({
  getDepositNavbarOptions: jest.fn(() => ({})),
}));

jest.mock('../../../../../util/navigation/navUtils', () => ({
  createNavigationDetails:
    (..._args: unknown[]) =>
    (params: unknown) => ['MockRoute', params],
  useParams: () => ({
    orderId: 'test-order-id',
    shouldUpdate: true,
  }),
}));

jest.mock('../../../../../util/theme', () => ({
  ...jest.requireActual('../../../../../util/theme'),
  useTheme: () => ({
    colors: {
      primary: { default: '#0376C9' },
      icon: { default: '#6A737D' },
    },
  }),
}));

const mockGetOrder = jest.fn();
const mockConfirmPayment = jest.fn();
const mockCancelOrder = jest.fn();
const mockLogoutFromProvider = jest.fn();

jest.mock('../../hooks/useTransakController', () => ({
  useTransakController: () => ({
    logoutFromProvider: mockLogoutFromProvider,
    getOrder: mockGetOrder,
    confirmPayment: mockConfirmPayment,
    cancelOrder: mockCancelOrder,
  }),
}));

jest.mock('../../hooks/useRampsUserRegion', () => ({
  useRampsUserRegion: () => ({
    userRegion: {
      country: { isoCode: 'US', currency: 'USD' },
      regionCode: 'us-ca',
    },
  }),
}));

jest.mock('../../../../../selectors/rampsController', () => ({
  selectTokens: () => ({
    data: null,
    selected: {
      assetId: 'eip155:1/erc20:0x123',
      chainId: 'eip155:1',
    },
    isLoading: false,
    error: null,
  }),
}));

const mockTrackEvent = jest.fn();
jest.mock('../../hooks/useAnalytics', () => ({
  __esModule: true,
  default: () => mockTrackEvent,
}));

jest.mock('../../../../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('../../../../hooks/useThunkDispatch', () => ({
  __esModule: true,
  default: () => jest.fn(),
}));

jest.mock('../../Deposit/utils', () => ({
  hasDepositOrderField: (data: unknown, field: string) => {
    if (!data || typeof data !== 'object') return false;
    return field in (data as Record<string, unknown>);
  },
  generateThemeParameters: jest.fn(() => ({})),
}));

jest.mock('../../Deposit/orderProcessor', () => ({
  depositOrderToFiatOrder: jest.fn((order) => ({
    ...order,
    orderType: 'BUY',
  })),
}));

jest.mock(
  '../../../../../component-library/components-temp/Loader/Loader',
  () => {
    const { createElement } = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: () => createElement(View, { testID: 'loader' }),
    };
  },
);

jest.mock('../../Deposit/components/BankDetailRow', () => {
  const { createElement } = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ label, value }: { label: string; value: string }) =>
      createElement(
        View,
        { testID: `bank-detail-${label}` },
        createElement(Text, null, label),
        createElement(Text, null, value),
      ),
  };
});

let mockOrder: unknown = null;

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: (selector: unknown) => {
    if (
      typeof selector === 'function' &&
      (selector as { name?: string }).name === 'selectTokens'
    ) {
      return {
        data: null,
        selected: { assetId: 'eip155:1/erc20:0x123', chainId: 'eip155:1' },
        isLoading: false,
        error: null,
      };
    }
    return mockOrder;
  },
  useDispatch: () => jest.fn(),
}));

const renderWithTheme = (component: React.ReactElement) =>
  render(
    <ThemeContext.Provider value={mockTheme}>
      {component}
    </ThemeContext.Provider>,
  );

describe('V2BankDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOrder = null;
  });

  it('matches snapshot when order is null (loading)', () => {
    mockOrder = null;
    const { toJSON } = renderWithTheme(<V2BankDetails />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders loader when order is not available', () => {
    mockOrder = null;
    const { getByTestId } = renderWithTheme(<V2BankDetails />);
    expect(getByTestId('loader')).toBeOnTheScreen();
  });

  it('matches snapshot with order data', () => {
    mockOrder = {
      id: 'test-order-id',
      state: FIAT_ORDER_STATES.CREATED,
      account: '0xabc',
      cryptoAmount: '0.05',
      data: {
        fiatAmount: '100',
        fiatCurrency: 'USD',
        exchangeRate: '2000',
        totalFeesFiat: '5',
        paymentMethod: { id: 'pm-1', shortName: 'Bank Transfer' },
        paymentDetails: [
          {
            fields: [
              { name: 'Amount', value: '$100.00' },
              { name: 'First Name (Beneficiary)', value: 'john' },
              { name: 'Last Name (Beneficiary)', value: 'doe' },
              { name: 'Account Number', value: '123456789' },
              { name: 'Routing Number', value: '987654321' },
              { name: 'Account Type', value: 'checking' },
              { name: 'Bank Name', value: 'test bank' },
            ],
          },
        ],
      },
    };
    const { toJSON } = renderWithTheme(<V2BankDetails />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders bank detail rows when order has payment details', () => {
    mockOrder = {
      id: 'test-order-id',
      state: FIAT_ORDER_STATES.CREATED,
      account: '0xabc',
      cryptoAmount: '0.05',
      data: {
        fiatAmount: '100',
        fiatCurrency: 'USD',
        exchangeRate: '2000',
        totalFeesFiat: '5',
        paymentMethod: { id: 'pm-1', shortName: 'Bank Transfer' },
        paymentDetails: [
          {
            fields: [
              { name: 'Amount', value: '$100.00' },
              { name: 'Account Number', value: '123456789' },
            ],
          },
        ],
      },
    };
    const { getByText } = renderWithTheme(<V2BankDetails />);

    expect(getByText('deposit.bank_details.main_title')).toBeOnTheScreen();
  });

  it('renders the refresh control scroll view', () => {
    mockOrder = {
      id: 'test-order-id',
      state: FIAT_ORDER_STATES.CREATED,
      account: '0xabc',
      data: {
        paymentMethod: { id: 'pm-1', shortName: 'Bank Transfer' },
        paymentDetails: [],
      },
    };
    const { getByTestId } = renderWithTheme(<V2BankDetails />);
    expect(
      getByTestId('bank-details-refresh-control-scrollview'),
    ).toBeOnTheScreen();
  });

  it('toggles bank info when show/hide button is pressed', () => {
    mockOrder = {
      id: 'test-order-id',
      state: FIAT_ORDER_STATES.CREATED,
      account: '0xabc',
      cryptoAmount: '0.05',
      data: {
        fiatAmount: '100',
        fiatCurrency: 'USD',
        exchangeRate: '2000',
        totalFeesFiat: '5',
        paymentMethod: { id: 'pm-1', shortName: 'Bank Transfer' },
        paymentDetails: [
          {
            fields: [
              { name: 'Amount', value: '$100.00' },
              { name: 'Bank Name', value: 'test bank' },
              { name: 'Bank Address', value: '123 Bank St' },
              { name: 'Recipient Address', value: '456 Beneficiary Ave' },
            ],
          },
        ],
      },
    };
    const { getByText, queryByText } = renderWithTheme(<V2BankDetails />);

    expect(queryByText('Test Bank')).toBeNull();

    fireEvent.press(getByText('deposit.bank_details.show_bank_info'));

    expect(getByText('Test Bank')).toBeOnTheScreen();
  });

  it('handles confirm payment button press', async () => {
    mockConfirmPayment.mockResolvedValue(undefined);
    mockGetOrder.mockResolvedValue({
      id: 'test-order-id',
      walletAddress: '0xabc',
      fiatAmount: '100',
      cryptoAmount: '0.05',
      exchangeRate: '2000',
      totalFeesFiat: '5',
      fiatCurrency: 'USD',
      paymentMethod: { id: 'pm-1' },
      network: { chainId: 'eip155:1' },
      cryptoCurrency: { assetId: 'asset1', symbol: 'ETH' },
    });

    mockOrder = {
      id: 'test-order-id',
      state: FIAT_ORDER_STATES.CREATED,
      account: '0xabc',
      cryptoAmount: '0.05',
      data: {
        fiatAmount: '100',
        fiatCurrency: 'USD',
        exchangeRate: '2000',
        totalFeesFiat: '5',
        paymentMethod: { id: 'pm-1', shortName: 'Bank Transfer' },
        paymentDetails: [
          {
            fields: [{ name: 'Amount', value: '$100.00' }],
          },
        ],
      },
    };

    const { getByTestId } = renderWithTheme(<V2BankDetails />);

    await act(async () => {
      fireEvent.press(getByTestId('main-action-button'));
    });

    await waitFor(() => {
      expect(mockConfirmPayment).toHaveBeenCalledWith('test-order-id', 'pm-1');
    });
  });

  it('handles cancel order button press', async () => {
    mockCancelOrder.mockResolvedValue(undefined);
    mockGetOrder.mockResolvedValue({
      id: 'test-order-id',
      walletAddress: '0xabc',
    });

    mockOrder = {
      id: 'test-order-id',
      state: FIAT_ORDER_STATES.CREATED,
      account: '0xabc',
      cryptoAmount: '0.05',
      data: {
        fiatAmount: '100',
        fiatCurrency: 'USD',
        exchangeRate: '2000',
        totalFeesFiat: '5',
        paymentMethod: { id: 'pm-1', shortName: 'Bank Transfer' },
        paymentDetails: [
          {
            fields: [{ name: 'Amount', value: '$100.00' }],
          },
        ],
      },
    };

    const { getByText } = renderWithTheme(<V2BankDetails />);

    await act(async () => {
      fireEvent.press(
        getByText('deposit.order_processing.cancel_order_button'),
      );
    });

    await waitFor(() => {
      expect(mockCancelOrder).toHaveBeenCalledWith('test-order-id');
    });
  });

  it('navigates to AMOUNT_INPUT when order state is CANCELLED', () => {
    mockOrder = {
      id: 'test-order-id',
      state: FIAT_ORDER_STATES.CANCELLED,
      account: '0xabc',
      data: {
        paymentMethod: { id: 'pm-1', shortName: 'Bank Transfer' },
        paymentDetails: [],
      },
    };

    renderWithTheme(<V2BankDetails />);

    expect(mockNavigate).toHaveBeenCalledWith('RampAmountInput');
  });

  it('replaces navigation to ORDER_PROCESSING when order state is PENDING', () => {
    mockOrder = {
      id: 'test-order-id',
      state: FIAT_ORDER_STATES.PENDING,
      account: '0xabc',
      data: {
        paymentMethod: { id: 'pm-1', shortName: 'Bank Transfer' },
        paymentDetails: [],
      },
    };

    renderWithTheme(<V2BankDetails />);

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'Navigation/REPLACE',
        routeName: 'RampOrderProcessing',
      }),
    );
  });

  it('handles 401 error during confirm payment', async () => {
    const error = { status: 401 };
    mockConfirmPayment.mockRejectedValue(error);
    mockLogoutFromProvider.mockResolvedValue(undefined);

    mockOrder = {
      id: 'test-order-id',
      state: FIAT_ORDER_STATES.CREATED,
      account: '0xabc',
      cryptoAmount: '0.05',
      data: {
        fiatAmount: '100',
        fiatCurrency: 'USD',
        exchangeRate: '2000',
        totalFeesFiat: '5',
        paymentMethod: { id: 'pm-1', shortName: 'Bank Transfer' },
        paymentDetails: [
          {
            fields: [{ name: 'Amount', value: '$100.00' }],
          },
        ],
      },
    };

    const { getByTestId } = renderWithTheme(<V2BankDetails />);

    await act(async () => {
      fireEvent.press(getByTestId('main-action-button'));
    });

    await waitFor(() => {
      expect(mockLogoutFromProvider).toHaveBeenCalledWith(false);
    });
  });

  it('handles 401 error during cancel order', async () => {
    const error = { status: 401 };
    mockCancelOrder.mockRejectedValue(error);
    mockLogoutFromProvider.mockResolvedValue(undefined);

    mockOrder = {
      id: 'test-order-id',
      state: FIAT_ORDER_STATES.CREATED,
      account: '0xabc',
      cryptoAmount: '0.05',
      data: {
        fiatAmount: '100',
        fiatCurrency: 'USD',
        exchangeRate: '2000',
        totalFeesFiat: '5',
        paymentMethod: { id: 'pm-1', shortName: 'Bank Transfer' },
        paymentDetails: [
          {
            fields: [{ name: 'Amount', value: '$100.00' }],
          },
        ],
      },
    };

    const { getByText } = renderWithTheme(<V2BankDetails />);

    await act(async () => {
      fireEvent.press(
        getByText('deposit.order_processing.cancel_order_button'),
      );
    });

    await waitFor(() => {
      expect(mockLogoutFromProvider).toHaveBeenCalledWith(false);
    });
  });

  it('renders IBAN and BIC fields when present', () => {
    mockOrder = {
      id: 'test-order-id',
      state: FIAT_ORDER_STATES.CREATED,
      account: '0xabc',
      cryptoAmount: '0.05',
      data: {
        fiatAmount: '100',
        fiatCurrency: 'USD',
        exchangeRate: '2000',
        totalFeesFiat: '5',
        paymentMethod: { id: 'pm-1', shortName: 'Bank Transfer' },
        paymentDetails: [
          {
            fields: [
              { name: 'Amount', value: '€100.00' },
              { name: 'IBAN', value: 'DE89370400440532013000' },
              { name: 'BIC', value: 'COBADEFFXXX' },
            ],
          },
        ],
      },
    };

    const { toJSON } = renderWithTheme(<V2BankDetails />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('shows confirm payment error when confirmPayment fails with non-401', async () => {
    mockConfirmPayment.mockRejectedValue(new Error('Network error'));

    mockOrder = {
      id: 'test-order-id',
      state: FIAT_ORDER_STATES.CREATED,
      account: '0xabc',
      cryptoAmount: '0.05',
      data: {
        fiatAmount: '100',
        fiatCurrency: 'USD',
        exchangeRate: '2000',
        totalFeesFiat: '5',
        paymentMethod: { id: 'pm-1', shortName: 'Bank Transfer' },
        paymentDetails: [
          {
            fields: [{ name: 'Amount', value: '$100.00' }],
          },
        ],
      },
    };

    const { getByTestId, getByText } = renderWithTheme(<V2BankDetails />);

    await act(async () => {
      fireEvent.press(getByTestId('main-action-button'));
    });

    await waitFor(() => {
      expect(getByText('Network error')).toBeOnTheScreen();
    });
  });

  it('shows cancel order error when cancel fails with non-401', async () => {
    mockCancelOrder.mockRejectedValue(new Error('Cancel failed'));

    mockOrder = {
      id: 'test-order-id',
      state: FIAT_ORDER_STATES.CREATED,
      account: '0xabc',
      cryptoAmount: '0.05',
      data: {
        fiatAmount: '100',
        fiatCurrency: 'USD',
        exchangeRate: '2000',
        totalFeesFiat: '5',
        paymentMethod: { id: 'pm-1', shortName: 'Bank Transfer' },
        paymentDetails: [
          {
            fields: [{ name: 'Amount', value: '$100.00' }],
          },
        ],
      },
    };

    const { getByText } = renderWithTheme(<V2BankDetails />);

    await act(async () => {
      fireEvent.press(
        getByText('deposit.order_processing.cancel_order_button'),
      );
    });

    await waitFor(() => {
      expect(
        getByText('deposit.bank_details.cancel_order_error'),
      ).toBeOnTheScreen();
    });
  });
});
