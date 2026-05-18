import { act, renderHook } from '@testing-library/react-native';
import { useOHLCVRealtime } from './useOHLCVRealtime';

const mockCall = jest.fn().mockResolvedValue(undefined);
const mockSubscribe = jest.fn();
const mockUnsubscribe = jest.fn();

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    controllerMessenger: {
      call: (...args: unknown[]) => mockCall(...args),
      subscribe: (...args: unknown[]) => mockSubscribe(...args),
      unsubscribe: (...args: unknown[]) => mockUnsubscribe(...args),
    },
  },
}));

const mockFetch = jest.fn();
global.fetch = mockFetch as jest.Mock;

function arrangeDefaultOptions() {
  return {
    assetId: 'eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    interval: '15m',
    currency: 'usd',
    timePeriod: '1d',
    enabled: true,
  };
}

function makeFetchResponse(bar: Record<string, number>) {
  return {
    ok: true,
    json: jest.fn().mockResolvedValue(bar),
  };
}

describe('useOHLCVRealtime', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockCall.mockReset().mockResolvedValue(undefined);
    mockSubscribe.mockReset();
    mockUnsubscribe.mockReset();
    mockFetch.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('subscribes to barUpdated, subscriptionError, and chainStatusChanged events', () => {
    renderHook(() => useOHLCVRealtime(arrangeDefaultOptions()));

    expect(mockSubscribe).toHaveBeenCalledWith(
      'OHLCVService:barUpdated',
      expect.any(Function),
    );
    expect(mockSubscribe).toHaveBeenCalledWith(
      'OHLCVService:subscriptionError',
      expect.any(Function),
    );
    expect(mockSubscribe).toHaveBeenCalledWith(
      'OHLCVService:chainStatusChanged',
      expect.any(Function),
    );
  });

  it('does not call OHLCVService:subscribe before debounce period', () => {
    renderHook(() => useOHLCVRealtime(arrangeDefaultOptions()));

    expect(mockCall).not.toHaveBeenCalledWith(
      'OHLCVService:subscribe',
      expect.anything(),
    );
  });

  it('calls OHLCVService:subscribe after 500ms debounce', async () => {
    renderHook(() => useOHLCVRealtime(arrangeDefaultOptions()));

    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    expect(mockCall).toHaveBeenCalledWith('OHLCVService:subscribe', {
      assetId: 'eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      interval: '15m',
      currency: 'usd',
    });
  });

  it('does not subscribe when enabled is false', async () => {
    renderHook(() =>
      useOHLCVRealtime({ ...arrangeDefaultOptions(), enabled: false }),
    );

    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    expect(mockSubscribe).not.toHaveBeenCalled();
    expect(mockCall).not.toHaveBeenCalled();
  });

  it('does not subscribe when assetId is empty', async () => {
    renderHook(() =>
      useOHLCVRealtime({ ...arrangeDefaultOptions(), assetId: '' }),
    );

    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    expect(mockSubscribe).not.toHaveBeenCalled();
  });

  it('unsubscribes from all events and calls OHLCVService:unsubscribe on unmount', async () => {
    const { unmount } = renderHook(() =>
      useOHLCVRealtime(arrangeDefaultOptions()),
    );

    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    unmount();

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
    expect(mockCall).toHaveBeenCalledWith('OHLCVService:unsubscribe', {
      assetId: 'eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      interval: '15m',
      currency: 'usd',
    });
  });

  it('calls OHLCVService:unsubscribe on unmount even if debounce did not fire', () => {
    const { unmount } = renderHook(() =>
      useOHLCVRealtime(arrangeDefaultOptions()),
    );

    unmount();

    expect(mockCall).toHaveBeenCalledWith('OHLCVService:unsubscribe', {
      assetId: 'eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      interval: '15m',
      currency: 'usd',
    });
  });

  it('sets latestBar when barUpdated event matches channel', async () => {
    const { result } = renderHook(() =>
      useOHLCVRealtime(arrangeDefaultOptions()),
    );

    expect(result.current.latestBar).toBeNull();

    const barUpdatedHandler = mockSubscribe.mock.calls.find(
      (call) => call[0] === 'OHLCVService:barUpdated',
    )?.[1];

    const bar = {
      timestamp: 1700000000,
      open: 100,
      high: 105,
      low: 99,
      close: 103,
      volume: 5000,
    };

    await act(async () => {
      barUpdatedHandler({
        channel:
          'market-data.v1.eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913.15m.usd',
        bar,
      });
    });

    expect(result.current.latestBar).toEqual(bar);
  });

  it('ignores barUpdated events for different channels', async () => {
    const { result } = renderHook(() =>
      useOHLCVRealtime(arrangeDefaultOptions()),
    );

    const barUpdatedHandler = mockSubscribe.mock.calls.find(
      (call) => call[0] === 'OHLCVService:barUpdated',
    )?.[1];

    await act(async () => {
      barUpdatedHandler({
        channel: 'market-data.v1.eip155:1/slip44:60.15m.usd',
        bar: {
          timestamp: 1700000000,
          open: 100,
          high: 105,
          low: 99,
          close: 103,
          volume: 5000,
        },
      });
    });

    expect(result.current.latestBar).toBeNull();
  });

  it('resets latestBar to null when options change', async () => {
    const { result, rerender } = renderHook(
      (props) => useOHLCVRealtime(props),
      { initialProps: arrangeDefaultOptions() },
    );

    const barUpdatedHandler = mockSubscribe.mock.calls.find(
      (call) => call[0] === 'OHLCVService:barUpdated',
    )?.[1];

    await act(async () => {
      barUpdatedHandler({
        channel:
          'market-data.v1.eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913.15m.usd',
        bar: {
          timestamp: 1700000000,
          open: 100,
          high: 105,
          low: 99,
          close: 103,
          volume: 5000,
        },
      });
    });

    expect(result.current.latestBar).not.toBeNull();

    rerender({ ...arrangeDefaultOptions(), interval: '1h' });

    expect(result.current.latestBar).toBeNull();
  });

  describe('staleness fallback', () => {
    it('polls REST API after 30s of no WS messages', async () => {
      mockFetch.mockResolvedValue(
        makeFetchResponse({
          timestamp: 1700000000000,
          open: 100,
          high: 110,
          low: 95,
          close: 108,
          volume: 9000,
        }),
      );

      const { result } = renderHook(() =>
        useOHLCVRealtime(arrangeDefaultOptions()),
      );

      // Fire the debounce so subscribe succeeds (sets lastMessageTime)
      await act(async () => {
        jest.advanceTimersByTime(500);
      });

      // Advance past staleness threshold (10s) + one check interval (5s)
      await act(async () => {
        jest.advanceTimersByTime(10_000 + 5_000);
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const fetchUrl = mockFetch.mock.calls[0][0] as string;
      expect(fetchUrl).toContain('price.api.cx.metamask.io/v3/ohlcv/');
      expect(fetchUrl).toContain('/latest');
      expect(fetchUrl).toContain('timePeriod=1d');
      expect(fetchUrl).toContain('interval=15m');
      expect(fetchUrl).toContain('vsCurrency=usd');

      // Bar is set with timestamp converted from ms to seconds
      expect(result.current.latestBar).toEqual({
        timestamp: 1700000000,
        open: 100,
        high: 110,
        low: 95,
        close: 108,
        volume: 9000,
      });
    });

    it('does not poll if WS messages are arriving within 30s', async () => {
      const { result } = renderHook(() =>
        useOHLCVRealtime(arrangeDefaultOptions()),
      );

      // Fire debounce
      await act(async () => {
        jest.advanceTimersByTime(500);
      });

      // Simulate a WS bar arriving at T+7s (before staleness threshold)
      const barUpdatedHandler = mockSubscribe.mock.calls.find(
        (call) => call[0] === 'OHLCVService:barUpdated',
      )?.[1];

      await act(async () => {
        jest.advanceTimersByTime(7_000);
      });

      await act(async () => {
        barUpdatedHandler({
          channel:
            'market-data.v1.eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913.15m.usd',
          bar: {
            timestamp: 1700000000,
            open: 100,
            high: 105,
            low: 99,
            close: 103,
            volume: 5000,
          },
        });
      });

      // Check interval fires at T+10s (only 3s after last message - not stale)
      await act(async () => {
        jest.advanceTimersByTime(3_000);
      });

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.current.latestBar).not.toBeNull();
    });

    it('polls REST API when chain status is down', async () => {
      mockFetch.mockResolvedValue(
        makeFetchResponse({
          timestamp: 1700000000000,
          open: 50,
          high: 55,
          low: 48,
          close: 52,
          volume: 3000,
        }),
      );

      renderHook(() => useOHLCVRealtime(arrangeDefaultOptions()));

      // Fire debounce
      await act(async () => {
        jest.advanceTimersByTime(500);
      });

      // Trigger chainStatusChanged with 'down' for our chain
      const chainStatusHandler = mockSubscribe.mock.calls.find(
        (call) => call[0] === 'OHLCVService:chainStatusChanged',
      )?.[1];

      await act(async () => {
        chainStatusHandler({
          chainIds: ['eip155:8453'],
          status: 'down',
        });
      });

      // pollLatest() is called immediately when chain goes down
      // No need to advance time for staleness check
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('does not poll when chainStatusChanged is for a different chain', async () => {
      renderHook(() => useOHLCVRealtime(arrangeDefaultOptions()));

      // Fire debounce
      await act(async () => {
        jest.advanceTimersByTime(500);
      });

      const chainStatusHandler = mockSubscribe.mock.calls.find(
        (call) => call[0] === 'OHLCVService:chainStatusChanged',
      )?.[1];

      await act(async () => {
        chainStatusHandler({
          chainIds: ['eip155:1'],
          status: 'down',
        });
      });

      // Advance but not past staleness threshold from subscribe time (10s)
      await act(async () => {
        jest.advanceTimersByTime(5_000);
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('handles REST API failure gracefully', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 500 });

      const { result } = renderHook(() =>
        useOHLCVRealtime(arrangeDefaultOptions()),
      );

      // Fire debounce
      await act(async () => {
        jest.advanceTimersByTime(500);
      });

      // Force staleness
      await act(async () => {
        jest.advanceTimersByTime(10_000 + 5_000);
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result.current.latestBar).toBeNull();
    });

    it('activates REST fallback when OHLCVService:subscribe throws', async () => {
      mockCall.mockRejectedValueOnce(new Error('WS subscribe failed'));
      mockFetch.mockResolvedValue(
        makeFetchResponse({
          timestamp: 1700000000000,
          open: 100,
          high: 110,
          low: 95,
          close: 108,
          volume: 9000,
        }),
      );

      const { result } = renderHook(() =>
        useOHLCVRealtime(arrangeDefaultOptions()),
      );

      // Fire the debounce — subscribe will reject
      await act(async () => {
        jest.advanceTimersByTime(500);
      });

      // Simulate the subscriptionError event that would be emitted by OHLCVService
      const subscriptionErrorHandler = mockSubscribe.mock.calls.find(
        (call) => call[0] === 'OHLCVService:subscriptionError',
      )?.[1];

      await act(async () => {
        subscriptionErrorHandler({
          channel:
            'market-data.v1.eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913.15m.usd',
          error: 'WS subscribe failed',
          operation: 'subscribe',
        });
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result.current.latestBar).toEqual({
        timestamp: 1700000000,
        open: 100,
        high: 110,
        low: 95,
        close: 108,
        volume: 9000,
      });
    });
  });
});
