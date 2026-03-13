import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import V2BankDetails from './BankDetails';
import { ThemeContext, mockTheme } from '../../../../../util/theme';
import type { RampsOrder } from '@metamask/ramps-controller';

const mockNavigate = jest.fn();
const mockReplace = jest.fn();
const mockSetOptions = jest.fn();
const mockDispatch = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    replace: mockReplace,
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

let mockShouldUpdate = true;
jest.mock('../../../../../util/navigation/navUtils', () => ({
  createNavigationDetails:
    (..._args: unknown[]) =>
    (params: unknown) => ['MockRoute', params],
  useParams: () => ({
    orderId: 'test-order-id',
    shouldUpdate: mockShouldUpdate,
  }),
}));

jest.mock('../../../../../util/theme', () => {
  const { mockTheme } = jest.requireActual('../../../../../util/theme');
  return {
    ...jest.requireActual('../../../../../util/theme'),
    useTheme: () => mockTheme,
  };
});

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

const mockGetOrderById = jest.fn();
const mockRefreshOrder = jest.fn();
const mockRemoveOrder = jest.fn();
const mockAddOrder = jest.fn();

jest.mock('../../hooks/useRampsOrders', () => ({
  useRampsOrders: () => ({
    orders: [],
    getOrderById: mockGetOrderById,
    addOrder: mockAddOrder,
    removeOrder: mockRemoveOrder,
    refreshOrder: mockRefreshOrder,
    getOrderFromCallback: jest.fn(),
  }),
  default: () => ({
    orders: [],
    getOrderById: mockGetOrderById,
    addOrder: mockAddOrder,
    removeOrder: mockRemoveOrder,
    refreshOrder: mockRefreshOrder,
    getOrderFromCallback: jest.fn(),
  }),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: (selector: unknown) => {
    if (typeof selector === 'function') {
      return (selector as () => unknown)();
    }
    return undefined;
  },
  useDispatch: () => jest.fn(),
}));

const MOCK_PAYMENT_DETAILS = [
  {
    fiatCurrency: 'USD',
    paymentMethod: 'bank_transfer',
    fields: [
      { name: 'Amount', id: 'amount', value: '$100.00' },
      { name: 'First Name (Beneficiary)', id: 'first_name', value: 'john' },
      { name: 'Last Name (Beneficiary)', id: 'last_name', value: 'doe' },
      { name: 'Account Number', id: 'account_number', value: '123456789' },
      { name: 'Routing Number', id: 'routing_number', value: '987654321' },
      { name: 'Account Type', id: 'account_type', value: 'checking' },
      { name: 'Bank Name', id: 'bank_name', value: 'test bank' },
    ],
  },
];

function createMockV2Order(
  overrides: Partial<RampsOrder> = {},
): Partial<RampsOrder> {
  return {
    providerOrderId: 'test-order-id',
    status: 'CREATED' as RampsOrder['status'],
    walletAddress: '0xabc',
    cryptoAmount: '0.05',
    fiatAmount: 100,
    fiatCurrency: { symbol: 'USD' },
    exchangeRate: 2000,
    totalFeesFiat: 5,
    txHash: '',
    isOnlyLink: false,
    success: true,
    providerOrderLink: '',
    createdAt: Date.now(),
    network: { name: 'Ethereum', chainId: 'eip155:1' },
    canBeUpdated: false,
    idHasExpired: false,
    excludeFromPurchases: false,
    timeDescriptionPending: '',
    orderType: 'BUY',
    provider: {
      id: '/providers/transak-native',
      name: 'Transak',
      environmentType: 'production',
      description: '',
      hqAddress: '',
      links: [],
      logos: { light: '', dark: '', height: 0, width: 0 },
    },
    paymentMethod: { id: 'pm-1', shortName: 'Bank Transfer' },
    paymentDetails: MOCK_PAYMENT_DETAILS,
    ...overrides,
  };
}

function createMockDepositOrder(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: 'test-order-id',
    walletAddress: '0xabc',
    fiatAmount: 100,
    cryptoAmount: '0.05',
    exchangeRate: 2000,
    totalFeesFiat: 5,
    fiatCurrency: 'USD',
    paymentMethod: { id: 'pm-1', shortName: 'Bank Transfer' },
    paymentDetails: MOCK_PAYMENT_DETAILS,
    network: { chainId: 'eip155:1' },
    cryptoCurrency: { assetId: 'asset1', symbol: 'ETH' },
    ...overrides,
  };
}

