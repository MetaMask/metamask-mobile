import { act, fireEvent } from '@testing-library/react-native';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import Checkout from '.';
import Routes from '../../../../../constants/navigation/Routes';
import { FIAT_ORDER_PROVIDERS } from '../../../../../constants/on-ramp';
import Logger from '../../../../../util/Logger';

const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
}));

const mockSetOptions = jest.fn();
const mockNavigate = jest.fn();
const mockPop = jest.fn();
const mockReset = jest.fn();
const mockDangerouslyGetParent = jest.fn(() => ({ pop: mockPop }));
const mockNavigation = {
  goBack: jest.fn(),
  navigate: mockNavigate,
  reset: mockReset,
  setOptions: mockSetOptions,
  dangerouslyGetParent: mockDangerouslyGetParent,
};
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
}));

const mockDispatchThunk = jest.fn();
jest.mock('../../../../hooks/useThunkDispatch', () => ({
  __esModule: true,
  default: () => mockDispatchThunk,
}));

const mockGetOrderFromCallback = jest.fn();
const mockAddOrder = jest.fn();
const mockAddPrecreatedOrder = jest.fn();
jest.mock('../../../../../core/Engine', () => ({
  context: {
    RampsController: {
      getOrderFromCallback: (...args: unknown[]) =>
        mockGetOrderFromCallback(...args),
      addOrder: (...args: unknown[]) => mockAddOrder(...args),
      addPrecreatedOrder: (...args: unknown[]) =>
        mockAddPrecreatedOrder(...args),
    },
  },
}));

jest.mock('../../../../../core/NotificationManager', () => ({
  showSimpleNotification: jest.fn(),
}));

jest.mock('../../utils/stateHasOrder', () => ({
  __esModule: true,
  default: jest.fn(() => false),
}));

jest.mock('../../utils/getNotificationDetails', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

jest.mock('../../../../../actions/user', () => ({
  protectWalletModalVisible: jest.fn(() => ({
    type: 'PROTECT_WALLET_MODAL_VISIBLE',
  })),
}));

const MOCK_CALLBACK_BASE_URL = 'https://callback.test';

jest.mock('../../Aggregator/sdk', () => ({
  ...jest.requireActual('../../Aggregator/sdk'),
  callbackBaseUrl: 'https://callback.test',
}));

const mockUseParams = jest.fn<Record<string, unknown>, []>(() => ({
  url: 'https://provider.example.com/widget?test=1',
  providerName: 'Test Provider',
}));

jest.mock('../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../util/navigation/navUtils'),
  useParams: () => mockUseParams(),
}));

function render() {
  return renderScreen(Checkout, {
    name: Routes.RAMP.CHECKOUT,
  });
}

