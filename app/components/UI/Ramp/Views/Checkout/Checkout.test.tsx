/* eslint-disable @metamask/design-tokens/color-no-hex -- theme mock uses hex for test compatibility */
import React from 'react';
import { fireEvent, act } from '@testing-library/react-native';
import Checkout from './Checkout';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import {
  registerCheckoutCallback,
  removeCheckoutCallback,
} from '../../utils/checkoutCallbackRegistry';

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: jest.fn(),
  };
});

const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: jest.fn(() => mockDispatch),
}));

jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: jest.fn(),
  createNavigationDetails: jest.fn((_root: string, screen: string) => ({
    name: screen,
    params: {},
  })),
}));

jest.mock('../../hooks/useRampsOrders', () => ({
  useRampsOrders: jest.fn(),
}));

jest.mock('../../hooks/useRampsUnifiedV2Enabled', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: jest.fn(),
}));

jest.mock('../../../../../actions/user', () => ({
  protectWalletModalVisible: jest.fn(() => ({
    type: 'PROTECT_WALLET_MODAL_VISIBLE',
  })),
}));

jest.mock('../../../../../reducers/fiatOrders', () => ({
  getRampRoutingDecision: () => null,
}));

jest.mock('../../utils/v2OrderToast', () => ({
  showV2OrderToast: jest.fn(),
}));

jest.mock('../../../../../util/theme', () => ({
  useTheme: jest.fn().mockReturnValue({
    colors: {
      background: { default: '#FFFFFF' },
      text: { default: '#000000' },
    },
    themeAppearance: 'light',
    typography: {},
    shadows: {},
    brandColors: {},
  }),
}));

jest.mock('../../../Navbar', () => ({
  getDepositNavbarOptions: jest.fn(() => ({})),
}));

jest.mock('../../../../../util/Logger', () => ({
  error: jest.fn(),
  log: jest.fn(),
}));

const mockCallbackBaseUrl =
  'https://on-ramp-content.uat-api.cx.metamask.io/regions/fake-callback';

jest.mock('../../Aggregator/sdk', () => ({
  callbackBaseUrl: mockCallbackBaseUrl,
}));

let capturedOnNavigationStateChange:
  | ((state: { url: string; loading?: boolean }) => void)
  | undefined;

jest.mock('@metamask/react-native-webview', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires -- jest mock factory
  const { View, Button } = require('react-native');
  return {
    WebView: ({
      onNavigationStateChange,
      testID,
    }: {
      onNavigationStateChange?: (state: {
        url: string;
        loading?: boolean;
      }) => void;
      testID?: string;
    }) => {
      capturedOnNavigationStateChange = onNavigationStateChange;
      return (
        <View testID={testID ?? 'checkout-webview'}>
          <Button
            testID="trigger-callback-navigation"
            title="TriggerCallback"
            onPress={() =>
              onNavigationStateChange?.({
                url: `${mockCallbackBaseUrl}?orderId=123`,
                loading: false,
              })
            }
          />
          <Button
            testID="trigger-callback-empty-query"
            title="TriggerCallbackEmptyQuery"
            onPress={() =>
              onNavigationStateChange?.({
                url: mockCallbackBaseUrl,
                loading: false,
              })
            }
          />
          <Button
            testID="trigger-callback-loading"
            title="TriggerCallbackLoading"
            onPress={() =>
              onNavigationStateChange?.({
                url: `${mockCallbackBaseUrl}?orderId=123`,
                loading: true,
              })
            }
          />
          <Button
            testID="trigger-dedup-navigation"
            title="TriggerDedup"
            onPress={() =>
              onNavigationStateChange?.({
                url: 'https://custom-dedup-url.example.com',
                loading: false,
              })
            }
          />
        </View>
      );
    },
  };
});

jest.mock('../../../../../util/device', () => ({
  isAndroid: jest.fn(() => false),
}));

