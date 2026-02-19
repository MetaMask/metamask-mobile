import React from 'react';
import { act, render, fireEvent } from '@testing-library/react-native';
import Checkout, { createInitialFiatOrder } from './Checkout';
import { ThemeContext, mockTheme } from '../../../../../util/theme';
import { FIAT_ORDER_PROVIDERS } from '../../../../../constants/on-ramp';

const mockNavigate = jest.fn();
const mockSetOptions = jest.fn();
const mockGoBack = jest.fn();
const mockDangerouslyGetParent = jest.fn(() => ({ pop: jest.fn() }));

const mockOnCloseBottomSheet = jest.fn();
const mockDispatch = jest.fn();
const mockDispatchThunk = jest.fn();
const mockGetOrderFromCallback = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    setOptions: mockSetOptions,
    goBack: mockGoBack,
    dangerouslyGetParent: mockDangerouslyGetParent,
  }),
  useRoute: () => ({
    params: {
      url: 'https://provider.example.com/widget?test=1',
      providerName: 'Test Provider',
    },
  }),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
}));

jest.mock('../../../../hooks/useThunkDispatch', () => ({
  __esModule: true,
  default: () => mockDispatchThunk,
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
  I18nEvents: {
    addListener: jest.fn(),
  },
}));

jest.mock('../../../Navbar', () => ({
  getDepositNavbarOptions: jest.fn(() => ({})),
}));

jest.mock('../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../util/navigation/navUtils'),
  useParams: jest.fn(() => ({
    url: 'https://provider.example.com/widget?test=1',
    providerName: 'Test Provider',
  })),
}));

jest.mock('../../../../../util/browser', () => ({
  shouldStartLoadWithRequest: jest.fn(() => true),
}));

jest.mock('../../../../../util/Logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
}));

// Must match actual callbackBaseUrl from Aggregator/sdk (UAT) so navState.url.startsWith() passes
const MOCK_CALLBACK_BASE_URL =
  'https://on-ramp-content.uat-api.cx.metamask.io/regions/fake-callback';

jest.mock('../../Aggregator/sdk', () => ({
  useRampSDK: jest.fn(() => ({
    selectedPaymentMethodId: null,
    selectedRegion: null,
    selectedAsset: null,
    selectedFiatCurrencyId: null,
    isBuy: true,
  })),
  callbackBaseUrl: MOCK_CALLBACK_BASE_URL,
}));

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

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const mockReact = jest.requireActual('react');
    return {
      __esModule: true,
      default: mockReact.forwardRef(
        (
          {
            children,
          }: {
            children: React.ReactNode;
          },
          ref: React.Ref<unknown>,
        ) => {
          mockReact.useImperativeHandle(ref, () => ({
            onCloseBottomSheet: mockOnCloseBottomSheet,
          }));
          return <>{children}</>;
        },
      ),
    };
  },
);

const renderCheckout = () =>
  render(
    <ThemeContext.Provider value={mockTheme}>
      <Checkout />
    </ThemeContext.Provider>,
  );