describe('Checkout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDispatchThunk.mockImplementation((thunk: unknown) => {
      if (typeof thunk === 'function') {
        thunk(mockDispatch, () => ({}));
      }
    });
    mockUseParams.mockReturnValue({
      url: 'https://provider.example.com/widget?test=1',
      providerName: 'Test Provider',
    });
  });

  it('renders WebView when URL is provided', () => {
    const { getByTestId } = render();
    expect(getByTestId('checkout-webview')).toBeOnTheScreen();
  });

  it('renders close button', () => {
    const { getByTestId } = render();
    expect(getByTestId('checkout-close-button')).toBeOnTheScreen();
  });

  it('renders error view when no URL is provided', () => {
    mockUseParams.mockReturnValue({
      url: '',
      providerName: 'Test Provider',
    });
    const { toJSON } = render();
    expect(toJSON()).toMatchSnapshot();
  });

  it('sets and displays error on http error for initial URL', async () => {
    const { getByTestId, getByText } = render();
    const webview = getByTestId('checkout-webview');

    await act(async () => {
      await webview.props.onHttpError({
        nativeEvent: {
          url: 'https://provider.example.com/widget?test=1',
          statusCode: 500,
        },
      });
    });

    expect(getByText('Try again')).toBeOnTheScreen();
  });

  it('sets and displays error on http error for callback URL', async () => {
    const { getByTestId, toJSON } = render();
    const webview = getByTestId('checkout-webview');

    await act(async () => {
      await webview.props.onHttpError({
        nativeEvent: {
          url: MOCK_CALLBACK_BASE_URL,
          statusCode: 500,
        },
      });
    });

    expect(toJSON()).toMatchSnapshot();
  });

  it('ignores http error for auxiliary resources', async () => {
    const { getByTestId, queryByText } = render();
    const webview = getByTestId('checkout-webview');

    await act(async () => {
      await webview.props.onHttpError({
        nativeEvent: {
          url: 'https://analytics.example.com/track.js',
          statusCode: 404,
        },
      });
    });

    expect(queryByText('Try again')).toBeNull();
  });

  it('retries loading after error by pressing try again', async () => {
    const { getByTestId, getByText } = render();
    const webview = getByTestId('checkout-webview');

    await act(async () => {
      await webview.props.onHttpError({
        nativeEvent: {
          url: 'https://provider.example.com/widget?test=1',
          statusCode: 500,
        },
      });
    });

    const tryAgainButton = getByText('Try again');
    await act(async () => {
      fireEvent.press(tryAgainButton);
    });

    expect(getByTestId('checkout-webview')).toBeOnTheScreen();
  });

  describe('V2 callback flow', () => {
    const V2_PARAMS = {
      url: 'https://provider.example.com/widget?test=1',
      providerName: 'Transak',
      providerCode: 'transak',
      walletAddress: '0xabc',
      network: '1',
      currency: 'USD',
      cryptocurrency: 'ETH',
    };

    const CALLBACK_URL = `${MOCK_CALLBACK_BASE_URL}?orderId=abc-123&status=PENDING`;

    beforeEach(() => {
      mockUseParams.mockReturnValue(V2_PARAMS);
    });

    it('calls addPrecreatedOrder on mount when orderId is provided', () => {
      mockUseParams.mockReturnValue({
        ...V2_PARAMS,
        orderId: '/providers/transak/orders/custom-order-xyz',
      });
      render();
      expect(mockAddPrecreatedOrder).toHaveBeenCalledWith({
        orderId: '/providers/transak/orders/custom-order-xyz',
        providerCode: 'transak',
        walletAddress: '0xabc',
        chainId: '1',
      });
    });

    it('calls addPrecreatedOrder on mount when customOrderId is provided (backward compat)', () => {
      mockUseParams.mockReturnValue({
        ...V2_PARAMS,
        customOrderId: 'custom-order-xyz',
      });
      render();
      expect(mockAddPrecreatedOrder).toHaveBeenCalledWith({
        orderId: 'custom-order-xyz',
        providerCode: 'transak',
        walletAddress: '0xabc',
        chainId: '1',
      });
    });

    it('ignores navigation state changes to non-callback URLs', async () => {
      const { getByTestId } = render();
      const webview = getByTestId('checkout-webview');

      await act(async () => {
        await webview.props.onNavigationStateChange({
          url: 'https://provider.example.com/some-other-page',
          loading: false,
        });
      });

      expect(mockGetOrderFromCallback).not.toHaveBeenCalled();
    });

    it('ignores navigation state change while page is still loading', async () => {
      const { getByTestId } = render();
      const webview = getByTestId('checkout-webview');

      await act(async () => {
        await webview.props.onNavigationStateChange({
          url: CALLBACK_URL,
          loading: true,
        });
      });

      expect(mockGetOrderFromCallback).not.toHaveBeenCalled();
    });

    it('handles callback with empty query params by closing the screen', async () => {
      const { getByTestId } = render();
      const webview = getByTestId('checkout-webview');

      await act(async () => {
        await webview.props.onNavigationStateChange({
          url: MOCK_CALLBACK_BASE_URL,
          loading: false,
        });
      });

      expect(mockPop).toHaveBeenCalled();
    });

    it('handles callback error when getOrderFromCallback returns null', async () => {
      mockGetOrderFromCallback.mockResolvedValue(null);

      const { getByTestId, getByText } = render();
      const webview = getByTestId('checkout-webview');

      await act(async () => {
        await webview.props.onNavigationStateChange({
          url: CALLBACK_URL,
          loading: false,
        });
      });

      expect(
        getByText('Order could not be retrieved from callback'),
      ).toBeOnTheScreen();
    });

    it('navigates to order details even when order IDs are null', async () => {
      mockGetOrderFromCallback.mockResolvedValue({
        status: 'PENDING',
        id: null,
        providerOrderId: null,
      });

      const { getByTestId } = render();
      const webview = getByTestId('checkout-webview');

      await act(async () => {
        await webview.props.onNavigationStateChange({
          url: CALLBACK_URL,
          loading: false,
        });
      });

      expect(mockAddOrder).toHaveBeenCalled();
      expect(mockReset).toHaveBeenCalledWith(
        expect.objectContaining({
          routes: expect.arrayContaining([
            expect.objectContaining({
              name: Routes.RAMP.RAMPS_ORDER_DETAILS,
              params: expect.objectContaining({
                orderId: null,
                showCloseButton: true,
              }),
            }),
          ]),
        }),
      );
    });

    it('successfully creates order from callback with customOrderId', async () => {
      const mockOrder = {
        id: 'order-123',
        providerOrderId: 'provider-123',
        status: 'PENDING',
        fiatAmount: 100,
        cryptoAmount: 0.05,
        totalFeesFiat: 5,
        provider: { id: 'transak', name: 'Transak', links: [] },
        fiatCurrency: { symbol: 'USD', decimals: 2, denomSymbol: '$' },
        cryptoCurrency: { symbol: 'ETH', decimals: 18 },
        createdAt: Date.now(),
        walletAddress: '0xabc',
        network: '1',
        excludeFromPurchases: false,
        orderType: 'BUY',
      };

      mockGetOrderFromCallback.mockResolvedValue(mockOrder);

      mockUseParams.mockReturnValue({
        ...V2_PARAMS,
        customOrderId: 'custom-123',
      });

      const { getByTestId } = render();
      mockDispatch.mockClear();

      const webview = getByTestId('checkout-webview');

      await act(async () => {
        await webview.props.onNavigationStateChange({
          url: CALLBACK_URL,
          loading: false,
        });
      });

      expect(mockGetOrderFromCallback).toHaveBeenCalledWith(
        'transak',
        CALLBACK_URL,
        '0xabc',
      );
      expect(mockAddOrder).toHaveBeenCalledWith(mockOrder);
      expect(mockReset).toHaveBeenCalledWith(
        expect.objectContaining({
          routes: expect.arrayContaining([
            expect.objectContaining({
              name: Routes.RAMP.RAMPS_ORDER_DETAILS,
              params: expect.objectContaining({ showCloseButton: true }),
            }),
          ]),
        }),
      );
    });

    it('navigates to Ramps order details with showCloseButton when providerType is RAMPS_V2', async () => {
      const mockOrder = {
        id: 'order-123',
        providerOrderId: 'provider-123',
        status: 'PENDING',
        fiatAmount: 100,
        cryptoAmount: 0.05,
        totalFeesFiat: 5,
        provider: { id: 'transak', name: 'Transak', links: [] },
        fiatCurrency: { symbol: 'USD', decimals: 2, denomSymbol: '$' },
        cryptoCurrency: { symbol: 'ETH', decimals: 18 },
        createdAt: Date.now(),
        walletAddress: '0xabc',
        network: '1',
        excludeFromPurchases: false,
        orderType: 'BUY',
      };

      mockGetOrderFromCallback.mockResolvedValue(mockOrder);
      mockUseParams.mockReturnValue({
        ...V2_PARAMS,
        providerType: FIAT_ORDER_PROVIDERS.RAMPS_V2,
        customOrderId: 'custom-123',
      });

      const { getByTestId } = render();
      const webview = getByTestId('checkout-webview');

      await act(async () => {
        await webview.props.onNavigationStateChange({
          url: CALLBACK_URL,
          loading: false,
        });
      });

      // For RAMPS_V2, navigation.reset() is used instead of pop() + navigate()
      // to avoid a race condition where pop() removes the ramp modal before
      // navigate() can push the order details screen.
      expect(mockReset).toHaveBeenCalledWith(
        expect.objectContaining({
          routes: expect.arrayContaining([
            expect.objectContaining({
              name: Routes.RAMP.RAMPS_ORDER_DETAILS,
              params: expect.objectContaining({ showCloseButton: true }),
            }),
          ]),
        }),
      );
      expect(mockPop).not.toHaveBeenCalled();
    });

    it('does not navigate to Ramps order details when providerType is not RAMPS_V2', async () => {
      const mockOrder = {
        id: 'order-123',
        providerOrderId: 'provider-123',
        status: 'PENDING',
        fiatAmount: 100,
        cryptoAmount: 0.05,
        totalFeesFiat: 5,
        createdAt: Date.now(),
        walletAddress: '0xabc',
        network: '1',
        excludeFromPurchases: false,
        orderType: 'BUY',
      };

      mockGetOrderFromCallback.mockResolvedValue(mockOrder);
      mockUseParams.mockReturnValue({
        ...V2_PARAMS,
        customOrderId: 'custom-123',
      });

      const { getByTestId } = render();
      const webview = getByTestId('checkout-webview');

      await act(async () => {
        await webview.props.onNavigationStateChange({
          url: CALLBACK_URL,
          loading: false,
        });
      });

      expect(mockNavigate).not.toHaveBeenCalledWith(
        Routes.RAMP.RAMPS_ORDER_DETAILS,
        expect.anything(),
      );
    });

    it('navigates to order details with null orderId when order IDs are missing', async () => {
      const mockOrder = {
        id: null,
        providerOrderId: null,
        status: 'PENDING',
        fiatAmount: 100,
        cryptoAmount: 0.05,
        totalFeesFiat: 5,
        createdAt: Date.now(),
        walletAddress: '0xabc',
        network: '1',
        excludeFromPurchases: false,
        orderType: 'BUY',
      };

      mockGetOrderFromCallback.mockResolvedValue(mockOrder);

      mockUseParams.mockReturnValue({
        ...V2_PARAMS,
        customOrderId: 'custom-fallback-123',
      });

      const { getByTestId } = render();
      const webview = getByTestId('checkout-webview');

      await act(async () => {
        await webview.props.onNavigationStateChange({
          url: CALLBACK_URL,
          loading: false,
        });
      });

      expect(mockAddOrder).toHaveBeenCalledWith(mockOrder);
      expect(mockReset).toHaveBeenCalledWith(
        expect.objectContaining({
          routes: expect.arrayContaining([
            expect.objectContaining({
              name: Routes.RAMP.RAMPS_ORDER_DETAILS,
              params: expect.objectContaining({
                orderId: null,
                showCloseButton: true,
              }),
            }),
          ]),
        }),
      );
    });

    it('does not process callback twice when already handled', async () => {
      mockGetOrderFromCallback.mockResolvedValue({
        id: 'order-123',
        providerOrderId: 'provider-123',
        status: 'PENDING',
        fiatAmount: 100,
        cryptoAmount: 0.05,
        totalFeesFiat: 5,
        createdAt: Date.now(),
        walletAddress: '0xabc',
        network: '1',
        excludeFromPurchases: false,
        orderType: 'BUY',
      });

      const { getByTestId } = render();
      const webview = getByTestId('checkout-webview');

      await act(async () => {
        await webview.props.onNavigationStateChange({
          url: CALLBACK_URL,
          loading: false,
        });
      });

      mockGetOrderFromCallback.mockClear();

      await act(async () => {
        await webview.props.onNavigationStateChange({
          url: CALLBACK_URL,
          loading: false,
        });
      });

      expect(mockGetOrderFromCallback).not.toHaveBeenCalled();
    });

    it('logs error on callback failure', async () => {
      const testError = new Error('Network failure');
      mockGetOrderFromCallback.mockRejectedValue(testError);
      const mockLoggerError = jest.spyOn(Logger, 'error');

      const { getByTestId } = render();
      const webview = getByTestId('checkout-webview');

      await act(async () => {
        await webview.props.onNavigationStateChange({
          url: CALLBACK_URL,
          loading: false,
        });
      });

      expect(mockLoggerError).toHaveBeenCalledWith(testError, {
        message: 'UnifiedCheckout: error handling callback',
      });
    });
  });
});
