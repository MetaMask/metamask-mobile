import { act, fireEvent } from '@testing-library/react-native';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import Checkout from '.';
import { createInitialFiatOrder } from './Checkout';
import Routes from '../../../../../constants/navigation/Routes';
import { FIAT_ORDER_PROVIDERS } from '../../../../../constants/on-ramp';
import Logger from '../../../../../util/Logger';

const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
}));

const mockSetOptions = jest.fn();
const mockPop = jest.fn();
const mockDangerouslyGetParent = jest.fn(() => ({ pop: mockPop }));
const mockNavigation = {
  goBack: jest.fn(),
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
jest.mock('../../../../../core/Engine', () => ({
  context: {
    RampsController: {
      getOrderFromCallback: (...args: unknown[]) =>
        mockGetOrderFromCallback(...args),
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

    it('dispatches addFiatCustomIdData on mount when customOrderId is provided', () => {
      mockUseParams.mockReturnValue({
        ...V2_PARAMS,
        customOrderId: 'custom-order-xyz',
      });
      render();
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'FIAT_ADD_CUSTOM_ID_DATA' }),
      );
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

    it('handles callback error when order has no ID', async () => {
      mockGetOrderFromCallback.mockResolvedValue({
        status: 'PENDING',
        id: null,
        providerOrderId: null,
      });

      const { getByTestId, getByText } = render();
      const webview = getByTestId('checkout-webview');

      await act(async () => {
        await webview.props.onNavigationStateChange({
          url: CALLBACK_URL,
          loading: false,
        });
      });

      expect(
        getByText('Order response did not contain an order ID'),
      ).toBeOnTheScreen();
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
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'FIAT_REMOVE_CUSTOM_ID_DATA' }),
      );
      expect(mockDangerouslyGetParent).toHaveBeenCalled();
    });

    it('uses customOrderId as fallback when order IDs are missing', async () => {
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

      expect(mockDangerouslyGetParent).toHaveBeenCalled();
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

  describe('createInitialFiatOrder', () => {
    const baseParams = {
      providerCode: 'transak',
      providerName: 'Transak',
      orderId: 'order-123',
      walletAddress: '0xabc',
      network: '1',
      currency: 'USD',
      cryptocurrency: 'ETH',
    };

    it('builds order with nav params only (no rampsOrder)', () => {
      const order = createInitialFiatOrder(baseParams);
      expect(order.id).toBe('/providers/transak/orders/order-123');
      expect(order.provider).toBe(FIAT_ORDER_PROVIDERS.RAMPS_V2);
      expect(order.currency).toBe('USD');
      expect(order.cryptocurrency).toBe('ETH');
      expect(order.network).toBe('1');
      expect(order.account).toBe('0xabc');
    });

    it('uses rampsOrder data when provided', () => {
      const rampsOrder = {
        id: 'ramp-order-456',
        providerOrderId: 'provider-456',
        status: 'COMPLETED',
        fiatAmount: 100,
        cryptoAmount: 0.05,
        totalFeesFiat: 5,
        provider: { id: 'transak', name: 'Transak', links: [] },
        fiatCurrency: { symbol: 'EUR', decimals: 2, denomSymbol: '\u20ac' },
        cryptoCurrency: { symbol: 'ETH', decimals: 18 },
        createdAt: 1000,
        walletAddress: '0xabc',
        network: '1',
        excludeFromPurchases: false,
        orderType: 'BUY',
        txHash: '0xtxhash',
      };

      const order = createInitialFiatOrder({
        ...baseParams,
        rampsOrder: rampsOrder as never,
      });
      expect(order.currency).toBe('EUR');
      expect(order.currencySymbol).toBe('\u20ac');
      expect(order.amount).toBe(100);
      expect(order.txHash).toBe('0xtxhash');
    });

    it('sets forceUpdate to false for terminal states', () => {
      const order = createInitialFiatOrder({
        ...baseParams,
        rampsOrder: {
          status: 'COMPLETED',
          fiatAmount: 100,
          cryptoAmount: 0.05,
          totalFeesFiat: 5,
          createdAt: 1000,
          walletAddress: '0xabc',
          network: '1',
          excludeFromPurchases: false,
          orderType: 'BUY',
        } as never,
      });
      expect(order.forceUpdate).toBe(false);
    });

    it('defaults providerType to RAMPS_V2', () => {
      const order = createInitialFiatOrder(baseParams);
      expect(order.provider).toBe(FIAT_ORDER_PROVIDERS.RAMPS_V2);
    });
  });
});