describe('Checkout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDispatchThunk.mockImplementation((thunk: unknown) => {
      if (typeof thunk === 'function') {
        thunk(mockDispatch, () => ({}));
      }
    });
  });

  it('renders correctly with valid URL', () => {
    const { toJSON } = renderCheckout();
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders WebView when URL is provided', () => {
    const { getByTestId } = renderCheckout();
    expect(getByTestId('checkout-webview')).toBeOnTheScreen();
  });

  it('renders close button', () => {
    const { getByTestId } = renderCheckout();
    expect(getByTestId('checkout-close-button')).toBeOnTheScreen();
  });

  it('passes userAgent to WebView when provided in params', () => {
    const useParamsMock = jest.requireMock<
      typeof import('../../../../../util/navigation/navUtils')
    >('../../../../../util/navigation/navUtils').useParams as jest.Mock;

    useParamsMock.mockReturnValue({
      url: 'https://provider.example.com/widget',
      providerName: 'Test Provider',
      userAgent: 'CustomProvider/1.0 (MetaMask)',
    });

    const { getByTestId } = renderCheckout();

    const webview = getByTestId('checkout-webview');
    expect(webview.props.userAgent).toBe('CustomProvider/1.0 (MetaMask)');

    useParamsMock.mockReturnValue({
      url: 'https://provider.example.com/widget?test=1',
      providerName: 'Test Provider',
    });
  });

  it('does not show error view for auxiliary resource HTTP errors', () => {
    const { getByTestId, queryByText } = renderCheckout();

    const webview = getByTestId('checkout-webview');

    fireEvent(webview, 'onHttpError', {
      nativeEvent: {
        url: 'https://analytics.example.com/track.js',
        statusCode: 404,
      },
    });

    expect(
      queryByText('fiat_on_ramp_aggregator.webview_received_error'),
    ).not.toBeOnTheScreen();
  });

  it('shows error view on HTTP error for initial URL', () => {
    const { getByTestId, getByText } = renderCheckout();

    const webview = getByTestId('checkout-webview');

    fireEvent(webview, 'onHttpError', {
      nativeEvent: {
        url: 'https://provider.example.com/widget?test=1',
        statusCode: 500,
      },
    });

    expect(
      getByText('fiat_on_ramp_aggregator.webview_received_error'),
    ).toBeOnTheScreen();
  });

  describe('V2 callback flow', () => {
    const getUseParamsMock = () =>
      jest.requireMock<
        typeof import('../../../../../util/navigation/navUtils')
      >('../../../../../util/navigation/navUtils').useParams as jest.Mock;

    const CALLBACK_URL = `${MOCK_CALLBACK_BASE_URL}?orderId=abc-123&status=PENDING`;

    const V2_PARAMS = {
      url: 'https://provider.example.com/widget?test=1',
      providerName: 'Transak',
      providerCode: 'transak',
      walletAddress: '0xabc',
      network: '1',
      currency: 'USD',
      cryptocurrency: 'ETH',
    };

    const renderV2Checkout = () => {
      getUseParamsMock().mockReturnValue(V2_PARAMS);
      return renderCheckout();
    };

    it('dispatches addFiatCustomIdData on mount when customOrderId, walletAddress and network are provided', () => {
      getUseParamsMock().mockReturnValue({
        ...V2_PARAMS,
        customOrderId: 'custom-order-xyz',
      });
      renderCheckout();

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'FIAT_ADD_CUSTOM_ID_DATA' }),
      );
    });

    it('does not dispatch addFiatCustomIdData when customOrderId is missing', () => {
      renderV2Checkout();
      // addFiatCustomIdData requires customOrderId; without it, no dispatch on mount
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('does not trigger callback flow when providerCode is missing', async () => {
      getUseParamsMock().mockReturnValue({
        url: 'https://provider.example.com/widget?test=1',
        providerName: 'Transak',
        walletAddress: '0xabc',
      });

      const { getByTestId } = renderCheckout();
      const webview = getByTestId('checkout-webview');

      await act(async () => {
        fireEvent(webview, 'onNavigationStateChange', {
          url: CALLBACK_URL,
          loading: false,
        });
      });

      expect(mockGetOrderFromCallback).not.toHaveBeenCalled();
    });

    it('handles callback with empty query params by closing the screen', async () => {
      const callbackUrlNoParams = MOCK_CALLBACK_BASE_URL;

      const { getByTestId } = renderV2Checkout();
      const webview = getByTestId('checkout-webview');

      await act(async () => {
        fireEvent(webview, 'onNavigationStateChange', {
          url: callbackUrlNoParams,
          loading: false,
        });
      });

      expect(mockDangerouslyGetParent).toHaveBeenCalled();
    });

    it('handles callback error when getOrderFromCallback returns null', async () => {
      mockGetOrderFromCallback.mockResolvedValue(null);

      const { getByTestId, getByText } = renderV2Checkout();
      const webview = getByTestId('checkout-webview');

      await act(async () => {
        fireEvent(webview, 'onNavigationStateChange', {
          url: CALLBACK_URL,
          loading: false,
        });
      });

      await act(async () => {
        await Promise.resolve();
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

      const { getByTestId, getByText } = renderV2Checkout();
      const webview = getByTestId('checkout-webview');

      await act(async () => {
        fireEvent(webview, 'onNavigationStateChange', {
          url: CALLBACK_URL,
          loading: false,
        });
      });

      await act(async () => {
        await Promise.resolve();
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

      getUseParamsMock().mockReturnValue({
        ...V2_PARAMS,
        customOrderId: 'custom-123',
      });

      const { getByTestId } = renderCheckout();
      const webview = getByTestId('checkout-webview');

      await act(async () => {
        fireEvent(webview, 'onNavigationStateChange', {
          url: CALLBACK_URL,
          loading: false,
        });
      });

      await act(async () => {
        await Promise.resolve();
      });

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

      getUseParamsMock().mockReturnValue({
        ...V2_PARAMS,
        customOrderId: 'custom-fallback-123',
      });

      const { getByTestId } = renderCheckout();
      const webview = getByTestId('checkout-webview');

      await act(async () => {
        fireEvent(webview, 'onNavigationStateChange', {
          url: CALLBACK_URL,
          loading: false,
        });
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockDangerouslyGetParent).toHaveBeenCalled();
    });

    it('does not process callback twice when already handled', async () => {
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

      const { getByTestId } = renderV2Checkout();
      const webview = getByTestId('checkout-webview');

      await act(async () => {
        fireEvent(webview, 'onNavigationStateChange', {
          url: CALLBACK_URL,
          loading: false,
        });
      });

      await act(async () => {
        await Promise.resolve();
      });

      mockGetOrderFromCallback.mockClear();

      await act(async () => {
        fireEvent(webview, 'onNavigationStateChange', {
          url: CALLBACK_URL,
          loading: false,
        });
      });

      expect(mockGetOrderFromCallback).not.toHaveBeenCalled();
    });

    it('ignores navigation state changes to non-callback URLs', async () => {
      const { getByTestId } = renderV2Checkout();
      const webview = getByTestId('checkout-webview');

      await act(async () => {
        fireEvent(webview, 'onNavigationStateChange', {
          url: 'https://provider.example.com/some-other-page',
          loading: false,
        });
      });

      expect(mockGetOrderFromCallback).not.toHaveBeenCalled();
    });

    it('ignores navigation state change while page is still loading', async () => {
      const { getByTestId } = renderV2Checkout();
      const webview = getByTestId('checkout-webview');

      await act(async () => {
        fireEvent(webview, 'onNavigationStateChange', {
          url: CALLBACK_URL,
          loading: true,
        });
      });

      expect(mockGetOrderFromCallback).not.toHaveBeenCalled();
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
      expect(order.provider).toBe(FIAT_ORDER_PROVIDERS.AGGREGATOR);
      expect(order.account).toBe('0xabc');
      expect(order.network).toBe('1');
      expect(order.currency).toBe('USD');
      expect(order.cryptocurrency).toBe('ETH');
      expect(order.state).toBe('PENDING');
      expect(order.forceUpdate).toBe(true);
      expect(order.errorCount).toBe(0);
      expect(
        (order.data as { provider: { id: string; name: string } }).provider,
      ).toEqual({
        id: 'transak',
        name: 'Transak',
      });
    });

    it('uses rampsOrder when provided and merges into data', () => {
      const rampsOrder = {
        status: 'PENDING',
        provider: { id: '/providers/transak', name: 'Transak', links: [] },
        fiatCurrency: { symbol: 'USD', decimals: 2, denomSymbol: '$' },
        cryptoCurrency: { symbol: 'ETH', decimals: 18 },
        fiatAmount: 100,
        totalFeesFiat: 5,
        cryptoAmount: 0.05,
        walletAddress: '0xabc',
        network: '1',
        createdAt: 2000000,
        txHash: '0xhash',
        excludeFromPurchases: false,
        orderType: 'BUY',
        providerOrderId: 'provider-123',
        providerOrderLink: 'https://transak.com/order/123',
        paymentMethod: { id: '/payments/card', name: 'Card' },
        exchangeRate: 2000,
      } as unknown as Parameters<
        typeof createInitialFiatOrder
      >[0]['rampsOrder'];

      const order = createInitialFiatOrder({ ...baseParams, rampsOrder });

      expect(order.amount).toBe(100);
      expect(order.fee).toBe(5);
      expect(order.cryptoAmount).toBe(0.05);
      expect(order.currencySymbol).toBe('$');
      expect(order.txHash).toBe('0xhash');
      expect(order.createdAt).toBe(2000000);
      expect((order.data as { _v2Order: unknown })._v2Order).toEqual(
        rampsOrder,
      );
    });

    it('sets forceUpdate to false for terminal states', () => {
      const rampsOrder = {
        status: 'COMPLETED',
        fiatAmount: 100,
        totalFeesFiat: 5,
        cryptoAmount: 0.05,
        walletAddress: '0xabc',
        network: '1',
        createdAt: 1000,
        excludeFromPurchases: false,
        orderType: 'BUY',
      };
      const completedOrder = createInitialFiatOrder({
        ...baseParams,
        rampsOrder: rampsOrder as unknown as Parameters<
          typeof createInitialFiatOrder
        >[0]['rampsOrder'],
      });

      expect(completedOrder.state).toBe('COMPLETED');
      expect(completedOrder.forceUpdate).toBe(false);
      expect(completedOrder.lastTimeFetched).toBeGreaterThan(0);
    });

    it('uses providerType when provided', () => {
      const order = createInitialFiatOrder({
        ...baseParams,
        providerType: FIAT_ORDER_PROVIDERS.DEPOSIT,
      });

      expect(order.provider).toBe(FIAT_ORDER_PROVIDERS.DEPOSIT);
    });

    it('defaults providerType to AGGREGATOR', () => {
      const order = createInitialFiatOrder(baseParams);
      expect(order.provider).toBe(FIAT_ORDER_PROVIDERS.AGGREGATOR);
    });
  });

  it('renders error view when no URL is provided', () => {
    const useParamsMock = jest.requireMock<
      typeof import('../../../../../util/navigation/navUtils')
    >('../../../../../util/navigation/navUtils').useParams as jest.Mock;

    useParamsMock.mockReturnValue({
      url: undefined,
      providerName: 'Test Provider',
    });

    const { getByText } = render(
      <ThemeContext.Provider value={mockTheme}>
        <Checkout />
      </ThemeContext.Provider>,
    );

    expect(
      getByText('fiat_on_ramp_aggregator.webview_no_url_provided'),
    ).toBeOnTheScreen();

    useParamsMock.mockReturnValue({
      url: 'https://provider.example.com/widget?test=1',
      providerName: 'Test Provider',
    });
  });

  it('retries loading after error by pressing CTA', () => {
    const { getByTestId, getByText, queryByText } = render(
      <ThemeContext.Provider value={mockTheme}>
        <Checkout />
      </ThemeContext.Provider>,
    );

    const webview = getByTestId('checkout-webview');

    fireEvent(webview, 'onHttpError', {
      nativeEvent: {
        url: 'https://provider.example.com/widget?test=1',
        statusCode: 500,
      },
    });

    expect(
      getByText('fiat_on_ramp_aggregator.webview_received_error'),
    ).toBeOnTheScreen();

    const retryButton = getByText('fiat_on_ramp_aggregator.try_again');
    fireEvent.press(retryButton);

    expect(
      queryByText('fiat_on_ramp_aggregator.webview_received_error'),
    ).toBeNull();
  });

  it('calls onCloseBottomSheet when close button is pressed', () => {
    const { getByTestId } = render(
      <ThemeContext.Provider value={mockTheme}>
        <Checkout />
      </ThemeContext.Provider>,
    );

    fireEvent.press(getByTestId('checkout-close-button'));

    expect(mockOnCloseBottomSheet).toHaveBeenCalled();
  });

  it('matches snapshot when no URL is provided', () => {
    const useParamsMock = jest.requireMock<
      typeof import('../../../../../util/navigation/navUtils')
    >('../../../../../util/navigation/navUtils').useParams as jest.Mock;

    useParamsMock.mockReturnValue({
      url: undefined,
      providerName: 'Test Provider',
    });

    const { toJSON } = render(
      <ThemeContext.Provider value={mockTheme}>
        <Checkout />
      </ThemeContext.Provider>,
    );

    expect(toJSON()).toMatchSnapshot();

    useParamsMock.mockReturnValue({
      url: 'https://provider.example.com/widget?test=1',
      providerName: 'Test Provider',
    });
  });

  it('matches snapshot when in error state', () => {
    const { getByTestId, toJSON } = render(
      <ThemeContext.Provider value={mockTheme}>
        <Checkout />
      </ThemeContext.Provider>,
    );

    const webview = getByTestId('checkout-webview');

    fireEvent(webview, 'onHttpError', {
      nativeEvent: {
        url: 'https://provider.example.com/widget?test=1',
        statusCode: 500,
      },
    });

    expect(toJSON()).toMatchSnapshot();
  });
});
