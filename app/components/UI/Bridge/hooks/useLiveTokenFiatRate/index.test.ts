import { act, renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { formatAddressToAssetId } from '@metamask/bridge-controller';
import { parseCaipAssetType, type CaipAssetType } from '@metamask/utils';
import type { OHLCVBar } from '@metamask/core-backend';
import Engine from '../../../../../core/Engine';
import { createMockToken } from '../../testUtils/fixtures';
import { normalizeTokenAddress } from '../../utils/tokenUtils';
import { useTokenFiatRate } from '../useTokenFiatRate';
import { useLiveTokenFiatRate } from './index';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../useTokenFiatRate', () => ({
  useTokenFiatRate: jest.fn(),
}));

jest.mock('../../../../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
}));

const mockUseSelector = jest.mocked(useSelector);
const mockUseTokenFiatRate = jest.mocked(useTokenFiatRate);
const mockCall = jest.mocked(Engine.controllerMessenger.call);
const mockSubscribe = jest.mocked(Engine.controllerMessenger.subscribe);
const mockUnsubscribe = jest.mocked(Engine.controllerMessenger.unsubscribe);

const FALLBACK_RATE = 100;
const LIVE_CLOSE = 12.5;
const SUBSCRIPTION_DEBOUNCE_MS = 10;
const STALENESS_CHECK_INTERVAL_MS = 1_000;
const STALENESS_THRESHOLD_MS = 4_000;

const token = createMockToken({
  address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  symbol: 'USDC',
  decimals: 6,
  chainId: '0x1',
});

const assetId = formatAddressToAssetId(
  normalizeTokenAddress(token.address, token.chainId),
  token.chainId,
) as CaipAssetType;
const chainId = parseCaipAssetType(assetId).chainId;
const defaultChannel = `market-data.v1.${assetId}.1m.usd`;

function createBar(overrides: Partial<OHLCVBar> = {}): OHLCVBar {
  return {
    timestamp: 1_704_067_200,
    open: LIVE_CLOSE,
    high: LIVE_CLOSE,
    low: LIVE_CLOSE,
    close: LIVE_CLOSE,
    volume: 1,
    ...overrides,
  };
}

function getHandler<T>(eventName: string): (payload: T) => void {
  const subscription = mockSubscribe.mock.calls.find(
    ([event]: [string, (payload: T) => void]) => event === eventName,
  );

  if (!subscription) {
    throw new Error(`No subscriber registered for ${eventName}`);
  }

  return subscription[1] as (payload: T) => void;
}

async function subscribeToLiveRate() {
  const view = renderHook(() =>
    useLiveTokenFiatRate(token, {
      subscriptionDebounceMs: SUBSCRIPTION_DEBOUNCE_MS,
      stalenessCheckIntervalMs: STALENESS_CHECK_INTERVAL_MS,
      stalenessThresholdMs: STALENESS_THRESHOLD_MS,
    }),
  );

  await act(async () => {
    jest.advanceTimersByTime(SUBSCRIPTION_DEBOUNCE_MS);
  });

  return view;
}

async function emitLiveClose(close: number, channel = defaultChannel) {
  const handleBarUpdated = getHandler<{ channel: string; bar: OHLCVBar }>(
    'OHLCVService:barUpdated',
  );

  await act(async () => {
    handleBarUpdated({
      channel,
      bar: createBar({ close }),
    });
  });
}

