/* eslint-disable @metamask/design-tokens/color-no-hex -- theme mock uses hex for test compatibility */
import React from 'react';
import { fireEvent, act, waitFor } from '@testing-library/react-native';
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
  useRampSDK: jest.fn(() => null),
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
      onHttpError,
      testID,
    }: {
      onNavigationStateChange?: (state: {
        url: string;
        loading?: boolean;
      }) => void;
      onHttpError?: (e: {
        nativeEvent: { url: string; statusCode: number };
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
          <Button
            testID="trigger-http-error-main-uri"
            title="TriggerHttpError"
            onPress={() =>
              onHttpError?.({
                nativeEvent: {
                  url: 'https://provider.example.com/checkout',
                  statusCode: 502,
                },
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
    SafeAreaView: View,
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

    it('returns early when navState.loading is true', () => {
      mockUseParams.mockReturnValue(callbackFlowParams);

      renderWithProvider(<Checkout />, {}, true, false);

      act(() => {
        capturedOnNavigationStateChange?.({
          url: `${mockCallbackBaseUrl}?orderId=123`,
          loading: true,
        });
      });

      expect(mockGetOrderFromCallback).not.toHaveBeenCalled();
      expect(mockAddOrder).not.toHaveBeenCalled();
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

  describe('WebView HTTP error and error recovery', () => {
    it('sets error when main checkout URL returns HTTP error', async () => {
      mockUseParams.mockReturnValue({
        url: 'https://provider.example.com/checkout',
        providerName: 'Test Provider',
      });

      const { getByTestId, getByText } = renderWithProvider(
        <Checkout />,
        {},
        true,
        false,
      );

      await act(async () => {
        fireEvent.press(getByTestId('trigger-http-error-main-uri'));
      });

      expect(
        getByText('WebView received error status code: 502'),
      ).toBeOnTheScreen();
    });

    it('clears error when Try again is pressed after HTTP error', async () => {
      mockUseParams.mockReturnValue({
        url: 'https://provider.example.com/checkout',
        providerName: 'Test Provider',
      });

      const { getByTestId, getByText } = renderWithProvider(
        <Checkout />,
        {},
        true,
        false,
      );

      await act(async () => {
        fireEvent.press(getByTestId('trigger-http-error-main-uri'));
      });

      await act(async () => {
        fireEvent.press(getByText('Try again'));
      });

      expect(getByTestId('checkout-webview')).toBeOnTheScreen();
    });
  });

  describe('addPrecreatedOrder registration', () => {
    it('registers precreated order when orderId and callback flow params are present', async () => {
      mockUseParams.mockReturnValue({
        url: 'https://provider.example.com/checkout',
        providerName: 'MoonPay',
        providerCode: 'moonpay',
        walletAddress: '0xabcdef1234567890',
        orderId: 'mp-order-99',
        network: 'eip155:1',
      });

      renderWithProvider(<Checkout />, {}, true, false);

      await waitFor(() => {
        expect(mockAddPrecreatedOrder).toHaveBeenCalledWith({
          orderId: 'mp-order-99',
          providerCode: 'moonpay',
          walletAddress: '0xabcdef1234567890',
          chainId: 'eip155:1',
        });
      });
    });
  });

  describe('missing checkout URL', () => {
    it('renders ErrorView when url is not provided', () => {
      mockUseParams.mockReturnValue({
        providerName: 'Test Provider',
      });

      const { getByText } = renderWithProvider(<Checkout />, {}, true, false);

      expect(getByText('No URL was provided to continue')).toBeOnTheScreen();
    });
  });
});