const renderWithTheme = (component: React.ReactElement) =>
  render(
    <ThemeContext.Provider value={mockTheme}>
      {component}
    </ThemeContext.Provider>,
  );

describe('V2BankDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockShouldUpdate = true;
    mockGetOrderById.mockReturnValue(undefined);
    mockRefreshOrder.mockResolvedValue(undefined);
  });

  it('matches snapshot when order is null (loading)', () => {
    const { toJSON } = renderWithTheme(<V2BankDetails />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders loader when order is not available', () => {
    const { getByTestId } = renderWithTheme(<V2BankDetails />);
    expect(getByTestId('loader')).toBeOnTheScreen();
  });

  it('matches snapshot with order data and depositOrder from refresh', async () => {
    mockGetOrderById.mockReturnValue(createMockV2Order());
    mockGetOrder.mockResolvedValue(createMockDepositOrder());

    const { toJSON } = renderWithTheme(<V2BankDetails />);

    await waitFor(() => {
      expect(mockGetOrder).toHaveBeenCalled();
    });

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders bank detail rows when order has payment details', async () => {
    mockGetOrderById.mockReturnValue(
      createMockV2Order({
        paymentDetails: [
          {
            fiatCurrency: 'USD',
            paymentMethod: 'bank_transfer',
            fields: [
              { name: 'Amount', id: 'amount', value: '$100.00' },
              {
                name: 'Account Number',
                id: 'account_number',
                value: '123456789',
              },
            ],
          },
        ],
      }),
    );
    mockGetOrder.mockResolvedValue(
      createMockDepositOrder({
        paymentDetails: [
          {
            fiatCurrency: 'USD',
            paymentMethod: 'bank_transfer',
            fields: [
              { name: 'Amount', id: 'amount', value: '$100.00' },
              {
                name: 'Account Number',
                id: 'account_number',
                value: '123456789',
              },
            ],
          },
        ],
      }),
    );

    const { getByText } = renderWithTheme(<V2BankDetails />);

    await waitFor(() => {
      expect(getByText('deposit.bank_details.main_title')).toBeOnTheScreen();
    });
  });

  it('renders the refresh control scroll view', () => {
    mockGetOrderById.mockReturnValue(createMockV2Order({ paymentDetails: [] }));

    const { getByTestId } = renderWithTheme(<V2BankDetails />);
    expect(
      getByTestId('bank-details-refresh-control-scrollview'),
    ).toBeOnTheScreen();
  });

  it('toggles bank info when show/hide button is pressed', async () => {
    mockGetOrderById.mockReturnValue(
      createMockV2Order({
        paymentDetails: [
          {
            fiatCurrency: 'USD',
            paymentMethod: 'bank_transfer',
            fields: [
              { name: 'Amount', id: 'amount', value: '$100.00' },
              { name: 'Bank Name', id: 'bank_name', value: 'test bank' },
              {
                name: 'Bank Address',
                id: 'bank_address',
                value: '123 Bank St',
              },
              {
                name: 'Recipient Address',
                id: 'recipient_address',
                value: '456 Beneficiary Ave',
              },
            ],
          },
        ],
      }),
    );
    mockGetOrder.mockResolvedValue(
      createMockDepositOrder({
        paymentDetails: [
          {
            fiatCurrency: 'USD',
            paymentMethod: 'bank_transfer',
            fields: [
              { name: 'Amount', id: 'amount', value: '$100.00' },
              { name: 'Bank Name', id: 'bank_name', value: 'test bank' },
              {
                name: 'Bank Address',
                id: 'bank_address',
                value: '123 Bank St',
              },
              {
                name: 'Recipient Address',
                id: 'recipient_address',
                value: '456 Beneficiary Ave',
              },
            ],
          },
        ],
      }),
    );

    const { getByText, queryByText } = renderWithTheme(<V2BankDetails />);

    await waitFor(() => {
      expect(
        getByText('deposit.bank_details.show_bank_info'),
      ).toBeOnTheScreen();
    });

    expect(queryByText('Test Bank')).toBeNull();

    fireEvent.press(getByText('deposit.bank_details.show_bank_info'));

    expect(getByText('Test Bank')).toBeOnTheScreen();
  });

  it('handles confirm payment button press', async () => {
    mockConfirmPayment.mockResolvedValue(undefined);
    mockGetOrderById.mockReturnValue(createMockV2Order());
    mockGetOrder.mockResolvedValue(createMockDepositOrder());

    const { getByTestId } = renderWithTheme(<V2BankDetails />);

    await waitFor(() => {
      expect(mockGetOrder).toHaveBeenCalled();
    });

    await act(async () => {
      fireEvent.press(getByTestId('main-action-button'));
    });

    await waitFor(() => {
      expect(mockConfirmPayment).toHaveBeenCalledWith('test-order-id', 'pm-1');
    });
  });

  it('handles cancel order button press', async () => {
    mockCancelOrder.mockResolvedValue(undefined);
    mockGetOrderById.mockReturnValue(createMockV2Order());
    mockGetOrder.mockResolvedValue(createMockDepositOrder());

    const { getByText } = renderWithTheme(<V2BankDetails />);

    await waitFor(() => {
      expect(mockGetOrder).toHaveBeenCalled();
    });

    await act(async () => {
      fireEvent.press(
        getByText('deposit.order_processing.cancel_order_button'),
      );
    });

    await waitFor(() => {
      expect(mockCancelOrder).toHaveBeenCalledWith('test-order-id');
    });
  });

  it('replaces current screen with RAMPS_ORDER_DETAILS when order status is CANCELLED', () => {
    mockGetOrderById.mockReturnValue(
      createMockV2Order({ status: 'CANCELLED' as RampsOrder['status'] }),
    );

    renderWithTheme(<V2BankDetails />);

    expect(mockReplace).toHaveBeenCalledWith('RampsOrderDetails', {
      orderId: 'test-order-id',
      showCloseButton: true,
    });
  });

  it('replaces current screen with RAMPS_ORDER_DETAILS when order status is PENDING', () => {
    mockGetOrderById.mockReturnValue(
      createMockV2Order({ status: 'PENDING' as RampsOrder['status'] }),
    );

    renderWithTheme(<V2BankDetails />);

    expect(mockReplace).toHaveBeenCalledWith('RampsOrderDetails', {
      orderId: 'test-order-id',
      showCloseButton: true,
    });
  });

  it('handles 401 error during confirm payment', async () => {
    const error = { httpStatus: 401 };
    mockConfirmPayment.mockRejectedValue(error);
    mockLogoutFromProvider.mockResolvedValue(undefined);
    mockGetOrderById.mockReturnValue(createMockV2Order());
    mockGetOrder.mockResolvedValue(createMockDepositOrder());

    const { getByTestId } = renderWithTheme(<V2BankDetails />);

    await waitFor(() => {
      expect(mockGetOrder).toHaveBeenCalled();
    });

    await act(async () => {
      fireEvent.press(getByTestId('main-action-button'));
    });

    await waitFor(() => {
      expect(mockLogoutFromProvider).toHaveBeenCalledWith(false);
    });
  });

  it('handles 401 error during cancel order', async () => {
    const error = { httpStatus: 401 };
    mockCancelOrder.mockRejectedValue(error);
    mockLogoutFromProvider.mockResolvedValue(undefined);
    mockGetOrderById.mockReturnValue(createMockV2Order());
    mockGetOrder.mockResolvedValue(createMockDepositOrder());

    const { getByText } = renderWithTheme(<V2BankDetails />);

    await waitFor(() => {
      expect(mockGetOrder).toHaveBeenCalled();
    });

    await act(async () => {
      fireEvent.press(
        getByText('deposit.order_processing.cancel_order_button'),
      );
    });

    await waitFor(() => {
      expect(mockLogoutFromProvider).toHaveBeenCalledWith(false);
    });
  });

  it('renders IBAN and BIC fields when present', async () => {
    const sepaPaymentDetails = [
      {
        fiatCurrency: 'EUR',
        paymentMethod: 'sepa',
        fields: [
          { name: 'Amount', id: 'amount', value: '€100.00' },
          { name: 'IBAN', id: 'iban', value: 'DE89370400440532013000' },
          { name: 'BIC', id: 'bic', value: 'COBADEFFXXX' },
        ],
      },
    ];
    mockGetOrderById.mockReturnValue(
      createMockV2Order({ paymentDetails: sepaPaymentDetails }),
    );
    mockGetOrder.mockResolvedValue(
      createMockDepositOrder({ paymentDetails: sepaPaymentDetails }),
    );

    const { toJSON } = renderWithTheme(<V2BankDetails />);

    await waitFor(() => {
      expect(mockGetOrder).toHaveBeenCalled();
    });

    expect(toJSON()).toMatchSnapshot();
  });

  it('shows confirm payment error when confirmPayment fails with non-401', async () => {
    mockConfirmPayment.mockRejectedValue(new Error('Network error'));
    mockGetOrderById.mockReturnValue(createMockV2Order());
    mockGetOrder.mockResolvedValue(createMockDepositOrder());

    const { getByTestId, getByText } = renderWithTheme(<V2BankDetails />);

    await waitFor(() => {
      expect(mockGetOrder).toHaveBeenCalled();
    });

    await act(async () => {
      fireEvent.press(getByTestId('main-action-button'));
    });

    await waitFor(() => {
      expect(getByText('Network error')).toBeOnTheScreen();
    });
  });

  it('shows cancel order error when cancel fails with non-401', async () => {
    mockCancelOrder.mockRejectedValue(new Error('Cancel failed'));
    mockGetOrderById.mockReturnValue(createMockV2Order());
    mockGetOrder.mockResolvedValue(createMockDepositOrder());

    const { getByText } = renderWithTheme(<V2BankDetails />);

    await waitFor(() => {
      expect(mockGetOrder).toHaveBeenCalled();
    });

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

  it('matches snapshot with both buttons disabled while confirm payment loads', async () => {
    let resolveConfirm!: () => void;
    mockConfirmPayment.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveConfirm = resolve;
      }),
    );
    mockGetOrderById.mockReturnValue(createMockV2Order());
    mockGetOrder.mockResolvedValue(createMockDepositOrder());

    const { toJSON, getByTestId } = renderWithTheme(<V2BankDetails />);

    await waitFor(() => {
      expect(mockGetOrder).toHaveBeenCalled();
    });

    await act(async () => {
      fireEvent.press(getByTestId('main-action-button'));
      await Promise.resolve();
    });

    expect(toJSON()).toMatchSnapshot();

    await act(async () => {
      resolveConfirm();
    });
  });

  it('matches snapshot with both buttons disabled while cancel order loads', async () => {
    let resolveCancel!: () => void;
    mockCancelOrder.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveCancel = resolve;
      }),
    );
    mockGetOrderById.mockReturnValue(createMockV2Order());
    mockGetOrder.mockResolvedValue(createMockDepositOrder());

    const { toJSON, getByText } = renderWithTheme(<V2BankDetails />);

    await waitFor(() => {
      expect(mockGetOrder).toHaveBeenCalled();
    });

    await act(async () => {
      fireEvent.press(
        getByText('deposit.order_processing.cancel_order_button'),
      );
      await Promise.resolve();
    });

    expect(toJSON()).toMatchSnapshot();

    await act(async () => {
      resolveCancel();
    });
  });

  describe('when shouldUpdate is false', () => {
    beforeEach(() => {
      mockShouldUpdate = false;
    });

    it('reads paymentDetails from the controller order without calling getDepositOrder', () => {
      mockGetOrderById.mockReturnValue(createMockV2Order());

      const { queryByTestId, getByText } = renderWithTheme(<V2BankDetails />);

      expect(mockGetOrder).not.toHaveBeenCalled();
      expect(queryByTestId('loader')).toBeNull();
      expect(getByText('deposit.bank_details.main_title')).toBeOnTheScreen();
    });

    it('matches snapshot showing bank details from controller order', () => {
      mockGetOrderById.mockReturnValue(createMockV2Order());

      const { toJSON } = renderWithTheme(<V2BankDetails />);

      expect(toJSON()).toMatchSnapshot();
    });

    it('confirms payment using paymentMethod from controller order', async () => {
      mockConfirmPayment.mockResolvedValue(undefined);
      mockGetOrder.mockResolvedValue(createMockDepositOrder());
      mockGetOrderById.mockReturnValue(createMockV2Order());

      const { getByTestId } = renderWithTheme(<V2BankDetails />);

      await act(async () => {
        fireEvent.press(getByTestId('main-action-button'));
      });

      await waitFor(() => {
        expect(mockConfirmPayment).toHaveBeenCalledWith(
          'test-order-id',
          'pm-1',
        );
      });
    });
  });
});
