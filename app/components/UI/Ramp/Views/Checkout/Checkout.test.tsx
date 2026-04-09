/* eslint-disable @metamask/design-tokens/color-no-hex -- theme mock uses hex for test compatibility */
import React from 'react';
import { fireEvent, act, waitFor } from '@testing-library/react-native';
import Checkout from './Checkout';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { callbackBaseUrl } from '../../Aggregator/sdk';

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

let capturedDepositNavbarOnClose: (() => void) | undefined;
jest.mock('../../../Navbar', () => ({
  getDepositNavbarOptions: jest.fn(
    (
      _navigation: unknown,
      _params: unknown,
      _theme: unknown,
      onClose?: () => void,
    ) => {
      capturedDepositNavbarOnClose = onClose;
      return { header: () => null };
    },
  ),
}));

jest.mock('../../../../../util/Logger', () => ({
  error: jest.fn(),
  log: jest.fn(),
}));

jest.mock('../../../../../util/browser', () => ({
  shouldStartLoadWithRequest: jest.fn(() => true),
}));

jest.mock('../../Aggregator/sdk', () => ({
  callbackBaseUrl:
    'https://on-ramp-content.api.cx.metamask.io/regions/fake-callback',
  useRampSDK: jest.fn(() => null),
}));

let capturedOnNavigationStateChange:
  | ((state: { url: string; loading?: boolean }) => void)
  | undefined;

jest.mock('@metamask/react-native-webview', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires -- jest mock factory
  const { View, Button } = require('react-native');
  const getCallbackBaseUrl = () =>
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires -- resolve mocked sdk at press time (avoids jest hoist / TDZ with outer consts)
    require('../../Aggregator/sdk').callbackBaseUrl as string;
  return {
    WebView: ({
      onNavigationStateChange,
      onHttpError,
      onShouldStartLoadWithRequest,
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

const mockGetIdProofStatus = jest.fn();
jest.mock('../../hooks/useTransakController', () => ({
  useTransakController: () => ({
    getIdProofStatus: mockGetIdProofStatus,
  }),
}));

jest.mock('../../../../../util/device', () => ({
  isAndroid: jest.fn(() => false),
}));

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
    getParent: jest.fn(() => ({ pop: jest.fn() })),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    capturedDepositNavbarOnClose = undefined;
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
    mockNavigation.getParent.mockReset();
    mockNavigation.getParent.mockImplementation(() => ({ pop: jest.fn() }));
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

  describe('deposit navbar back analytics', () => {
    it('tracks RAMPS_BACK_BUTTON_CLICKED when deposit navbar onClose runs', () => {
      mockUseParams.mockReturnValue({
        url: 'https://provider.example.com/checkout',
        providerName: 'RampCo',
      });

      renderWithProvider(<Checkout />, {}, true, false);

      expect(capturedDepositNavbarOnClose).toEqual(expect.any(Function));
      act(() => {
        capturedDepositNavbarOnClose?.();
      });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.RAMPS_BACK_BUTTON_CLICKED,
      );
      expect(mockTrackEvent).toHaveBeenCalled();
    });
  });

  describe('V2 enabled flow', () => {
    it('calls showV2OrderToast when V2 is enabled and callback succeeds', async () => {
      const { showV2OrderToast } = jest.requireMock(
        '../../utils/v2OrderToast',
      ) as {
        showV2OrderToast: jest.Mock;
      };
      const mockOrder = {
        providerOrderId: 'order-v2-1',
        cryptoCurrency: { symbol: 'ETH' },
        cryptoAmount: '0.5',
        status: 'COMPLETED',
      };
      mockGetOrderFromCallback.mockResolvedValue(mockOrder);
      mockUseRampsUnifiedV2Enabled.mockReturnValue(true);
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
        expect(showV2OrderToast).toHaveBeenCalledWith(
          expect.objectContaining({
            orderId: 'order-v2-1',
            cryptocurrency: 'ETH',
          }),
        );
      });
    });
  });

  describe('callback error handling', () => {
    it('sets error when getOrderFromCallback returns null', async () => {
      mockGetOrderFromCallback.mockResolvedValue(null);
      mockUseParams.mockReturnValue({
        url: 'https://provider.example.com/checkout',
        providerName: 'Test',
        providerCode: 'moonpay',
        walletAddress: '0xabc',
      });

      const { getByTestId, getByText } = renderWithProvider(
        <Checkout />,
        {},
        true,
        false,
      );

      await act(async () => {
        fireEvent.press(getByTestId('trigger-callback-navigation'));
      });

      await waitFor(() => {
        expect(
          getByText('Order could not be retrieved from callback'),
        ).toBeOnTheScreen();
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

  describe('KYC auto-close polling', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('does not poll when workFlowRunId is not provided', () => {
      mockUseParams.mockReturnValue({
        url: 'https://provider.example.com/checkout',
        providerName: 'Test Provider',
      });

      renderWithProvider(<Checkout />, {}, true, false);

      jest.advanceTimersByTime(5000);

      expect(mockGetIdProofStatus).not.toHaveBeenCalled();
    });

    it('polls getIdProofStatus when workFlowRunId is provided', async () => {
      mockGetIdProofStatus.mockResolvedValue({ status: 'PENDING' });
      mockUseParams.mockReturnValue({
        url: 'https://provider.example.com/checkout',
        providerName: 'Test Provider',
        workFlowRunId: 'wf-test-123',
      });

      renderWithProvider(<Checkout />, {}, true, false);

      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      expect(mockGetIdProofStatus).toHaveBeenCalledWith('wf-test-123');
    });

    it('auto-closes webview when KYC status is SUBMITTED', async () => {
      mockGetIdProofStatus.mockResolvedValue({ status: 'SUBMITTED' });
      mockUseParams.mockReturnValue({
        url: 'https://provider.example.com/checkout',
        providerName: 'Test Provider',
        workFlowRunId: 'wf-test-123',
      });

      renderWithProvider(<Checkout />, {}, true, false);

      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      expect(mockNavigation.goBack).toHaveBeenCalled();
    });

    it('stops polling after SUBMITTED and does not call goBack again', async () => {
      mockGetIdProofStatus.mockResolvedValue({ status: 'SUBMITTED' });
      mockUseParams.mockReturnValue({
        url: 'https://provider.example.com/checkout',
        providerName: 'Test Provider',
        workFlowRunId: 'wf-test-123',
      });

      renderWithProvider(<Checkout />, {}, true, false);

      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);

      await act(async () => {
        jest.advanceTimersByTime(4000);
      });

      expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
    });

    it('continues polling on error', async () => {
      mockGetIdProofStatus
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ status: 'SUBMITTED' });
      mockUseParams.mockReturnValue({
        url: 'https://provider.example.com/checkout',
        providerName: 'Test Provider',
        workFlowRunId: 'wf-test-123',
      });

      renderWithProvider(<Checkout />, {}, true, false);

      // First poll: error
      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      expect(mockNavigation.goBack).not.toHaveBeenCalled();

      // Second poll: success
      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      expect(mockNavigation.goBack).toHaveBeenCalled();
    });
  });
});