describe('useLiveTokenFiatRate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
    mockUseSelector.mockReturnValue('usd');
    mockUseTokenFiatRate.mockReturnValue(FALLBACK_RATE);
    mockCall.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('returns the Redux fallback rate when the token is missing', () => {
    const { result } = renderHook(() => useLiveTokenFiatRate(undefined));

    expect(result.current).toBe(FALLBACK_RATE);
    expect(mockSubscribe).not.toHaveBeenCalled();
  });

  it('returns the Redux fallback rate when the token has no address', () => {
    const { result } = renderHook(() =>
      useLiveTokenFiatRate({ ...token, address: '' }),
    );

    expect(result.current).toBe(FALLBACK_RATE);
    expect(mockSubscribe).not.toHaveBeenCalled();
  });

  it('returns the Redux fallback rate when the token has no chain id', () => {
    const { result } = renderHook(() =>
      useLiveTokenFiatRate({
        ...token,
        chainId: '' as typeof token.chainId,
      }),
    );

    expect(result.current).toBe(FALLBACK_RATE);
    expect(mockCall).not.toHaveBeenCalled();
  });

  it('returns the Redux fallback rate when building the asset id throws', () => {
    const { result } = renderHook(() =>
      useLiveTokenFiatRate({
        ...token,
        chainId: 'not-a-chain-id' as typeof token.chainId,
      }),
    );

    expect(result.current).toBe(FALLBACK_RATE);
    expect(mockCall).not.toHaveBeenCalled();
  });

  it('subscribes to the market-data channel after the debounce delay', async () => {
    await subscribeToLiveRate();

    expect(mockCall).toHaveBeenCalledWith('OHLCVService:subscribe', {
      assetId,
      interval: '1m',
      currency: 'usd',
    });
  });

  it('returns the live candle close after a bar update', async () => {
    const { result } = await subscribeToLiveRate();

    await emitLiveClose(LIVE_CLOSE);

    expect(result.current).toBe(LIVE_CLOSE);
  });

  it('ignores bar updates for a different channel', async () => {
    const { result } = await subscribeToLiveRate();

    await emitLiveClose(LIVE_CLOSE, 'market-data.v1.other.1m.usd');

    expect(result.current).toBe(FALLBACK_RATE);
  });

  it('returns the Redux fallback rate when the candle close is zero', async () => {
    const { result } = await subscribeToLiveRate();

    await emitLiveClose(0);

    expect(result.current).toBe(FALLBACK_RATE);
  });

  it('returns the Redux fallback rate when subscribe fails', async () => {
    const { result } = await subscribeToLiveRate();
    const handleSubscriptionError = getHandler<{
      channel: string;
      error: string;
      operation: string;
    }>('OHLCVService:subscriptionError');

    await emitLiveClose(LIVE_CLOSE);
    await act(async () => {
      handleSubscriptionError({
        channel: defaultChannel,
        error: 'subscribe failed',
        operation: 'subscribe',
      });
    });

    expect(result.current).toBe(FALLBACK_RATE);
  });

  it('keeps the live rate when a non-subscribe operation errors', async () => {
    const { result } = await subscribeToLiveRate();
    const handleSubscriptionError = getHandler<{
      channel: string;
      error: string;
      operation: string;
    }>('OHLCVService:subscriptionError');

    await emitLiveClose(LIVE_CLOSE);
    await act(async () => {
      handleSubscriptionError({
        channel: defaultChannel,
        error: 'unsubscribe failed',
        operation: 'unsubscribe',
      });
    });

    expect(result.current).toBe(LIVE_CLOSE);
  });

  it('returns the Redux fallback rate when the asset chain is reported down', async () => {
    const { result } = await subscribeToLiveRate();
    const handleChainStatusChanged = getHandler<{
      chainIds: string[];
      status: 'up' | 'down';
    }>('OHLCVService:chainStatusChanged');

    await emitLiveClose(LIVE_CLOSE);
    await act(async () => {
      handleChainStatusChanged({
        chainIds: [chainId],
        status: 'down',
      });
    });

    expect(result.current).toBe(FALLBACK_RATE);
  });

  it('keeps the live rate when a different chain is reported down', async () => {
    const { result } = await subscribeToLiveRate();
    const handleChainStatusChanged = getHandler<{
      chainIds: string[];
      status: 'up' | 'down';
    }>('OHLCVService:chainStatusChanged');

    await emitLiveClose(LIVE_CLOSE);
    await act(async () => {
      handleChainStatusChanged({
        chainIds: ['eip155:137'],
        status: 'down',
      });
    });

    expect(result.current).toBe(LIVE_CLOSE);
  });

  it('returns the Redux fallback rate after the stream goes quiet past the staleness threshold', async () => {
    const { result } = await subscribeToLiveRate();

    await emitLiveClose(LIVE_CLOSE);

    await act(async () => {
      jest.advanceTimersByTime(
        STALENESS_THRESHOLD_MS + STALENESS_CHECK_INTERVAL_MS,
      );
    });

    expect(result.current).toBe(FALLBACK_RATE);
  });

  it('unsubscribes and removes listeners when the hook unmounts', async () => {
    const { unmount } = await subscribeToLiveRate();

    unmount();

    expect(mockCall).toHaveBeenCalledWith('OHLCVService:unsubscribe', {
      assetId,
      interval: '1m',
      currency: 'usd',
    });
    expect(mockUnsubscribe).toHaveBeenCalledWith(
      'OHLCVService:barUpdated',
      expect.any(Function),
    );
    expect(mockUnsubscribe).toHaveBeenCalledWith(
      'OHLCVService:subscriptionError',
      expect.any(Function),
    );
    expect(mockUnsubscribe).toHaveBeenCalledWith(
      'OHLCVService:chainStatusChanged',
      expect.any(Function),
    );
  });

  it('unsubscribes when unmount happens after subscribe is requested', async () => {
    let resolveSubscribe: (() => void) | undefined;
    mockCall.mockImplementation((method: string) => {
      if (method === 'OHLCVService:subscribe') {
        return new Promise<void>((resolve) => {
          resolveSubscribe = resolve;
        });
      }

      return Promise.resolve();
    });

    const { unmount } = renderHook(() =>
      useLiveTokenFiatRate(token, {
        subscriptionDebounceMs: SUBSCRIPTION_DEBOUNCE_MS,
      }),
    );

    await act(async () => {
      jest.advanceTimersByTime(SUBSCRIPTION_DEBOUNCE_MS);
    });

    unmount();

    await act(async () => {
      resolveSubscribe?.();
    });

    expect(mockCall).toHaveBeenCalledWith('OHLCVService:unsubscribe', {
      assetId,
      interval: '1m',
      currency: 'usd',
    });
  });

  it('uses usd when the selected currency is empty', async () => {
    mockUseSelector.mockReturnValue('');

    await subscribeToLiveRate();

    expect(mockCall).toHaveBeenCalledWith('OHLCVService:subscribe', {
      assetId,
      interval: '1m',
      currency: 'usd',
    });
  });

  it('swallows subscribe rejections and keeps the Redux fallback rate', async () => {
    mockCall.mockRejectedValue(new Error('network error'));

    const { result } = await subscribeToLiveRate();

    expect(result.current).toBe(FALLBACK_RATE);
  });
});
