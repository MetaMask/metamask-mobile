import { renderHook, act } from '@testing-library/react-native';
import type { WebViewMessageEvent } from '@metamask/react-native-webview';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import type { FunnelBaseProps } from '../utils/webviewFunnelAnalytics';
import { useCheckoutPageEvents } from './useCheckoutPageEvents';

jest.mock('./useRampsQuotes', () => ({
  useRampsQuotes: jest.fn(),
}));

jest.mock('./useOpenHostedBuyWidget', () => ({
  useOpenHostedBuyWidget: jest.fn(),
}));

jest.mock('../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: jest.fn(),
}));

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), log: jest.fn() },
}));

const mockUseRampsQuotes = jest.requireMock('./useRampsQuotes')
  .useRampsQuotes as jest.Mock;
const mockUseOpenHostedBuyWidget = jest.requireMock('./useOpenHostedBuyWidget')
  .useOpenHostedBuyWidget as jest.Mock;
const mockUseAnalytics = jest.requireMock(
  '../../../hooks/useAnalytics/useAnalytics',
).useAnalytics as jest.Mock;

const BASE_PROPS: FunnelBaseProps = {
  checkout_session_id: 'sess-1',
  location: 'Checkout',
  ramp_type: 'UNIFIED_BUY_2',
  provider_name: 'Coinbase',
};

const COINBASE_URL = 'https://pay.coinbase.com/buy/select-asset';
const FALLBACK = {
  url: 'https://pay.coinbase.com/buy?appId=x',
  browser: 'IN_APP_OS_BROWSER' as const,
};

const makeMessage = (
  eventName: string,
  data?: Record<string, unknown>,
  url: string = COINBASE_URL,
): WebViewMessageEvent =>
  ({
    nativeEvent: {
      url,
      data: JSON.stringify({ eventName: `onramp_api.${eventName}`, data }),
    },
  }) as unknown as WebViewMessageEvent;

function setup(
  overrides: Partial<Parameters<typeof useCheckoutPageEvents>[0]> = {},
) {
  const onCompleted = jest.fn();
  const onError = jest.fn();
  const onFallbackOpened = jest.fn();
  const hook = renderHook(() =>
    useCheckoutPageEvents({
      providerCode: 'coinbase-m',
      fallbackBuyWidget: FALLBACK,
      walletAddress: '0xabc',
      chainId: '1',
      isHeadless: false,
      analyticsBaseProps: BASE_PROPS,
      onCompleted,
      onError,
      onFallbackOpened,
      ...overrides,
    }),
  );
  const post = (
    eventName: string,
    data?: Record<string, unknown>,
    url?: string,
  ) =>
    act(() => {
      hook.result.current.onMessage?.(makeMessage(eventName, data, url));
    });
  return {
    hook,
    post,
    onCompleted,
    onError,
    onFallbackOpened,
  };
}