jest.mock('react-native-safe-area-context', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires -- jest mock factory
  const { View } = require('react-native');
  return {
    SafeAreaProvider: View,
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

const mockUseParams = jest.requireMock(
  '../../../../../util/navigation/navUtils',
).useParams as jest.Mock;

const mockUseRampsOrders = jest.requireMock('../../hooks/useRampsOrders')
  .useRampsOrders as jest.Mock;

const mockUseRampsUnifiedV2Enabled = jest.requireMock(
  '../../hooks/useRampsUnifiedV2Enabled',
).default as jest.Mock;

const mockUseAnalytics = jest.requireMock(
  '../../../../hooks/useAnalytics/useAnalytics',
).useAnalytics as jest.Mock;

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn();
const mockAddProperties = jest.fn();
const mockBuild = jest.fn();

describe('Checkout', () => {
  const mockAddOrder = jest.fn();
  const mockGetOrderFromCallback = jest.fn();
  const mockAddPrecreatedOrder = jest.fn();
  const mockNavigation = {
    setOptions: jest.fn(),
    reset: jest.fn(),
    goBack: jest.fn(),
    isFocused: jest.fn(() => true),
    dangerouslyGetParent: jest.fn(() => ({ pop: jest.fn() })),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    capturedOnNavigationStateChange = undefined;
    mockUseParams.mockReturnValue({
      url: 'https://provider.example.com/checkout',
      providerName: 'Test Provider',
    });
    mockUseRampsOrders.mockReturnValue({
      addOrder: mockAddOrder,
      getOrderFromCallback: mockGetOrderFromCallback,
      addPrecreatedOrder: mockAddPrecreatedOrder,
    });
    mockUseRampsUnifiedV2Enabled.mockReturnValue(false);
    mockUseAnalytics.mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
    });
    mockCreateEventBuilder.mockReturnValue({
      addProperties: mockAddProperties,
      build: mockBuild,
    });
    mockAddProperties.mockReturnValue({ build: mockBuild });

    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires -- jest mock
    const nav = require('@react-navigation/native');
    nav.useNavigation.mockReturnValue(mockNavigation);
  });

  describe('handleNavigationStateChange (callback flow)', () => {
    const callbackFlowParams = {
      url: 'https://provider.example.com/checkout',
      providerName: 'Test Provider',
      providerCode: 'moonpay',
      walletAddress: '0x1234567890abcdef',
    };

    it('calls getOrderFromCallback when callback flow is triggered', async () => {
      const mockRampsOrder = {
        providerOrderId: 'order-123',
        cryptoCurrency: { symbol: 'ETH' },
        cryptoAmount: '1.5',
        status: 'COMPLETED',
      };
      mockGetOrderFromCallback.mockResolvedValue(mockRampsOrder);
      mockUseParams.mockReturnValue(callbackFlowParams);

      renderWithProvider(<Checkout />, {}, true, false);

      await act(async () => {
        await capturedOnNavigationStateChange?.({
          url: `${mockCallbackBaseUrl}?orderId=123`,
          loading: false,
        });
      });

      expect(mockGetOrderFromCallback).toHaveBeenCalled();
    });

    it('adds order when callback succeeds', async () => {
      const mockRampsOrder = {
        providerOrderId: 'order-v2-123',
        cryptoCurrency: { symbol: 'ETH' },
        cryptoAmount: '2.0',
        status: 'COMPLETED',
      };
      mockGetOrderFromCallback.mockResolvedValue(mockRampsOrder);
      mockUseParams.mockReturnValue(callbackFlowParams);

      renderWithProvider(<Checkout />, {}, true, false);

      await act(async () => {
        await capturedOnNavigationStateChange?.({
          url: `${mockCallbackBaseUrl}?orderId=123`,
          loading: false,
        });
      });

      expect(mockAddOrder).toHaveBeenCalledWith(mockRampsOrder);
    });

    it('does not add order when getOrderFromCallback returns null', async () => {
      mockGetOrderFromCallback.mockResolvedValue(null);
      mockUseParams.mockReturnValue(callbackFlowParams);

      renderWithProvider(<Checkout />, {}, true, false);

      await act(async () => {
        await capturedOnNavigationStateChange?.({
          url: `${mockCallbackBaseUrl}?orderId=123`,
          loading: false,
        });
      });

      expect(mockAddOrder).not.toHaveBeenCalled();
    });

    it('does not add order when getOrderFromCallback throws', async () => {
      mockGetOrderFromCallback.mockRejectedValue(new Error('API Error'));
      mockUseParams.mockReturnValue(callbackFlowParams);

      renderWithProvider(<Checkout />, {}, true, false);

      await act(async () => {
        await capturedOnNavigationStateChange?.({
          url: `${mockCallbackBaseUrl}?orderId=123`,
          loading: false,
        });
      });

      expect(mockAddOrder).not.toHaveBeenCalled();
    });

    it('does not call getOrderFromCallback when callback URL has no query params', async () => {
      mockUseParams.mockReturnValue(callbackFlowParams);

      renderWithProvider(<Checkout />, {}, true, false);

      await act(async () => {
        await capturedOnNavigationStateChange?.({
          url: mockCallbackBaseUrl,
          loading: false,
        });
      });

      expect(mockGetOrderFromCallback).not.toHaveBeenCalled();
    });

    it('returns early when navState.loading is true', async () => {
      mockUseParams.mockReturnValue(callbackFlowParams);

      renderWithProvider(<Checkout />, {}, true, false);

      await act(async () => {
        await capturedOnNavigationStateChange?.({
          url: `${mockCallbackBaseUrl}?orderId=123`,
          loading: true,
        });
      });

      expect(mockGetOrderFromCallback).not.toHaveBeenCalled();
      expect(mockAddOrder).not.toHaveBeenCalled();
    });

    it('does not process callback twice when navigation fires multiple times', async () => {
      const mockRampsOrder = {
        providerOrderId: 'order-once',
        cryptoCurrency: { symbol: 'BTC' },
        cryptoAmount: '0.5',
        status: 'COMPLETED',
      };
      mockGetOrderFromCallback.mockResolvedValue(mockRampsOrder);
      mockUseParams.mockReturnValue(callbackFlowParams);

      renderWithProvider(<Checkout />, {}, true, false);

      await act(async () => {
        await capturedOnNavigationStateChange?.({
          url: `${mockCallbackBaseUrl}?orderId=123`,
          loading: false,
        });
      });

      await act(async () => {
        await capturedOnNavigationStateChange?.({
          url: `${mockCallbackBaseUrl}?orderId=456`,
          loading: false,
        });
      });

      expect(mockGetOrderFromCallback).toHaveBeenCalledTimes(1);
      expect(mockAddOrder).toHaveBeenCalledTimes(1);
    });

    it('does not invoke callback handler when hasCallbackFlow is false', async () => {
      mockUseParams.mockReturnValue({
        url: 'https://provider.example.com',
        providerName: 'Test',
      });

      const { getByTestId } = renderWithProvider(<Checkout />, {}, true, false);

      await act(async () => {
        fireEvent.press(getByTestId('trigger-callback-navigation'));
      });

      expect(mockGetOrderFromCallback).not.toHaveBeenCalled();
      expect(mockAddOrder).not.toHaveBeenCalled();
    });
  });

  describe('close button analytics (280-288)', () => {
    it('tracks RAMPS_CLOSE_BUTTON_CLICKED when close button is pressed', () => {
      mockUseParams.mockReturnValue({
        url: 'https://provider.example.com',
        providerName: 'Test',
      });

      const { getByTestId } = renderWithProvider(<Checkout />, {}, true, false);

      fireEvent.press(getByTestId('checkout-close-button'));

      expect(mockCreateEventBuilder).toHaveBeenCalled();
      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          location: 'Checkout',
          ramp_type: 'UNIFIED_BUY_2',
        }),
      );
      expect(mockTrackEvent).toHaveBeenCalled();
    });
  });

  describe('checkout callback registry (297-302)', () => {
    it('invokes registered callback when callbackKey is set and WebView navigates to new URL', async () => {
      const mockCallback = jest.fn();
      const callbackKey = registerCheckoutCallback(mockCallback);

      mockUseParams.mockReturnValue({
        url: 'https://provider.example.com',
        providerName: 'Test',
        callbackKey,
      });

      const { getByTestId } = renderWithProvider(<Checkout />, {}, true, false);

      await act(async () => {
        fireEvent.press(getByTestId('trigger-dedup-navigation'));
      });

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://custom-dedup-url.example.com',
        }),
      );

      removeCheckoutCallback(callbackKey);
    });

    it('does not invoke callback on second navigation to same URL (dedup)', async () => {
      const mockCallback = jest.fn();
      const callbackKey = registerCheckoutCallback(mockCallback);

      mockUseParams.mockReturnValue({
        url: 'https://provider.example.com',
        providerName: 'Test',
        callbackKey,
      });

      const { getByTestId } = renderWithProvider(<Checkout />, {}, true, false);

      await act(async () => {
        fireEvent.press(getByTestId('trigger-dedup-navigation'));
        fireEvent.press(getByTestId('trigger-dedup-navigation'));
      });

      expect(mockCallback).toHaveBeenCalledTimes(1);

      removeCheckoutCallback(callbackKey);
    });
  });
});
