/* eslint-disable @metamask/design-tokens/color-no-hex -- theme mock uses hex for test compatibility */
import React from 'react';
import { fireEvent, act, waitFor } from '@testing-library/react-native';
import Checkout from './Checkout';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import Routes from '../../../../../constants/navigation/Routes';
import { getRampCallbackBaseUrl } from '../../utils/getRampCallbackBaseUrl';

jest.mock('../../utils/getRampCallbackBaseUrl', () => ({
  getRampCallbackBaseUrl: jest.fn(
    () => 'https://on-ramp-content.api.cx.metamask.io/regions/fake-callback',
  ),
}));

const callbackBaseUrl = getRampCallbackBaseUrl();

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

jest.mock('../../hooks/useRampsQuotes', () => ({
  useRampsQuotes: jest.fn(),
}));

jest.mock('../../hooks/useOpenHostedBuyWidget', () => ({
  useOpenHostedBuyWidget: jest.fn(),
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

jest.mock('../../headless/sessionRegistry', () => ({
  getSession: jest.fn(),
  closeSession: jest.fn(),
  failSession: jest.fn(),
}));

jest.mock(
  '../../../../../core/Engine/controllers/ramps-controller/headlessOrderContextRegistry',
  () => ({
    setHeadlessOrderContext: jest.fn(),
    getHeadlessOrderContext: jest.fn(),
    deleteHeadlessOrderContext: jest.fn(),
  }),
);

const mockEmitOrderConfirmedAnalyticsFromCallback = jest.fn();
const mockEmitTerminalOrderAnalyticsFromCallback = jest.fn();
jest.mock(
  '../../../../../core/Engine/controllers/ramps-controller/event-handlers/analytics',
  () => ({
    ...jest.requireActual(
      '../../../../../core/Engine/controllers/ramps-controller/event-handlers/analytics',
    ),
    emitOrderConfirmedAnalyticsFromCallback: (...args: unknown[]) =>
      mockEmitOrderConfirmedAnalyticsFromCallback(...args),
    emitTerminalOrderAnalyticsFromCallback: (...args: unknown[]) =>
      mockEmitTerminalOrderAnalyticsFromCallback(...args),
  }),
);

jest.mock('../../../../../util/Logger', () => ({
  error: jest.fn(),
  log: jest.fn(),
}));

jest.mock('../../../../../util/browser', () => ({
  shouldStartLoadWithRequest: jest.fn(() => true),
}));

jest.mock('../../Aggregator/sdk', () => ({
  useRampSDK: jest.fn(() => null),
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-xyz'),
}));

let capturedOnNavigationStateChange:
  | ((state: { url: string; loading?: boolean }) => void)
  | undefined;
let capturedOnMessage:
  | ((event: { nativeEvent: { data: unknown; url?: string } }) => void)
  | undefined;

jest.mock('@metamask/react-native-webview', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires -- jest mock factory
  const { View, Button } = require('react-native');
  const getCallbackBaseUrl = () =>
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires -- resolve mocked helper at press time (avoids jest hoist / TDZ with outer consts)
    require('../../utils/getRampCallbackBaseUrl').getRampCallbackBaseUrl() as string;
  return {
    WebView: ({
      onNavigationStateChange,
      onHttpError,
      onShouldStartLoadWithRequest,
      onLoadStart,
      onLoadEnd,
      onMessage,
      originWhitelist,
      testID,
    }: {
      onNavigationStateChange?: (state: {
        url: string;
        loading?: boolean;
      }) => void;
      onHttpError?: (e: {
        nativeEvent: { url: string; statusCode: number };
      }) => void;
      onShouldStartLoadWithRequest?: (req: { url: string }) => boolean;
      onLoadStart?: () => void;
      onLoadEnd?: (e: { nativeEvent: { url: string } }) => void;
      onMessage?: (event: {
        nativeEvent: { data: unknown; url?: string };
      }) => void;
      originWhitelist?: string[];
      testID?: string;
    }) => {
      capturedOnNavigationStateChange = onNavigationStateChange;
      capturedOnMessage = onMessage;
      return (
        <View
          testID={testID ?? 'checkout-webview'}
          originWhitelist={originWhitelist}
        >
          <Button
            testID="trigger-load-start"
            title="TriggerLoadStart"
            onPress={() => onLoadStart?.()}
          />
          <Button
            testID="trigger-load-end"
            title="TriggerLoadEnd"
            onPress={() =>
              onLoadEnd?.({
                nativeEvent: {
                  url: 'https://provider.example.com/checkout',
                },
              })
            }
          />
          <Button
            testID="trigger-callback-navigation"
            title="TriggerCallback"
            onPress={() =>
              onNavigationStateChange?.({
                url: `${getCallbackBaseUrl()}?orderId=123`,
                loading: false,
              })
            }
          />
          <Button
            testID="trigger-callback-empty-query"
            title="TriggerCallbackEmptyQuery"
            onPress={() =>
              onNavigationStateChange?.({
                url: getCallbackBaseUrl(),
                loading: false,
              })
            }
          />
          <Button
            testID="trigger-callback-loading"
            title="TriggerCallbackLoading"
            onPress={() =>
              onNavigationStateChange?.({
                url: `${getCallbackBaseUrl()}?orderId=123`,
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
          <Button
            testID="trigger-http-error-auxiliary"
            title="TriggerHttpErrorAux"
            onPress={() =>
              onHttpError?.({
                nativeEvent: {
                  url: 'https://cdn.example.com/asset.woff2',
                  statusCode: 404,
                },
              })
            }
          />
          <Button
            testID="trigger-http-error-callback"
            title="TriggerHttpErrorCallback"
            onPress={() =>
              onHttpError?.({
                nativeEvent: {
                  url: `${getCallbackBaseUrl()}?orderId=123`,
                  statusCode: 503,
                },
              })
            }
          />
          <Button
            testID="trigger-should-start-load"
            title="TriggerShouldStartLoad"
            onPress={() =>
              onShouldStartLoadWithRequest?.({
                url: 'https://provider.example.com/next-hop',
              })
            }
          />
        </View>
      );
    },
  };
});

const mockGetRampCallbackBaseUrl = getRampCallbackBaseUrl as jest.Mock;
const mockShouldStartLoadWithRequest = jest.requireMock(
  '../../../../../util/browser',
).shouldStartLoadWithRequest as jest.Mock;
const mockUseRampSDK = jest.requireMock('../../Aggregator/sdk')
  .useRampSDK as jest.Mock;
const mockUuidV4 = jest.requireMock('uuid').v4 as jest.Mock;
const mockUseDispatch = jest.requireMock('react-redux')
  .useDispatch as jest.Mock;
const mockProtectWalletModalVisible = jest.requireMock(
  '../../../../../actions/user',
).protectWalletModalVisible as jest.Mock;
const mockCreateNavigationDetails = jest.requireMock(
  '../../../../../util/navigation/navUtils',
).createNavigationDetails as jest.Mock;

const mockUseParams = jest.requireMock(
  '../../../../../util/navigation/navUtils',
).useParams as jest.Mock;

const mockUseRampsOrders = jest.requireMock('../../hooks/useRampsOrders')
  .useRampsOrders as jest.Mock;

const mockUseRampsQuotes = jest.requireMock('../../hooks/useRampsQuotes')
  .useRampsQuotes as jest.Mock;

const mockUseOpenHostedBuyWidget = jest.requireMock(
  '../../hooks/useOpenHostedBuyWidget',
).useOpenHostedBuyWidget as jest.Mock;

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
  const mockGetFallbackBuyWidgetData = jest.fn();
  const mockOpenHostedBuyWidget = jest.fn();
  const mockHeadlessEntrySetOptions = jest.fn();
  const mockNavigation = {
    setOptions: jest.fn(),
    reset: jest.fn(),
    goBack: jest.fn(),
    isFocused: jest.fn(() => true),
    dangerouslyGetParent: jest.fn(() => ({ pop: jest.fn() })),
    getParent: jest.fn(() => ({ pop: jest.fn() })),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
    (Date.now as unknown as jest.Mock).mockReturnValue(123);
    capturedOnNavigationStateChange = undefined;
    capturedOnMessage = undefined;
    mockGetRampCallbackBaseUrl.mockReturnValue(
      'https://on-ramp-content.api.cx.metamask.io/regions/fake-callback',
    );
    mockShouldStartLoadWithRequest.mockReturnValue(true);
    mockUseRampSDK.mockReturnValue(null);
    mockUuidV4.mockReturnValue('mock-uuid-xyz');
    mockUseDispatch.mockReturnValue(mockDispatch);
    mockProtectWalletModalVisible.mockReturnValue({
      type: 'PROTECT_WALLET_MODAL_VISIBLE',
    });
    mockCreateNavigationDetails.mockImplementation(
      (_root: string, screen: string) => ({
        name: screen,
        params: {},
      }),
    );
    mockUseParams.mockReturnValue({
      url: 'https://provider.example.com/checkout',
      providerName: 'Test Provider',
    });
    mockUseRampsOrders.mockReturnValue({
      addOrder: mockAddOrder,
      getOrderFromCallback: mockGetOrderFromCallback,
      addPrecreatedOrder: mockAddPrecreatedOrder,
    });
    mockGetFallbackBuyWidgetData.mockResolvedValue(null);
    mockUseRampsQuotes.mockReturnValue({
      getFallbackBuyWidgetData: mockGetFallbackBuyWidgetData,
    });
    mockOpenHostedBuyWidget.mockResolvedValue(undefined);
    mockUseOpenHostedBuyWidget.mockReturnValue({
      openHostedBuyWidget: mockOpenHostedBuyWidget,
    });
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
    mockNavigation.isFocused.mockReturnValue(true);
    mockNavigation.getParent.mockReset();
    mockHeadlessEntrySetOptions.mockReset();
    mockNavigation.getParent.mockImplementation(() => ({
      pop: jest.fn(),
      getParent: () => ({
        setOptions: mockHeadlessEntrySetOptions,
      }),
    }));
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
          url: `${callbackBaseUrl}?orderId=123`,
          loading: true,
        });
      });

      expect(mockNavigation.reset).not.toHaveBeenCalled();
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

      expect(mockNavigation.reset).not.toHaveBeenCalled();
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

  describe('onNavigationStateChange with URL deduplication', () => {
    it('invokes param callback when WebView navigates to new URL', async () => {
      const mockCallback = jest.fn();

      mockUseParams.mockReturnValue({
        url: 'https://provider.example.com',
        providerName: 'Test',
        onNavigationStateChange: mockCallback,
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
    });

    it('does not invoke callback on second navigation to same URL (dedup)', async () => {
      const mockCallback = jest.fn();

      mockUseParams.mockReturnValue({
        url: 'https://provider.example.com',
        providerName: 'Test',
        onNavigationStateChange: mockCallback,
      });

      const { getByTestId } = renderWithProvider(<Checkout />, {}, true, false);

      await act(async () => {
        fireEvent.press(getByTestId('trigger-dedup-navigation'));
        fireEvent.press(getByTestId('trigger-dedup-navigation'));
      });

      expect(mockCallback).toHaveBeenCalledTimes(1);
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

    it('does not register when network/chainId is missing', async () => {
      mockUseParams.mockReturnValue({
        url: 'https://provider.example.com/checkout',
        providerName: 'MoonPay',
        providerCode: 'moonpay',
        walletAddress: '0xabcdef1234567890',
        orderId: 'mp-order-99',
      });

      renderWithProvider(<Checkout />, {}, true, false);

      await waitFor(() => {
        expect(mockAddPrecreatedOrder).not.toHaveBeenCalled();
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

  describe('screen view analytics', () => {
    it('tracks RAMPS_SCREEN_VIEWED when checkout WebView mounts', () => {
      mockUseParams.mockReturnValue({
        url: 'https://provider.example.com/checkout',
        providerName: 'Test',
      });

      renderWithProvider(<Checkout />, {}, true, false);

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.RAMPS_SCREEN_VIEWED,
      );
    });
  });

  describe('auxiliary WebView HTTP errors', () => {
    it('logs non-fatal HTTP errors for auxiliary resource URLs', async () => {
      const Logger = jest.requireMock('../../../../../util/Logger') as {
        log: jest.Mock;
      };
      mockUseParams.mockReturnValue({
        url: 'https://provider.example.com/checkout',
        providerName: 'Test',
      });

      const { getByTestId } = renderWithProvider(<Checkout />, {}, true, false);

      await act(async () => {
        fireEvent.press(getByTestId('trigger-http-error-auxiliary'));
      });

      expect(Logger.log).toHaveBeenCalledWith(
        expect.stringContaining('Checkout: HTTP error 404'),
      );
    });
  });

  describe('callback success (unified buy stack)', () => {
    it('resets navigation to order details with callback params without fetching the order in Checkout', async () => {
      const callbackUrl = `${callbackBaseUrl}?orderId=123`;
      mockUseParams.mockReturnValue({
        url: 'https://provider.example.com/checkout',
        providerName: 'Test',
        providerCode: 'moonpay',
        walletAddress: '0xabc',
        cryptocurrency: 'ETH',
      });

      const { getByTestId } = renderWithProvider(<Checkout />, {}, true, false);

      await act(async () => {
        fireEvent.press(getByTestId('trigger-callback-navigation'));
      });

      await waitFor(() => {
        expect(mockNavigation.reset).toHaveBeenCalledWith({
          index: 0,
          routes: [
            {
              name: Routes.RAMP.RAMPS_ORDER_DETAILS,
              params: {
                callbackUrl,
                providerCode: 'moonpay',
                walletAddress: '0xabc',
                showCloseButton: true,
                cryptocurrency: 'ETH',
              },
            },
          ],
        });
      });

      expect(mockGetOrderFromCallback).not.toHaveBeenCalled();
      expect(mockAddOrder).not.toHaveBeenCalled();
    });

    it('omits cryptocurrency when not provided in params', async () => {
      const callbackUrl = `${callbackBaseUrl}?orderId=123`;
      mockUseParams.mockReturnValue({
        url: 'https://provider.example.com/checkout',
        providerName: 'Test',
        providerCode: 'moonpay',
        walletAddress: '0xabc',
      });

      const { getByTestId } = renderWithProvider(<Checkout />, {}, true, false);

      await act(async () => {
        fireEvent.press(getByTestId('trigger-callback-navigation'));
      });

      await waitFor(() => {
        expect(mockNavigation.reset).toHaveBeenCalledWith({
          index: 0,
          routes: [
            {
              name: Routes.RAMP.RAMPS_ORDER_DETAILS,
              params: {
                callbackUrl,
                providerCode: 'moonpay',
                walletAddress: '0xabc',
                showCloseButton: true,
              },
            },
          ],
        });
      });
    });
  });

  describe('customOrderId fallback', () => {
    it('uses customOrderId when orderId is not provided', async () => {
      mockUseParams.mockReturnValue({
        url: 'https://provider.example.com/checkout',
        providerName: 'Test',
        providerCode: 'transak',
        walletAddress: '0xdef',
        customOrderId: 'custom-id-42',
        network: 'eip155:1',
      });

      renderWithProvider(<Checkout />, {}, true, false);

      await waitFor(() => {
        expect(mockAddPrecreatedOrder).toHaveBeenCalledWith(
          expect.objectContaining({
            orderId: 'custom-id-42',
          }),
        );
      });
    });
  });

  describe('callback empty query pop', () => {
    it('pops parent when callback URL has no query params', async () => {
      const mockParentPop = jest.fn();
      mockNavigation.getParent.mockReturnValue({ pop: mockParentPop });

      mockUseParams.mockReturnValue({
        url: 'https://provider.example.com/checkout',
        providerName: 'Test',
        providerCode: 'moonpay',
        walletAddress: '0xabc',
      });

      const { getByTestId } = renderWithProvider(<Checkout />, {}, true, false);

      await act(async () => {
        fireEvent.press(getByTestId('trigger-callback-empty-query'));
      });

      expect(mockNavigation.getParent).toHaveBeenCalled();
      expect(mockParentPop).toHaveBeenCalled();
    });
  });

  describe('originWhitelist', () => {
    it('allows http, https, about:blank, and about:srcdoc for Cloudflare Turnstile', () => {
      mockUseParams.mockReturnValue({
        url: 'https://provider.example.com/checkout',
        providerName: 'Test',
      });

      const { getByTestId } = renderWithProvider(<Checkout />, {}, true, false);

      expect(getByTestId('checkout-webview').props.originWhitelist).toEqual([
        'https://*',
        'http://*',
        'about:blank',
        'about:srcdoc',
      ]);
    });
  });

  describe('onShouldStartLoadWithRequest', () => {
    it('delegates to shouldStartLoadWithRequest with the request URL and Logger', () => {
      const { shouldStartLoadWithRequest } = jest.requireMock(
        '../../../../../util/browser',
      ) as { shouldStartLoadWithRequest: jest.Mock };
      const Logger = jest.requireMock('../../../../../util/Logger') as {
        error: jest.Mock;
        log: jest.Mock;
      };

      mockUseParams.mockReturnValue({
        url: 'https://provider.example.com/checkout',
        providerName: 'Test',
      });

      const { getByTestId } = renderWithProvider(<Checkout />, {}, true, false);

      fireEvent.press(getByTestId('trigger-should-start-load'));

      expect(shouldStartLoadWithRequest).toHaveBeenCalledWith(
        'https://provider.example.com/next-hop',
        Logger,
      );
    });
  });

  describe('headless session flow', () => {
    const mockGetSession = jest.requireMock('../../headless/sessionRegistry')
      .getSession as jest.Mock;
    const mockCloseSession = jest.requireMock('../../headless/sessionRegistry')
      .closeSession as jest.Mock;
    const mockFailSession = jest.requireMock('../../headless/sessionRegistry')
      .failSession as jest.Mock;
    const mockSetHeadlessOrderContext = jest.requireMock(
      '../../../../../core/Engine/controllers/ramps-controller/headlessOrderContextRegistry',
    ).setHeadlessOrderContext as jest.Mock;

    const mockOrder = {
      providerOrderId: 'headless-order-1',
      cryptoCurrency: { symbol: 'ETH' },
      cryptoAmount: '0.5',
      status: 'Pending',
    };

    const callbackFlowParams = {
      url: 'https://provider.example.com/checkout',
      providerName: 'Test Provider',
      providerCode: 'moonpay',
      walletAddress: '0xdeadbeef',
      headlessSessionId: 'hs-1',
    };

    let mockParentPop: jest.Mock;

    beforeEach(() => {
      mockGetSession.mockReset();
      mockCloseSession.mockReset();
      mockFailSession.mockReset();
      mockSetHeadlessOrderContext.mockReset();
      mockParentPop = jest.fn();
      mockNavigation.getParent.mockImplementation(() => ({
        pop: mockParentPop,
        getParent: () => ({
          setOptions: mockHeadlessEntrySetOptions,
        }),
      }));
      mockGetOrderFromCallback.mockResolvedValue(mockOrder);
    });

    it('fires onOrderCreated, closes the session, and pops the ramp stack when a live session is present', async () => {
      const onOrderCreated = jest.fn();
      mockGetSession.mockReturnValue({
        id: 'hs-1',
        status: 'continued',
        callbacks: {
          onOrderCreated,
          onError: jest.fn(),
          onClose: jest.fn(),
        },
      });
      mockUseParams.mockReturnValue(callbackFlowParams);

      const { getByTestId } = renderWithProvider(<Checkout />, {}, true, false);

      await act(async () => {
        fireEvent.press(getByTestId('trigger-callback-navigation'));
      });

      await waitFor(() => {
        expect(onOrderCreated).toHaveBeenCalledWith('headless-order-1');
      });
      expect(mockCloseSession).toHaveBeenCalledWith('hs-1', {
        reason: 'completed',
      });
      expect(mockParentPop).toHaveBeenCalled();
      expect(mockNavigation.reset).not.toHaveBeenCalled();
    });

    it('still adds the order to Redux and dispatches protect-wallet when headless', async () => {
      mockGetSession.mockReturnValue({
        id: 'hs-1',
        status: 'continued',
        callbacks: {
          onOrderCreated: jest.fn(),
          onError: jest.fn(),
          onClose: jest.fn(),
        },
      });
      mockUseParams.mockReturnValue(callbackFlowParams);

      const { getByTestId } = renderWithProvider(<Checkout />, {}, true, false);

      await act(async () => {
        fireEvent.press(getByTestId('trigger-callback-navigation'));
      });

      await waitFor(() => {
        expect(mockAddOrder).toHaveBeenCalledWith(mockOrder);
      });
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'PROTECT_WALLET_MODAL_VISIBLE',
      });
      expect(mockNavigation.reset).not.toHaveBeenCalled();
    });

    it('emits RAMPS_TRANSACTION_CONFIRMED for a non-terminal headless callback order', async () => {
      mockGetSession.mockReturnValue({
        id: 'hs-1',
        status: 'continued',
        params: { rampSurface: 'money_account' },
        callbacks: {
          onOrderCreated: jest.fn(),
          onError: jest.fn(),
          onClose: jest.fn(),
        },
      });
      mockUseParams.mockReturnValue(callbackFlowParams);

      const { getByTestId } = renderWithProvider(<Checkout />, {}, true, false);

      await act(async () => {
        fireEvent.press(getByTestId('trigger-callback-navigation'));
      });

      await waitFor(() => {
        expect(
          mockEmitOrderConfirmedAnalyticsFromCallback,
        ).toHaveBeenCalledWith(mockOrder, {
          rampType: 'HEADLESS',
          rampSurface: 'money_account',
          region: undefined,
        });
      });
      expect(mockEmitTerminalOrderAnalyticsFromCallback).not.toHaveBeenCalled();
    });

    it('persists the headless order context so a later terminal failure stays tagged HEADLESS', async () => {
      mockGetSession.mockReturnValue({
        id: 'hs-1',
        status: 'continued',
        params: { rampSurface: 'money_account' },
        callbacks: {
          onOrderCreated: jest.fn(),
          onError: jest.fn(),
          onClose: jest.fn(),
        },
      });
      mockUseParams.mockReturnValue(callbackFlowParams);

      const { getByTestId } = renderWithProvider(<Checkout />, {}, true, false);

      await act(async () => {
        fireEvent.press(getByTestId('trigger-callback-navigation'));
      });

      await waitFor(() => {
        expect(mockSetHeadlessOrderContext).toHaveBeenCalledWith(
          'headless-order-1',
          expect.objectContaining({ rampSurface: 'money_account' }),
        );
      });
    });

    it('emits HEADLESS RAMPS_ORDER_FAILED with quote context when a live session is failed', async () => {
      mockUseParams.mockReturnValue({
        ...callbackFlowParams,
        network: 'eip155:1',
        currency: 'USD',
        cryptocurrency: 'ETH',
      });
      mockGetSession.mockReturnValue({
        id: 'hs-1',
        params: {
          rampSurface: 'money_account',
          amount: 100,
          quote: {
            quote: { amountIn: 120, amountOut: 0.04, paymentMethod: 'card' },
          },
        },
      });
      mockFailSession.mockReturnValue({ code: 'UNKNOWN', message: 'boom' });
      const { getByTestId } = renderWithProvider(<Checkout />, {}, true, false);

      await act(async () => {
        fireEvent.press(getByTestId('trigger-http-error-main-uri'));
      });

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({ ramp_type: 'HEADLESS' }),
      );
    });

    it('swallows consumer onOrderCreated errors and still closes + pops', async () => {
      const Logger = jest.requireMock('../../../../../util/Logger') as {
        error: jest.Mock;
      };
      const throwingCallback = jest.fn(() => {
        throw new Error('consumer bug');
      });
      mockGetSession.mockReturnValue({
        id: 'hs-1',
        status: 'continued',
        callbacks: {
          onOrderCreated: throwingCallback,
          onError: jest.fn(),
          onClose: jest.fn(),
        },
      });
      mockUseParams.mockReturnValue(callbackFlowParams);

      const { getByTestId } = renderWithProvider(<Checkout />, {}, true, false);

      await act(async () => {
        fireEvent.press(getByTestId('trigger-callback-navigation'));
      });

      await waitFor(() => {
        expect(throwingCallback).toHaveBeenCalled();
      });
      expect(Logger.error).toHaveBeenCalledWith(
        expect.any(Error),
        'UnifiedCheckout: onOrderCreated callback threw',
      );
      expect(mockCloseSession).toHaveBeenCalledWith('hs-1', {
        reason: 'completed',
      });
      expect(mockParentPop).toHaveBeenCalled();
    });

    it('fires RAMPS_CHECKOUT_CLOSED with close_source=callback_error when headless getOrderFromCallback returns null', async () => {
      mockGetSession.mockReturnValue({
        id: 'hs-1',
        status: 'continued',
        callbacks: {
          onOrderCreated: jest.fn(),
          onError: jest.fn(),
          onClose: jest.fn(),
        },
      });
      mockGetOrderFromCallback.mockResolvedValue(null);
      mockFailSession.mockReturnValue(true);
      mockUseParams.mockReturnValue(callbackFlowParams);

      const { getByTestId, unmount } = renderWithProvider(
        <Checkout />,
        {},
        true,
        false,
      );

      await act(async () => {
        fireEvent.press(getByTestId('trigger-callback-navigation'));
      });
      unmount();

      const closedIdx = mockCreateEventBuilder.mock.calls.findIndex(
        (c) => c[0] === MetaMetricsEvents.RAMPS_CHECKOUT_CLOSED,
      );
      expect(closedIdx).toBeGreaterThanOrEqual(0);
      expect(mockAddProperties.mock.calls[closedIdx]?.[0]).toMatchObject({
        close_source: 'callback_error',
      });
      expect(mockDispatch).not.toHaveBeenCalledWith({
        type: 'PROTECT_WALLET_MODAL_VISIBLE',
      });
    });

    it('surfaces callback processing failures through onError and skips the ErrorView', async () => {
      mockGetSession.mockReturnValue({
        id: 'hs-1',
        status: 'continued',
        callbacks: {
          onOrderCreated: jest.fn(),
          onError: jest.fn(),
          onClose: jest.fn(),
        },
      });
      mockUseParams.mockReturnValue(callbackFlowParams);
      mockGetOrderFromCallback.mockRejectedValueOnce(
        new Error('callback failed'),
      );
      mockFailSession.mockReturnValue({
        code: 'UNKNOWN',
        message: 'callback failed',
      });

      const { getByTestId, queryByText } = renderWithProvider(
        <Checkout />,
        {},
        true,
        false,
      );

      await act(async () => {
        fireEvent.press(getByTestId('trigger-callback-navigation'));
      });

      await waitFor(() => {
        expect(mockFailSession).toHaveBeenCalledWith('hs-1', expect.any(Error));
      });
      expect(mockParentPop).toHaveBeenCalled();
      expect(queryByText('callback failed')).toBeNull();
      expect(mockDispatch).not.toHaveBeenCalledWith({
        type: 'PROTECT_WALLET_MODAL_VISIBLE',
      });
    });

    it('surfaces provider WebView HTTP errors through onError when headless', async () => {
      mockUseParams.mockReturnValue(callbackFlowParams);
      mockFailSession.mockReturnValue({
        code: 'UNKNOWN',
        message: 'fiat_on_ramp_aggregator.webview_received_error',
      });

      const { getByTestId } = renderWithProvider(<Checkout />, {}, true, false);

      await act(async () => {
        fireEvent.press(getByTestId('trigger-http-error-main-uri'));
        fireEvent.press(getByTestId('trigger-http-error-main-uri'));
      });

      expect(mockFailSession).toHaveBeenCalledTimes(1);
      expect(mockParentPop).toHaveBeenCalledTimes(1);
    });

    it('emits HEADLESS RAMPS_ORDER_FAILED with the session quote context when a live headless session fails', async () => {
      mockUseParams.mockReturnValue({
        ...callbackFlowParams,
        currency: 'USD',
        cryptocurrency: 'ETH',
      });
      mockGetSession.mockReturnValue({
        id: 'hs-1',
        status: 'continued',
        params: {
          rampSurface: 'money_account',
          amount: 100,
          quote: {
            quote: {
              amountIn: 100,
              amountOut: 0.05,
              paymentMethod: 'debit-credit-card',
            },
          },
        },
        callbacks: {
          onOrderCreated: jest.fn(),
          onError: jest.fn(),
          onClose: jest.fn(),
        },
      });
      mockFailSession.mockReturnValue({
        code: 'UNKNOWN',
        message: 'fiat_on_ramp_aggregator.webview_received_error',
      });

      const { getByTestId } = renderWithProvider(<Checkout />, {}, true, false);

      await act(async () => {
        fireEvent.press(getByTestId('trigger-http-error-main-uri'));
      });

      expect(mockFailSession).toHaveBeenCalledWith('hs-1', expect.anything());
      const idx = mockCreateEventBuilder.mock.calls.findIndex(
        (c) => c[0] === MetaMetricsEvents.RAMPS_ORDER_FAILED,
      );
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(mockAddProperties.mock.calls[idx][0]).toEqual(
        expect.objectContaining({
          ramp_type: 'HEADLESS',
          ramp_surface: 'money_account',
          amount_source: 100,
          amount_destination: 0.05,
          payment_method_id: 'debit-credit-card',
          currency_destination: 'ETH',
          currency_source: 'USD',
          is_authenticated: true,
          error_message: expect.any(String),
        }),
      );
    });

    it('falls back to empty/zero context when the failing headless session has no quote', async () => {
      mockUseParams.mockReturnValue(callbackFlowParams);
      mockGetSession.mockReturnValue({
        id: 'hs-1',
        status: 'continued',
        params: {},
        callbacks: {
          onOrderCreated: jest.fn(),
          onError: jest.fn(),
          onClose: jest.fn(),
        },
      });
      mockFailSession.mockReturnValue({
        code: 'UNKNOWN',
        message: 'fiat_on_ramp_aggregator.webview_received_error',
      });

      const { getByTestId } = renderWithProvider(<Checkout />, {}, true, false);

      await act(async () => {
        fireEvent.press(getByTestId('trigger-http-error-main-uri'));
      });

      const idx = mockCreateEventBuilder.mock.calls.findIndex(
        (c) => c[0] === MetaMetricsEvents.RAMPS_ORDER_FAILED,
      );
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(mockAddProperties.mock.calls[idx][0]).toEqual(
        expect.objectContaining({
          ramp_type: 'HEADLESS',
          ramp_surface: undefined,
          amount_source: 0,
          amount_destination: 0,
          payment_method_id: '',
          region: '',
          currency_destination: '',
          currency_source: '',
        }),
      );
    });

    it('treats an empty provider callback as user dismissal when headless', async () => {
      mockUseParams.mockReturnValue(callbackFlowParams);

      const { getByTestId } = renderWithProvider(<Checkout />, {}, true, false);

      await act(async () => {
        fireEvent.press(getByTestId('trigger-callback-empty-query'));
      });

      expect(mockCloseSession).toHaveBeenCalledWith('hs-1', {
        reason: 'user_dismissed',
      });
      expect(mockParentPop).toHaveBeenCalled();
      expect(mockGetOrderFromCallback).not.toHaveBeenCalled();
    });

    it('closes and dismisses the headless flow when the checkout close button is pressed', () => {
      mockUseParams.mockReturnValue(callbackFlowParams);

      const { getByTestId } = renderWithProvider(<Checkout />, {}, true, false);

      fireEvent.press(getByTestId('checkout-close-button'));
      fireEvent.press(getByTestId('checkout-close-button'));

      expect(mockCloseSession).toHaveBeenCalledTimes(1);
      expect(mockParentPop).toHaveBeenCalledTimes(1);
    });

    it('closes and dismisses the headless flow when Checkout unmounts with a live session', () => {
      mockGetSession.mockReturnValue({
        id: 'hs-1',
        status: 'continued',
        callbacks: {
          onOrderCreated: jest.fn(),
          onError: jest.fn(),
          onClose: jest.fn(),
        },
      });
      mockUseParams.mockReturnValue(callbackFlowParams);

      const { unmount } = renderWithProvider(<Checkout />, {}, true, false);

      unmount();

      expect(mockCloseSession).toHaveBeenCalledWith('hs-1', {
        reason: 'user_dismissed',
      });
      expect(mockParentPop).toHaveBeenCalled();
    });

    it('keeps the headless entry card touch-through until Checkout finishes the first WebView load', () => {
      mockUseParams.mockReturnValue(callbackFlowParams);

      const { getByTestId } = renderWithProvider(<Checkout />, {}, true, false);

      expect(mockHeadlessEntrySetOptions).toHaveBeenCalledWith({
        cardStyle: {
          backgroundColor: 'transparent',
          pointerEvents: 'none',
        },
      });

      fireEvent.press(getByTestId('trigger-load-end'));

      expect(mockHeadlessEntrySetOptions).toHaveBeenCalledWith({
        cardStyle: {
          backgroundColor: 'transparent',
          pointerEvents: 'auto',
        },
      });
    });

    it('falls back to OrderDetails callback-resolution when session id is present but session is missing from registry', async () => {
      mockGetSession.mockReturnValue(undefined);
      mockUseParams.mockReturnValue(callbackFlowParams);

      const { getByTestId } = renderWithProvider(<Checkout />, {}, true, false);

      await act(async () => {
        fireEvent.press(getByTestId('trigger-callback-navigation'));
      });

      await waitFor(() => {
        expect(mockNavigation.reset).toHaveBeenCalledWith(
          expect.objectContaining({
            routes: [
              expect.objectContaining({
                name: Routes.RAMP.RAMPS_ORDER_DETAILS,
                params: expect.objectContaining({
                  callbackUrl: `${callbackBaseUrl}?orderId=123`,
                  providerCode: 'moonpay',
                  walletAddress: '0xdeadbeef',
                }),
              }),
            ],
          }),
        );
      });
      expect(mockGetOrderFromCallback).not.toHaveBeenCalled();
      expect(mockAddOrder).not.toHaveBeenCalled();
      expect(mockCloseSession).not.toHaveBeenCalled();
      expect(mockParentPop).not.toHaveBeenCalled();
    });

    it('takes the regular non-headless path when headlessSessionId is absent', async () => {
      mockUseParams.mockReturnValue({
        url: 'https://provider.example.com/checkout',
        providerName: 'Test Provider',
        providerCode: 'moonpay',
        walletAddress: '0xdeadbeef',
      });

      const { getByTestId } = renderWithProvider(<Checkout />, {}, true, false);

      await act(async () => {
        fireEvent.press(getByTestId('trigger-callback-navigation'));
      });

      await waitFor(() => {
        expect(mockNavigation.reset).toHaveBeenCalled();
      });
      expect(mockGetOrderFromCallback).not.toHaveBeenCalled();
      expect(mockAddOrder).not.toHaveBeenCalled();
      expect(mockCloseSession).not.toHaveBeenCalled();
      expect(mockParentPop).not.toHaveBeenCalled();
    });

    it('attributes RAMPS_CHECKOUT_CLOSED to callback_success after a successful headless callback', async () => {
      mockGetSession.mockReturnValue({
        id: 'hs-1',
        status: 'continued',
        callbacks: {
          onOrderCreated: jest.fn(),
          onError: jest.fn(),
          onClose: jest.fn(),
        },
      });
      mockUseParams.mockReturnValue(callbackFlowParams);

      const { getByTestId, unmount } = renderWithProvider(
        <Checkout />,
        {},
        true,
        false,
      );

      await act(async () => {
        fireEvent.press(getByTestId('trigger-callback-navigation'));
      });
      unmount();

      const closedIdx = mockCreateEventBuilder.mock.calls.findIndex(
        (c) => c[0] === MetaMetricsEvents.RAMPS_CHECKOUT_CLOSED,
      );
      expect(closedIdx).toBeGreaterThanOrEqual(0);
      expect(mockAddProperties.mock.calls[closedIdx]?.[0]).toMatchObject({
        close_source: 'callback_success',
        callback_reached: true,
      });
    });
  });

  describe('WebView funnel analytics', () => {
    const findEventProps = (eventName: unknown) => {
      const idx = mockCreateEventBuilder.mock.calls.findIndex(
        (c) => c[0] === eventName,
      );
      return idx >= 0 ? mockAddProperties.mock.calls[idx]?.[0] : undefined;
    };

    const findAllEventProps = (eventName: unknown) =>
      mockCreateEventBuilder.mock.calls
        .map((call, idx) =>
          call[0] === eventName ? mockAddProperties.mock.calls[idx]?.[0] : null,
        )
        .filter((p): p is Record<string, unknown> => p !== null);

    it('fires RAMPS_CHECKOUT_OPENED on mount with checkout_session_id = effectiveOrderId when present', () => {
      mockUseParams.mockReturnValue({
        url: 'https://provider.example.com/checkout?token=secret',
        providerName: 'MoonPay',
        providerCode: 'moonpay',
        walletAddress: '0xabc',
        orderId: 'order-123',
      });

      renderWithProvider(<Checkout />, {}, true, false);

      const props = findEventProps(MetaMetricsEvents.RAMPS_CHECKOUT_OPENED);
      expect(props).toMatchObject({
        checkout_session_id: 'order-123',
        location: 'Checkout',
        ramp_type: 'UNIFIED_BUY_2',
        provider_name: 'MoonPay',
        initial_url_path: 'https://provider.example.com/checkout',
        has_callback_flow: true,
        order_id: 'order-123',
      });
    });

    it('fires RAMPS_CHECKOUT_OPENED with UUID checkout_session_id when no order ID present', () => {
      mockUseParams.mockReturnValue({
        url: 'https://provider.example.com/checkout',
        providerName: 'Test',
      });

      renderWithProvider(<Checkout />, {}, true, false);

      const props = findEventProps(MetaMetricsEvents.RAMPS_CHECKOUT_OPENED);
      expect(props).toMatchObject({
        checkout_session_id: 'mock-uuid-xyz',
        has_callback_flow: false,
      });
      expect((props as { order_id?: string }).order_id).toBeUndefined();
    });

    it('fires RAMPS_CHECKOUT_URL_CHANGED with step_index + previous_url_path and dedups repeats', async () => {
      mockUseParams.mockReturnValue({
        url: 'https://provider.example.com/checkout',
        providerName: 'Test',
        onNavigationStateChange: jest.fn(),
      });

      const { getByTestId } = renderWithProvider(<Checkout />, {}, true, false);

      await act(async () => {
        fireEvent.press(getByTestId('trigger-dedup-navigation'));
        fireEvent.press(getByTestId('trigger-dedup-navigation'));
      });

      const urlChanges = findAllEventProps(
        MetaMetricsEvents.RAMPS_CHECKOUT_URL_CHANGED,
      );
      expect(urlChanges).toHaveLength(1);
      expect(urlChanges[0]).toMatchObject({
        url_path: 'https://custom-dedup-url.example.com/',
        step_index: 1,
        is_callback_url: false,
      });
    });

    it('fires RAMPS_CHECKOUT_CALLBACK_DETECTED exactly once when callback URL arrives', async () => {
      mockGetOrderFromCallback.mockResolvedValue({
        providerOrderId: 'po-1',
        cryptoCurrency: { symbol: 'ETH' },
        cryptoAmount: '1',
        status: 'COMPLETED',
      });
      mockUseParams.mockReturnValue({
        url: 'https://provider.example.com/checkout',
        providerName: 'Test',
        providerCode: 'moonpay',
        walletAddress: '0xabc',
      });

      const { getByTestId } = renderWithProvider(<Checkout />, {}, true, false);

      await act(async () => {
        fireEvent.press(getByTestId('trigger-callback-navigation'));
      });

      const callbackDetected = findAllEventProps(
        MetaMetricsEvents.RAMPS_CHECKOUT_CALLBACK_DETECTED,
      );
      expect(callbackDetected).toHaveLength(1);
      expect(callbackDetected[0]).toMatchObject({
        url_path: expect.stringContaining('fake-callback'),
        step_index: 1,
      });
      expect(
        (callbackDetected[0] as { time_since_open_ms: number })
          .time_since_open_ms,
      ).toBeGreaterThanOrEqual(0);
    });

    it('fires RAMPS_CHECKOUT_LOAD_COMPLETED with load_success=true on successful load', async () => {
      mockUseParams.mockReturnValue({
        url: 'https://provider.example.com/checkout',
        providerName: 'Test',
      });

      const { getByTestId } = renderWithProvider(<Checkout />, {}, true, false);

      await act(async () => {
        fireEvent.press(getByTestId('trigger-load-start'));
        fireEvent.press(getByTestId('trigger-load-end'));
      });

      const props = findEventProps(
        MetaMetricsEvents.RAMPS_CHECKOUT_LOAD_COMPLETED,
      );
      expect(props).toMatchObject({
        url_path: 'https://provider.example.com/checkout',
        load_success: true,
      });
      expect(
        (props as { load_duration_ms: number }).load_duration_ms,
      ).toBeGreaterThanOrEqual(0);
    });

    it('fires RAMPS_CHECKOUT_HTTP_ERROR_RECEIVED and subsequent LOAD_COMPLETE has load_success=false', async () => {
      mockUseParams.mockReturnValue({
        url: 'https://provider.example.com/checkout',
        providerName: 'Test',
      });

      const { getByTestId } = renderWithProvider(<Checkout />, {}, true, false);

      await act(async () => {
        fireEvent.press(getByTestId('trigger-load-start'));
        fireEvent.press(getByTestId('trigger-http-error-main-uri'));
        fireEvent.press(getByTestId('trigger-load-end'));
      });

      const httpError = findEventProps(
        MetaMetricsEvents.RAMPS_CHECKOUT_HTTP_ERROR_RECEIVED,
      );
      expect(httpError).toMatchObject({
        url_path: 'https://provider.example.com/checkout',
        status_code: 502,
        is_initial_url: true,
      });

      const loadComplete = findEventProps(
        MetaMetricsEvents.RAMPS_CHECKOUT_LOAD_COMPLETED,
      );
      expect(loadComplete).toMatchObject({ load_success: false });
    });

    it('fires LOAD_COMPLETED with load_success=true on retry after a terminal HTTP error', async () => {
      mockUseParams.mockReturnValue({
        url: 'https://provider.example.com/checkout',
        providerName: 'Test',
      });

      const { getByTestId, getByText } = renderWithProvider(
        <Checkout />,
        {},
        true,
        false,
      );

      await act(async () => {
        fireEvent.press(getByTestId('trigger-load-start'));
        fireEvent.press(getByTestId('trigger-http-error-main-uri'));
        fireEvent.press(getByTestId('trigger-load-end'));
      });

      await act(async () => {
        fireEvent.press(getByText('Try again'));
      });

      await act(async () => {
        fireEvent.press(getByTestId('trigger-load-start'));
        fireEvent.press(getByTestId('trigger-load-end'));
      });

      const loadCompletes = findAllEventProps(
        MetaMetricsEvents.RAMPS_CHECKOUT_LOAD_COMPLETED,
      );
      expect(loadCompletes.length).toBeGreaterThanOrEqual(2);
      expect(loadCompletes[loadCompletes.length - 1]).toMatchObject({
        url_path: 'https://provider.example.com/checkout',
        load_success: true,
      });
    });

    it('reports is_initial_url=false for callback URL HTTP errors (terminal but not the initial page)', async () => {
      mockUseParams.mockReturnValue({
        url: 'https://provider.example.com/checkout',
        providerName: 'Test',
        providerCode: 'moonpay',
        walletAddress: '0xabc',
      });

      const { getByTestId } = renderWithProvider(<Checkout />, {}, true, false);

      await act(async () => {
        fireEvent.press(getByTestId('trigger-http-error-callback'));
      });

      const httpError = findEventProps(
        MetaMetricsEvents.RAMPS_CHECKOUT_HTTP_ERROR_RECEIVED,
      );
      expect(httpError).toMatchObject({
        status_code: 503,
        is_initial_url: false,
      });
    });

    it('fires RAMPS_CHECKOUT_CLOSED with close_source=user_close_button when X is pressed', () => {
      mockUseParams.mockReturnValue({
        url: 'https://provider.example.com/checkout',
        providerName: 'Test',
      });

      const { getByTestId, unmount } = renderWithProvider(
        <Checkout />,
        {},
        true,
        false,
      );

      fireEvent.press(getByTestId('checkout-close-button'));
      unmount();

      const closed = findEventProps(MetaMetricsEvents.RAMPS_CHECKOUT_CLOSED);
      expect(closed).toMatchObject({
        close_source: 'user_close_button',
        callback_reached: false,
      });
    });

    it('fires RAMPS_CHECKOUT_CLOSED with callback_success and callback_reached=true after successful callback', async () => {
      mockGetOrderFromCallback.mockResolvedValue({
        providerOrderId: 'po-1',
        cryptoCurrency: { symbol: 'ETH' },
        cryptoAmount: '1',
        status: 'COMPLETED',
      });
      mockUseParams.mockReturnValue({
        url: 'https://provider.example.com/checkout',
        providerName: 'Test',
        providerCode: 'moonpay',
        walletAddress: '0xabc',
      });

      const { getByTestId, unmount } = renderWithProvider(
        <Checkout />,
        {},
        true,
        false,
      );

      await act(async () => {
        fireEvent.press(getByTestId('trigger-callback-navigation'));
      });
      unmount();

      const closed = findEventProps(MetaMetricsEvents.RAMPS_CHECKOUT_CLOSED);
      expect(closed).toMatchObject({
        close_source: 'callback_success',
        callback_reached: true,
      });
    });

    it('fires RAMPS_CHECKOUT_CLOSED with close_source=background on unmount without signal', () => {
      mockUseParams.mockReturnValue({
        url: 'https://provider.example.com/checkout',
        providerName: 'Test',
      });

      const { unmount } = renderWithProvider(<Checkout />, {}, true, false);

      unmount();

      const closed = findEventProps(MetaMetricsEvents.RAMPS_CHECKOUT_CLOSED);
      expect(closed).toMatchObject({ close_source: 'background' });
    });

    it('does not fire LOAD_COMPLETE when onLoadEnd arrives without a matching onLoadStart', async () => {
      mockUseParams.mockReturnValue({
        url: 'https://provider.example.com/checkout',
        providerName: 'Test',
      });

      const { getByTestId } = renderWithProvider(<Checkout />, {}, true, false);

      await act(async () => {
        fireEvent.press(getByTestId('trigger-load-end'));
      });

      const loadCompletes = findAllEventProps(
        MetaMetricsEvents.RAMPS_CHECKOUT_LOAD_COMPLETED,
      );
      expect(loadCompletes).toHaveLength(0);
    });

    it('fires LOAD_COMPLETE only once when the same URL completes loading twice', async () => {
      mockUseParams.mockReturnValue({
        url: 'https://provider.example.com/checkout',
        providerName: 'Test',
      });

      const { getByTestId } = renderWithProvider(<Checkout />, {}, true, false);

      await act(async () => {
        fireEvent.press(getByTestId('trigger-load-start'));
        fireEvent.press(getByTestId('trigger-load-end'));
        fireEvent.press(getByTestId('trigger-load-start'));
        fireEvent.press(getByTestId('trigger-load-end'));
      });

      const loadCompletes = findAllEventProps(
        MetaMetricsEvents.RAMPS_CHECKOUT_LOAD_COMPLETED,
      );
      expect(loadCompletes).toHaveLength(1);
    });

    it('dedups URL_CHANGE when only the query string differs (same path)', () => {
      mockUseParams.mockReturnValue({
        url: 'https://provider.example.com/checkout',
        providerName: 'Test',
      });

      renderWithProvider(<Checkout />, {}, true, false);

      act(() => {
        capturedOnNavigationStateChange?.({
          url: 'https://provider.example.com/step?token=abc',
          loading: false,
        });
        capturedOnNavigationStateChange?.({
          url: 'https://provider.example.com/step?token=xyz',
          loading: false,
        });
      });

      const urlChanges = findAllEventProps(
        MetaMetricsEvents.RAMPS_CHECKOUT_URL_CHANGED,
      );
      expect(urlChanges).toHaveLength(1);
      expect(urlChanges[0]).toMatchObject({
        url_path: 'https://provider.example.com/step',
        step_index: 1,
      });
    });

    it('fires RAMPS_CHECKOUT_CLOSED with close_source=callback_success when callback URL is recognized (non-headless)', async () => {
      mockUseParams.mockReturnValue({
        url: 'https://provider.example.com/checkout',
        providerName: 'Test',
        providerCode: 'moonpay',
        walletAddress: '0xabc',
      });

      const { getByTestId, unmount } = renderWithProvider(
        <Checkout />,
        {},
        true,
        false,
      );

      await act(async () => {
        fireEvent.press(getByTestId('trigger-callback-navigation'));
      });
      unmount();

      const closed = findEventProps(MetaMetricsEvents.RAMPS_CHECKOUT_CLOSED);
      expect(closed).toMatchObject({ close_source: 'callback_success' });
    });

    it('fires RAMPS_CHECKOUT_CLOSED with close_source=http_error after a terminal HTTP error', async () => {
      mockUseParams.mockReturnValue({
        url: 'https://provider.example.com/checkout',
        providerName: 'Test',
      });

      const { getByTestId, unmount } = renderWithProvider(
        <Checkout />,
        {},
        true,
        false,
      );

      await act(async () => {
        fireEvent.press(getByTestId('trigger-http-error-main-uri'));
      });
      unmount();

      const closed = findEventProps(MetaMetricsEvents.RAMPS_CHECKOUT_CLOSED);
      expect(closed).toMatchObject({ close_source: 'http_error' });
    });

    it('redacts query strings and fragments from every url field (PII audit)', async () => {
      mockUseParams.mockReturnValue({
        url: 'https://provider.example.com/checkout?email=user@example.com&token=secret#frag',
        providerName: 'Test',
        onNavigationStateChange: jest.fn(),
      });

      const { getByTestId, unmount } = renderWithProvider(
        <Checkout />,
        {},
        true,
        false,
      );

      await act(async () => {
        fireEvent.press(getByTestId('trigger-dedup-navigation'));
        fireEvent.press(getByTestId('trigger-load-start'));
        fireEvent.press(getByTestId('trigger-load-end'));
      });
      unmount();

      const urlFieldNames = [
        'initial_url_path',
        'url_path',
        'previous_url_path',
        'last_url_path',
        'previous_url_path',
      ];
      for (const propsCall of mockAddProperties.mock.calls) {
        const props = propsCall[0] as Record<string, unknown>;
        for (const field of urlFieldNames) {
          const value = props[field];
          if (typeof value === 'string' && value.length > 0) {
            expect(value).not.toContain('?');
            expect(value).not.toContain('#');
            expect(value).not.toContain('@');
          }
        }
      }
    });
  });

  describe('Coinbase embedded checkout events', () => {
    const TRUSTED_URL =
      'https://pay.coinbase.com/v3/api-onramp/embedded-order?sessionToken=abc';
    const UNTRUSTED_URL = 'https://evil.example.com/mimic-coinbase';

    const coinbaseParams = {
      url: TRUSTED_URL,
      providerName: 'Coinbase',
      providerCode: 'coinbase-m',
      walletAddress: '0xabc',
      orderId: 'cdp-order-1',
      network: 'eip155:1',
    };

    const fireCoinbaseEvent = (
      eventName: string,
      data?: { errorCode?: string; errorMessage?: string },
      url: string = TRUSTED_URL,
    ) => {
      act(() => {
        capturedOnMessage?.({
          nativeEvent: {
            url,
            data: JSON.stringify({
              eventName: `onramp_api.${eventName}`,
              ...(data ? { data } : {}),
            }),
          },
        });
      });
    };

    const findAllProviderEventProps = () =>
      mockCreateEventBuilder.mock.calls
        .map((call, idx) =>
          call[0] === MetaMetricsEvents.RAMPS_CHECKOUT_PROVIDER_EVENT_RECEIVED
            ? mockAddProperties.mock.calls[idx]?.[0]
            : null,
        )
        .filter((p): p is Record<string, unknown> => p !== null);

    it('does not attach onMessage for a non-Coinbase checkout', () => {
      mockUseParams.mockReturnValue({
        url: 'https://provider.example.com/checkout',
        providerName: 'MoonPay',
      });

      renderWithProvider(<Checkout />, {}, true, false);

      expect(capturedOnMessage).toBeUndefined();
    });

    it('attaches onMessage for a Coinbase checkout', () => {
      mockUseParams.mockReturnValue(coinbaseParams);

      renderWithProvider(<Checkout />, {}, true, false);

      expect(capturedOnMessage).toBeInstanceOf(Function);
    });

    it('ignores a message that does not parse as a Coinbase event', () => {
      mockUseParams.mockReturnValue(coinbaseParams);

      const { queryByTestId } = renderWithProvider(
        <Checkout />,
        {},
        true,
        false,
      );

      act(() => {
        capturedOnMessage?.({
          nativeEvent: {
            url: TRUSTED_URL,
            data: JSON.stringify({ type: 'IFRAME_DETECTED' }),
          },
        });
      });

      expect(queryByTestId('checkout-webview')).toBeOnTheScreen();
    });

    it('ignores and does not track a message posted from an untrusted origin', () => {
      mockUseParams.mockReturnValue(coinbaseParams);

      const { queryByTestId } = renderWithProvider(
        <Checkout />,
        {},
        true,
        false,
      );

      fireCoinbaseEvent(
        'load_error',
        { errorCode: 'expired_session_token' },
        UNTRUSTED_URL,
      );

      expect(queryByTestId('checkout-webview')).toBeOnTheScreen();
      expect(findAllProviderEventProps()).toHaveLength(0);
    });

    it('a polling_success posted from another url does not close', () => {
      const mockParentPop = jest.fn();
      mockNavigation.getParent.mockReturnValue({ pop: mockParentPop });
      mockUseParams.mockReturnValue(coinbaseParams);

      renderWithProvider(<Checkout />, {}, true, false);

      fireCoinbaseEvent('polling_success', undefined, UNTRUSTED_URL);

      expect(mockParentPop).not.toHaveBeenCalled();
    });

    it('sets the expired-link error on load_error with errorCode expired_session_token', () => {
      mockUseParams.mockReturnValue(coinbaseParams);

      const { getByText } = renderWithProvider(<Checkout />, {}, true, false);

      fireCoinbaseEvent('load_error', { errorCode: 'expired_session_token' });

      expect(
        getByText('The checkout link has expired. Go back and try again.'),
      ).toBeOnTheScreen();
    });

    it('pressing the expired-link CTA goes back instead of remounting', () => {
      mockUseParams.mockReturnValue(coinbaseParams);

      const { getByText } = renderWithProvider(<Checkout />, {}, true, false);

      fireCoinbaseEvent('load_error', { errorCode: 'expired_session_token' });

      fireEvent.press(getByText('Go back'));

      expect(mockNavigation.goBack).toHaveBeenCalled();
    });

    it('offers go back instead of retry on a Coinbase payment error, since its link is single-use', () => {
      mockUseParams.mockReturnValue(coinbaseParams);

      const { getByText, queryByTestId } = renderWithProvider(
        <Checkout />,
        {},
        true,
        false,
      );

      fireCoinbaseEvent('commit_error');
      fireEvent.press(getByText('Go back'));

      expect(mockNavigation.goBack).toHaveBeenCalled();
      expect(queryByTestId('checkout-webview')).toBeNull();
    });

    it('shows a fixed generic error on load_error for other error codes', () => {
      mockUseParams.mockReturnValue(coinbaseParams);

      const { getByText } = renderWithProvider(<Checkout />, {}, true, false);

      fireCoinbaseEvent('load_error', { errorCode: 'something_else' });

      expect(getByText('Something went wrong')).toBeOnTheScreen();
    });

    it('shows a fixed generic error on load_error with no error code at all', () => {
      mockUseParams.mockReturnValue(coinbaseParams);

      const { getByText } = renderWithProvider(<Checkout />, {}, true, false);

      fireCoinbaseEvent('load_error');

      expect(getByText('Something went wrong')).toBeOnTheScreen();
    });

    it('sets a fixed payment-failed error on commit_error, never the page errorMessage', () => {
      mockUseParams.mockReturnValue(coinbaseParams);

      const { getByText, queryByText } = renderWithProvider(
        <Checkout />,
        {},
        true,
        false,
      );

      fireCoinbaseEvent('commit_error', {
        errorMessage: 'attacker controlled text',
      });

      expect(
        getByText('The payment could not be completed. Please try again.'),
      ).toBeOnTheScreen();
      expect(queryByText('attacker controlled text')).toBeNull();
    });

    it('fails a headless session on commit_error instead of showing an in-app error', () => {
      const mockFailSession = jest.requireMock('../../headless/sessionRegistry')
        .failSession as jest.Mock;
      const mockGetSession = jest.requireMock('../../headless/sessionRegistry')
        .getSession as jest.Mock;
      const mockParentPop = jest.fn();
      mockNavigation.getParent.mockImplementation(() => ({
        pop: mockParentPop,
        getParent: () => ({
          setOptions: mockHeadlessEntrySetOptions,
        }),
      }));
      mockGetSession.mockReturnValue(undefined);
      mockFailSession.mockReturnValue({ code: 'UNKNOWN', message: 'boom' });
      mockUseParams.mockReturnValue({
        ...coinbaseParams,
        headlessSessionId: 'hs-coinbase-err',
      });

      const { queryByText, queryByTestId } = renderWithProvider(
        <Checkout />,
        {},
        true,
        false,
      );

      fireCoinbaseEvent('commit_error');

      expect(mockFailSession).toHaveBeenCalledTimes(1);
      expect(mockFailSession).toHaveBeenCalledWith(
        'hs-coinbase-err',
        expect.any(Error),
      );
      expect(mockParentPop).toHaveBeenCalledTimes(1);
      expect(
        queryByText('The payment could not be completed. Please try again.'),
      ).toBeNull();
      expect(queryByTestId('checkout-webview')).toBeOnTheScreen();
    });

    it('still shows the fixed error for a non-headless Coinbase checkout on commit_error', () => {
      mockUseParams.mockReturnValue(coinbaseParams);

      const { getByText } = renderWithProvider(<Checkout />, {}, true, false);

      fireCoinbaseEvent('commit_error');

      expect(
        getByText('The payment could not be completed. Please try again.'),
      ).toBeOnTheScreen();
    });

    it('sets a fixed payment-failed error on polling_error without an errorMessage', () => {
      mockUseParams.mockReturnValue(coinbaseParams);

      const { getByText } = renderWithProvider(<Checkout />, {}, true, false);

      fireCoinbaseEvent('polling_error');

      expect(
        getByText('The payment could not be completed. Please try again.'),
      ).toBeOnTheScreen();
    });

    it('resets to OrderDetails for the precreated order on polling_success', () => {
      mockUseParams.mockReturnValue({
        ...coinbaseParams,
        cryptocurrency: 'USDC',
      });

      renderWithProvider(<Checkout />, {}, true, false);

      fireCoinbaseEvent('polling_success');

      expect(mockProtectWalletModalVisible).toHaveBeenCalled();
      expect(mockNavigation.reset).toHaveBeenCalledWith({
        index: 0,
        routes: [
          {
            name: Routes.RAMP.RAMPS_ORDER_DETAILS,
            params: {
              orderId: 'cdp-order-1',
              showCloseButton: true,
              cryptocurrency: 'USDC',
            },
          },
        ],
      });
      expect(mockNavigation.getParent).not.toHaveBeenCalled();
    });

    it('pops the sheet on polling_success when there is no order id to show', () => {
      const mockParentPop = jest.fn();
      mockNavigation.getParent.mockReturnValue({ pop: mockParentPop });
      mockUseParams.mockReturnValue({ ...coinbaseParams, orderId: undefined });

      renderWithProvider(<Checkout />, {}, true, false);

      fireCoinbaseEvent('polling_success');

      expect(mockParentPop).toHaveBeenCalled();
      expect(mockNavigation.reset).not.toHaveBeenCalled();
    });

    it('navigates only once when two polling_success messages arrive', () => {
      mockUseParams.mockReturnValue(coinbaseParams);

      renderWithProvider(<Checkout />, {}, true, false);

      fireCoinbaseEvent('polling_success');
      fireCoinbaseEvent('polling_success');

      expect(mockNavigation.reset).toHaveBeenCalledTimes(1);
    });

    it('does not pop again from polling_success once the callback URL already closed the sheet', async () => {
      const mockParentPop = jest.fn();
      mockNavigation.getParent.mockReturnValue({ pop: mockParentPop });
      mockUseParams.mockReturnValue(coinbaseParams);

      const { getByTestId } = renderWithProvider(<Checkout />, {}, true, false);

      await act(async () => {
        fireEvent.press(getByTestId('trigger-callback-navigation'));
      });
      mockParentPop.mockClear();

      fireCoinbaseEvent('polling_success');

      expect(mockParentPop).not.toHaveBeenCalled();
    });

    describe('headless polling_success', () => {
      const mockGetSession = jest.requireMock('../../headless/sessionRegistry')
        .getSession as jest.Mock;
      const mockCloseSession = jest.requireMock(
        '../../headless/sessionRegistry',
      ).closeSession as jest.Mock;
      const mockSetHeadlessOrderContext = jest.requireMock(
        '../../../../../core/Engine/controllers/ramps-controller/headlessOrderContextRegistry',
      ).setHeadlessOrderContext as jest.Mock;
      const mockOnOrderCreated = jest.fn();
      const mockParentPop = jest.fn();

      beforeEach(() => {
        mockNavigation.getParent.mockImplementation(() => ({
          pop: mockParentPop,
          getParent: () => ({
            setOptions: mockHeadlessEntrySetOptions,
          }),
        }));
        mockGetSession.mockReturnValue({
          id: 'hs-coinbase-1',
          params: { rampSurface: 'money_account' },
          callbacks: {
            onOrderCreated: mockOnOrderCreated,
            onError: jest.fn(),
            onClose: jest.fn(),
          },
        });
      });

      it('hands the order code to the consumer and closes the session as completed', () => {
        mockUseParams.mockReturnValue({
          ...coinbaseParams,
          orderId: '/providers/coinbase-m/orders/cdp-order-1',
          headlessSessionId: 'hs-coinbase-1',
        });

        renderWithProvider(<Checkout />, {}, true, false);

        fireCoinbaseEvent('polling_success');

        expect(mockOnOrderCreated).toHaveBeenCalledWith('cdp-order-1');
        expect(mockSetHeadlessOrderContext).toHaveBeenCalledWith(
          'cdp-order-1',
          expect.objectContaining({ rampSurface: 'money_account' }),
        );
        expect(mockCloseSession).toHaveBeenCalledWith('hs-coinbase-1', {
          reason: 'completed',
        });
        expect(mockParentPop).toHaveBeenCalledTimes(1);
      });

      it('completes the session once for duplicate polling_success events', () => {
        mockUseParams.mockReturnValue({
          ...coinbaseParams,
          headlessSessionId: 'hs-coinbase-1',
        });

        renderWithProvider(<Checkout />, {}, true, false);

        fireCoinbaseEvent('polling_success');
        fireCoinbaseEvent('polling_success');

        expect(mockOnOrderCreated).toHaveBeenCalledTimes(1);
        expect(mockCloseSession).toHaveBeenCalledTimes(1);
        expect(mockParentPop).toHaveBeenCalledTimes(1);
      });

      it('closes the session as dismissed when there is no order id to report', () => {
        mockUseParams.mockReturnValue({
          ...coinbaseParams,
          orderId: undefined,
          headlessSessionId: 'hs-coinbase-1',
        });

        renderWithProvider(<Checkout />, {}, true, false);

        fireCoinbaseEvent('polling_success');

        expect(mockOnOrderCreated).not.toHaveBeenCalled();
        expect(mockCloseSession).toHaveBeenCalledWith('hs-coinbase-1', {
          reason: 'user_dismissed',
        });
        expect(mockParentPop).toHaveBeenCalledTimes(1);
      });

      it('still completes the session when the consumer callback throws', () => {
        mockOnOrderCreated.mockImplementationOnce(() => {
          throw new Error('consumer boom');
        });
        mockUseParams.mockReturnValue({
          ...coinbaseParams,
          headlessSessionId: 'hs-coinbase-1',
        });

        renderWithProvider(<Checkout />, {}, true, false);

        fireCoinbaseEvent('polling_success');

        expect(mockCloseSession).toHaveBeenCalledWith('hs-coinbase-1', {
          reason: 'completed',
        });
        expect(mockParentPop).toHaveBeenCalledTimes(1);
      });
    });

    it('does not close or error when cancel arrives before commit_success', () => {
      const mockParentPop = jest.fn();
      mockNavigation.getParent.mockReturnValue({ pop: mockParentPop });
      mockUseParams.mockReturnValue(coinbaseParams);

      const { queryByTestId } = renderWithProvider(
        <Checkout />,
        {},
        true,
        false,
      );

      fireCoinbaseEvent('cancel');

      expect(mockParentPop).not.toHaveBeenCalled();
      expect(queryByTestId('checkout-webview')).toBeOnTheScreen();
    });

    it('ignores cancel received after commit_success (does not close the sheet)', () => {
      const mockParentPop = jest.fn();
      mockNavigation.getParent.mockReturnValue({ pop: mockParentPop });
      mockUseParams.mockReturnValue(coinbaseParams);

      renderWithProvider(<Checkout />, {}, true, false);

      fireCoinbaseEvent('commit_success');
      fireCoinbaseEvent('cancel');

      expect(mockParentPop).not.toHaveBeenCalled();
    });

    it('shows the fixed error for a limit session_error when there is no fallback buy widget', () => {
      mockUseParams.mockReturnValue(coinbaseParams);

      const { getByText, queryByTestId } = renderWithProvider(
        <Checkout />,
        {},
        true,
        false,
      );

      fireCoinbaseEvent('session_error', {
        errorCode: 'ERROR_CODE_GUEST_TRANSACTION_LIMIT',
      });

      expect(getByText('Something went wrong')).toBeOnTheScreen();
      expect(queryByTestId('checkout-webview')).toBeNull();
    });

    it('sets a fixed generic error for a non-limit session_error, never the page errorMessage', () => {
      mockUseParams.mockReturnValue(coinbaseParams);

      const { getByText, queryByText } = renderWithProvider(
        <Checkout />,
        {},
        true,
        false,
      );

      fireCoinbaseEvent('session_error', {
        errorMessage: 'attacker controlled text',
      });

      expect(getByText('Something went wrong')).toBeOnTheScreen();
      expect(queryByText('attacker controlled text')).toBeNull();
    });

    it('tracks RAMPS_CHECKOUT_PROVIDER_EVENT_RECEIVED once per distinct event name', () => {
      mockUseParams.mockReturnValue(coinbaseParams);

      renderWithProvider(<Checkout />, {}, true, false);

      fireCoinbaseEvent('polling_start');
      fireCoinbaseEvent('polling_start');
      fireCoinbaseEvent('polling_start');
      fireCoinbaseEvent('load_success');

      const events = findAllProviderEventProps();
      const pollingStartEvents = events.filter(
        (e) => e.event_name === 'polling_start',
      );
      expect(pollingStartEvents).toHaveLength(1);
      expect(events.map((e) => e.event_name)).toEqual(
        expect.arrayContaining(['polling_start', 'load_success']),
      );
    });

    it('includes event_name and error_code plus base props on the tracked event, never error_message', () => {
      mockUseParams.mockReturnValue(coinbaseParams);

      renderWithProvider(<Checkout />, {}, true, false);

      fireCoinbaseEvent('session_error', {
        errorCode: 'ERROR_CODE_GUEST_TRANSACTION_LIMIT',
        errorMessage: 'attacker controlled text',
      });

      const events = findAllProviderEventProps();
      expect(events[0]).toMatchObject({
        event_name: 'session_error',
        error_code: 'ERROR_CODE_GUEST_TRANSACTION_LIMIT',
        location: 'Checkout',
        ramp_type: 'UNIFIED_BUY_2',
      });
      expect(events[0]).not.toHaveProperty('error_message');
    });

    describe('guest-limit fallback action', () => {
      const coinbaseParamsWithFallback = {
        ...coinbaseParams,
        fallbackBuyWidget: {
          url: 'https://pay.coinbase.com/buy?sessionToken=fallback-token',
          browser: 'IN_APP_OS_BROWSER' as const,
        },
      };

      const findEventProps = (eventName: unknown) => {
        const idx = mockCreateEventBuilder.mock.calls.findIndex(
          (c) => c[0] === eventName,
        );
        return idx >= 0 ? mockAddProperties.mock.calls[idx]?.[0] : undefined;
      };

      it('shows the fallback action for a limit session_error when a fallback buy widget is present', () => {
        mockUseParams.mockReturnValue(coinbaseParamsWithFallback);

        const { getByText, queryByTestId } = renderWithProvider(
          <Checkout />,
          {},
          true,
          false,
        );

        fireCoinbaseEvent('session_error', {
          errorCode: 'ERROR_CODE_GUEST_TRANSACTION_LIMIT',
        });

        expect(
          getByText('Continue with your Coinbase account'),
        ).toBeOnTheScreen();
        expect(queryByTestId('checkout-webview')).toBeNull();
      });

      it('tapping the fallback action fetches the hosted widget with the provider redirect URL and opens it, without popping the sheet itself', async () => {
        const mockParentPop = jest.fn();
        mockNavigation.getParent.mockReturnValue({ pop: mockParentPop });
        mockGetFallbackBuyWidgetData.mockResolvedValueOnce({
          url: 'https://pay.coinbase.com/buy?sessionToken=hosted-token',
          orderId: 'coinbase-m/orders/hosted-1',
        });
        mockUseParams.mockReturnValue(coinbaseParamsWithFallback);

        const { getByText } = renderWithProvider(<Checkout />, {}, true, false);

        fireCoinbaseEvent('session_error', {
          errorCode: 'ERROR_CODE_GUEST_TRANSACTION_LIMIT',
        });

        await act(async () => {
          fireEvent.press(getByText('Continue with your Coinbase account'));
        });

        expect(mockGetFallbackBuyWidgetData).toHaveBeenCalledTimes(1);
        expect(mockGetFallbackBuyWidgetData).toHaveBeenCalledWith(
          coinbaseParamsWithFallback.fallbackBuyWidget,
          { redirectUrl: 'metamask://on-ramp/providers/coinbase-m' },
        );

        expect(mockOpenHostedBuyWidget).toHaveBeenCalledWith({
          url: 'https://pay.coinbase.com/buy?sessionToken=hosted-token',
          redirectUrl: 'metamask://on-ramp/providers/coinbase-m',
          providerCode: 'coinbase-m',
          orderId: 'coinbase-m/orders/hosted-1',
          walletAddress: '0xabc',
          chainId: 'eip155:1',
        });

        // openHostedBuyWidget owns the navigation reset; Checkout never pops.
        expect(mockParentPop).not.toHaveBeenCalled();
      });

      it('shows the fixed error when fetching the hosted widget fails, leaving the sheet mounted', async () => {
        mockGetFallbackBuyWidgetData.mockRejectedValueOnce(
          new Error('network down'),
        );
        mockUseParams.mockReturnValue(coinbaseParamsWithFallback);

        const { getByText, getByTestId } = renderWithProvider(
          <Checkout />,
          {},
          true,
          false,
        );

        fireCoinbaseEvent('session_error', {
          errorCode: 'ERROR_CODE_GUEST_TRANSACTION_LIMIT',
        });

        await act(async () => {
          fireEvent.press(getByText('Continue with your Coinbase account'));
        });

        expect(getByText('Something went wrong')).toBeOnTheScreen();
        expect(mockOpenHostedBuyWidget).not.toHaveBeenCalled();
        // The sheet is still mounted; nothing navigated away under the error.
        expect(getByTestId('checkout-close-button')).toBeOnTheScreen();
        expect(mockNavigation.getParent).not.toHaveBeenCalled();
        expect(mockNavigation.reset).not.toHaveBeenCalled();
      });

      it('returns to the fallback action when Try again is pressed after the hosted widget fetch fails', async () => {
        mockGetFallbackBuyWidgetData.mockRejectedValueOnce(
          new Error('network down'),
        );
        mockUseParams.mockReturnValue(coinbaseParamsWithFallback);

        const { getByText, queryByTestId } = renderWithProvider(
          <Checkout />,
          {},
          true,
          false,
        );

        fireCoinbaseEvent('session_error', {
          errorCode: 'ERROR_CODE_GUEST_TRANSACTION_LIMIT',
        });
        await act(async () => {
          fireEvent.press(getByText('Continue with your Coinbase account'));
        });
        fireEvent.press(getByText('Try again'));

        expect(
          getByText('Continue with your Coinbase account'),
        ).toBeOnTheScreen();
        // The used checkout link is not reloaded.
        expect(queryByTestId('checkout-webview')).toBeNull();
      });

      it('shows the fixed error when the hosted hand-off itself rejects, leaving the sheet mounted', async () => {
        mockGetFallbackBuyWidgetData.mockResolvedValueOnce({
          url: 'https://pay.coinbase.com/buy?sessionToken=hosted-token',
          orderId: 'coinbase-m/orders/hosted-1',
        });
        mockOpenHostedBuyWidget.mockRejectedValueOnce(
          new Error('Linking.openURL failed'),
        );
        mockUseParams.mockReturnValue(coinbaseParamsWithFallback);

        const { getByText, getByTestId } = renderWithProvider(
          <Checkout />,
          {},
          true,
          false,
        );

        fireCoinbaseEvent('session_error', {
          errorCode: 'ERROR_CODE_GUEST_TRANSACTION_LIMIT',
        });

        await act(async () => {
          fireEvent.press(getByText('Continue with your Coinbase account'));
        });

        expect(mockOpenHostedBuyWidget).toHaveBeenCalledTimes(1);
        expect(getByText('Something went wrong')).toBeOnTheScreen();
        // Hand-off never completed, so nothing navigated away.
        expect(mockNavigation.getParent).not.toHaveBeenCalled();
        expect(mockNavigation.reset).not.toHaveBeenCalled();
        expect(getByTestId('checkout-close-button')).toBeOnTheScreen();
      });

      it('does not call getFallbackBuyWidgetData twice when the fallback action is pressed twice in a row', async () => {
        let resolveGetFallbackBuyWidgetData:
          | ((value: { url: string; orderId: string }) => void)
          | undefined;
        mockGetFallbackBuyWidgetData.mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              resolveGetFallbackBuyWidgetData = resolve;
            }),
        );
        mockUseParams.mockReturnValue(coinbaseParamsWithFallback);

        const { getByText } = renderWithProvider(<Checkout />, {}, true, false);

        fireCoinbaseEvent('session_error', {
          errorCode: 'ERROR_CODE_GUEST_TRANSACTION_LIMIT',
        });

        await act(async () => {
          fireEvent.press(getByText('Continue with your Coinbase account'));
          fireEvent.press(getByText('Continue with your Coinbase account'));
        });

        expect(mockGetFallbackBuyWidgetData).toHaveBeenCalledTimes(1);

        await act(async () => {
          resolveGetFallbackBuyWidgetData?.({
            url: 'https://pay.coinbase.com/buy?sessionToken=hosted-token',
            orderId: 'coinbase-m/orders/hosted-1',
          });
        });

        expect(mockOpenHostedBuyWidget).toHaveBeenCalledTimes(1);
      });

      it('fails a headless session on a limit session_error instead of showing the fallback action', () => {
        const mockFailSession = jest.requireMock(
          '../../headless/sessionRegistry',
        ).failSession as jest.Mock;
        const mockGetSession = jest.requireMock(
          '../../headless/sessionRegistry',
        ).getSession as jest.Mock;
        const mockParentPop = jest.fn();
        mockNavigation.getParent.mockImplementation(() => ({
          pop: mockParentPop,
          getParent: () => ({
            setOptions: mockHeadlessEntrySetOptions,
          }),
        }));
        mockGetSession.mockReturnValue(undefined);
        mockFailSession.mockReturnValue({ code: 'UNKNOWN', message: 'boom' });
        mockUseParams.mockReturnValue({
          ...coinbaseParamsWithFallback,
          headlessSessionId: 'hs-coinbase-limit',
        });

        const { queryByText } = renderWithProvider(
          <Checkout />,
          {},
          true,
          false,
        );

        fireCoinbaseEvent('session_error', {
          errorCode: 'ERROR_CODE_GUEST_TRANSACTION_LIMIT',
        });

        expect(mockFailSession).toHaveBeenCalledTimes(1);
        expect(mockFailSession).toHaveBeenCalledWith(
          'hs-coinbase-limit',
          expect.any(Error),
        );
        expect(mockParentPop).toHaveBeenCalledTimes(1);
        expect(queryByText('Continue with your Coinbase account')).toBeNull();
      });

      it('tracks RAMPS_CHECKOUT_FALLBACK_OPENED with error_code and base props when the action is pressed', async () => {
        mockUseParams.mockReturnValue(coinbaseParamsWithFallback);

        const { getByText } = renderWithProvider(<Checkout />, {}, true, false);

        fireCoinbaseEvent('session_error', {
          errorCode: 'ERROR_CODE_GUEST_TRANSACTION_LIMIT',
        });

        await act(async () => {
          fireEvent.press(getByText('Continue with your Coinbase account'));
        });

        const props = findEventProps(
          MetaMetricsEvents.RAMPS_CHECKOUT_FALLBACK_OPENED,
        );
        expect(props).toMatchObject({
          error_code: 'ERROR_CODE_GUEST_TRANSACTION_LIMIT',
          location: 'Checkout',
          ramp_type: 'UNIFIED_BUY_2',
        });
      });
    });
  });
});