describe('useCheckoutPageEvents', () => {
  const mockGetBuyWidgetData = jest.fn();
  const mockOpenHostedBuyWidget = jest.fn();
  const mockTrackEvent = jest.fn();
  const mockBuild = jest.fn();
  const mockAddProperties = jest.fn();
  const mockCreateEventBuilder = jest.fn();

  const trackedEvents = () =>
    mockCreateEventBuilder.mock.calls.map((call, index) => ({
      event: call[0],
      properties: mockAddProperties.mock.calls[index]?.[0],
    }));

  beforeEach(() => {
    jest.clearAllMocks();
    mockBuild.mockImplementation(() => ({ built: true }));
    mockAddProperties.mockImplementation(() => ({ build: mockBuild }));
    mockCreateEventBuilder.mockImplementation(() => ({
      addProperties: mockAddProperties,
    }));
    mockUseAnalytics.mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
    });
    mockUseRampsQuotes.mockReturnValue({
      getBuyWidgetData: mockGetBuyWidgetData,
    });
    mockUseOpenHostedBuyWidget.mockReturnValue({
      openHostedBuyWidget: mockOpenHostedBuyWidget,
    });
  });

  describe('onMessage', () => {
    it('is undefined for a provider without a page-event adapter', () => {
      const { hook } = setup({ providerCode: 'moonpay' });

      expect(hook.result.current.onMessage).toBeUndefined();
    });

    it('is undefined without a provider code', () => {
      const { hook } = setup({ providerCode: undefined });

      expect(hook.result.current.onMessage).toBeUndefined();
    });

    it('is attached for a Coinbase provider code with the /providers/ prefix', () => {
      const { hook } = setup({ providerCode: '/providers/coinbase-m' });

      expect(hook.result.current.onMessage).toBeInstanceOf(Function);
    });

    it('ignores messages from an untrusted origin', () => {
      const { post, onCompleted } = setup();

      post('polling_success', undefined, 'https://evil.example.com');

      expect(onCompleted).not.toHaveBeenCalled();
      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('ignores bodies that do not parse as a Coinbase event', () => {
      const { hook } = setup();

      act(() => {
        hook.result.current.onMessage?.({
          nativeEvent: {
            url: COINBASE_URL,
            data: '{"type":"IFRAME_DETECTED"}',
          },
        } as unknown as WebViewMessageEvent);
      });

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('tracks RAMPS_CHECKOUT_PROVIDER_EVENT_RECEIVED once per distinct event name with base props', () => {
      const { post } = setup();

      post('polling_start');
      post('polling_start');
      post('load_error', {
        errorCode: 'expired_session_token',
        errorMessage: 'PAGE TEXT',
      });

      expect(mockTrackEvent).toHaveBeenCalledTimes(2);
      expect(trackedEvents()).toEqual([
        {
          event: MetaMetricsEvents.RAMPS_CHECKOUT_PROVIDER_EVENT_RECEIVED,
          properties: {
            ...BASE_PROPS,
            event_name: 'polling_start',
            error_code: undefined,
          },
        },
        {
          event: MetaMetricsEvents.RAMPS_CHECKOUT_PROVIDER_EVENT_RECEIVED,
          properties: {
            ...BASE_PROPS,
            event_name: 'load_error',
            error_code: 'expired_session_token',
          },
        },
      ]);
    });

    it('calls onCompleted on polling_success', () => {
      const { post, onCompleted, onError } = setup();

      post('polling_success');

      expect(onCompleted).toHaveBeenCalledTimes(1);
      expect(onError).not.toHaveBeenCalled();
    });

    it('asks for a go_back error on an expired session token', () => {
      const { post, onError } = setup();

      post('load_error', { errorCode: 'expired_session_token' });

      expect(onError).toHaveBeenCalledWith(expect.any(String), 'go_back');
    });

    it('asks for a retry error on any other load_error', () => {
      const { post, onError } = setup();

      post('load_error', { errorCode: 'something_else' });

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError.mock.calls[0][1]).toBeUndefined();
    });

    it.each(['commit_error', 'polling_error'])(
      'reports a fixed error on %s without the page errorMessage',
      (eventName) => {
        const { post, onError } = setup();

        post(eventName, { errorMessage: 'PAGE TEXT' });

        expect(onError).toHaveBeenCalledTimes(1);
        expect(onError.mock.calls[0][0]).not.toContain('PAGE TEXT');
      },
    );

    it('does nothing on cancel', () => {
      const { post, onCompleted, onError } = setup();

      post('cancel');

      expect(onCompleted).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });

    it('enters limit_error for a limit session_error with a fallback', () => {
      const { hook, post, onError } = setup();

      post('session_error', {
        errorCode: 'ERROR_CODE_GUEST_TRANSACTION_LIMIT',
      });

      expect(hook.result.current.limitErrorCode).toBe(
        'ERROR_CODE_GUEST_TRANSACTION_LIMIT',
      );
      expect(onError).not.toHaveBeenCalled();
    });

    it('reports an error for a limit session_error when headless', () => {
      const { hook, post, onError } = setup({ isHeadless: true });

      post('session_error', {
        errorCode: 'ERROR_CODE_GUEST_TRANSACTION_LIMIT',
      });

      expect(hook.result.current.limitErrorCode).toBeUndefined();
      expect(onError).toHaveBeenCalledTimes(1);
    });

    it('reports an error for a limit session_error without a fallback', () => {
      const { hook, post, onError } = setup({ fallbackBuyWidget: undefined });

      post('session_error', {
        errorCode: 'ERROR_CODE_GUEST_TRANSACTION_LIMIT',
      });

      expect(hook.result.current.limitErrorCode).toBeUndefined();
      expect(onError).toHaveBeenCalledTimes(1);
    });

    it('reports an error for a non-limit session_error', () => {
      const { hook, post, onError } = setup();

      post('session_error', { errorCode: 'ERROR_CODE_OTHER' });

      expect(hook.result.current.limitErrorCode).toBeUndefined();
      expect(onError).toHaveBeenCalledTimes(1);
    });

    it('clears limitErrorCode when a later event moves the state on', () => {
      const { hook, post } = setup();

      post('session_error', {
        errorCode: 'ERROR_CODE_GUEST_TRANSACTION_LIMIT',
      });
      post('load_success');

      expect(hook.result.current.limitErrorCode).toBeUndefined();
    });
  });

  describe('onFallbackPress', () => {
    it('fetches the hosted widget from the fallback URL with the provider redirect and opens it', async () => {
      mockGetBuyWidgetData.mockResolvedValue({
        url: 'https://pay.coinbase.com/hosted',
        orderId: 'cb-order-1',
      });
      mockOpenHostedBuyWidget.mockResolvedValue(undefined);
      const { hook, post, onFallbackOpened, onError } = setup();
      post('session_error', {
        errorCode: 'ERROR_CODE_GUEST_TRANSACTION_LIMIT',
      });

      await act(async () => {
        await hook.result.current.onFallbackPress();
      });

      expect(onFallbackOpened).toHaveBeenCalledTimes(1);
      expect(trackedEvents()).toContainEqual({
        event: MetaMetricsEvents.RAMPS_CHECKOUT_FALLBACK_OPENED,
        properties: {
          ...BASE_PROPS,
          error_code: 'ERROR_CODE_GUEST_TRANSACTION_LIMIT',
        },
      });
      expect(mockGetBuyWidgetData).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'coinbase-m',
          quote: expect.objectContaining({
            buyURL: expect.stringContaining(
              'redirectUrl=metamask%3A%2F%2Fon-ramp%2Fproviders%2Fcoinbase-m',
            ),
          }),
        }),
      );
      expect(mockOpenHostedBuyWidget).toHaveBeenCalledWith({
        url: 'https://pay.coinbase.com/hosted',
        redirectUrl: 'metamask://on-ramp/providers/coinbase-m',
        providerCode: 'coinbase-m',
        orderId: 'cb-order-1',
        walletAddress: '0xabc',
        chainId: '1',
      });
      expect(onError).not.toHaveBeenCalled();
      expect(hook.result.current.isFallbackPending).toBe(true);
    });

    it('reports an error and resets pending when the widget fetch fails', async () => {
      mockGetBuyWidgetData.mockRejectedValue(new Error('boom'));
      const { hook, onError } = setup();

      await act(async () => {
        await hook.result.current.onFallbackPress();
      });

      expect(onError).toHaveBeenCalledTimes(1);
      expect(mockOpenHostedBuyWidget).not.toHaveBeenCalled();
      expect(hook.result.current.isFallbackPending).toBe(false);
    });

    it('reports an error when the widget response has no url', async () => {
      mockGetBuyWidgetData.mockResolvedValue({ url: '' });
      const { hook, onError } = setup();

      await act(async () => {
        await hook.result.current.onFallbackPress();
      });

      expect(onError).toHaveBeenCalledTimes(1);
      expect(mockOpenHostedBuyWidget).not.toHaveBeenCalled();
    });

    it('reports an error without fetching when there is no fallback or provider code', async () => {
      const { hook, onError, onFallbackOpened } = setup({
        fallbackBuyWidget: undefined,
      });

      await act(async () => {
        await hook.result.current.onFallbackPress();
      });

      expect(onFallbackOpened).toHaveBeenCalledTimes(1);
      expect(mockGetBuyWidgetData).not.toHaveBeenCalled();
      expect(onError).toHaveBeenCalledTimes(1);
      expect(hook.result.current.isFallbackPending).toBe(false);
    });

    it('ignores a second press while the first hand-off is pending', async () => {
      let resolveWidget: (value: unknown) => void = () => undefined;
      mockGetBuyWidgetData.mockReturnValue(
        new Promise((resolve) => {
          resolveWidget = resolve;
        }),
      );
      mockOpenHostedBuyWidget.mockResolvedValue(undefined);
      const { hook, onFallbackOpened } = setup();

      let first: Promise<void> = Promise.resolve();
      act(() => {
        first = hook.result.current.onFallbackPress();
      });
      await act(async () => {
        await hook.result.current.onFallbackPress();
      });
      await act(async () => {
        resolveWidget({ url: 'https://pay.coinbase.com/hosted' });
        await first;
      });

      expect(onFallbackOpened).toHaveBeenCalledTimes(1);
      expect(mockGetBuyWidgetData).toHaveBeenCalledTimes(1);
    });
  });
});
