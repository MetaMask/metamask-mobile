import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  getHardwareTier,
  getNetworkTierSnapshot,
} from '../../util/deviceCapability';
import { getLatencySnapshot } from '../../util/deviceCapability/latencyStore';
import { NetworkTimeoutError, useNetworkQuery } from './useNetworkQuery';

jest.mock('../../util/deviceCapability', () => ({
  getHardwareTier: jest.fn(),
  getNetworkTierSnapshot: jest.fn(),
}));
jest.mock('../../util/deviceCapability/latencyStore', () => ({
  getLatencySnapshot: jest.fn(),
}));

const queryKey = ['prices'];
let client: QueryClient;
const wrapper = ({ children }: React.PropsWithChildren): React.JSX.Element => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
);

function givenDevice(
  hardware: ReturnType<typeof getHardwareTier>,
  network: ReturnType<typeof getNetworkTierSnapshot>,
  latency: ReturnType<typeof getLatencySnapshot> = 'OK',
): void {
  jest.mocked(getHardwareTier).mockReturnValue(hardware);
  jest.mocked(getNetworkTierSnapshot).mockReturnValue(network);
  jest.mocked(getLatencySnapshot).mockReturnValue(latency);
}

beforeEach(() => {
  jest.useFakeTimers();
  client = new QueryClient();
});

afterEach(() => {
  client.clear();
  jest.useRealTimers();
});

describe('useNetworkQuery', () => {
  it.each([
    ['a fast connection', 3, 'WIFI', 'OK'],
    ['slow cellular', 2, 'SLOW_CELLULAR', 'OK'],
    ['slow measured latency', 2, 'WIFI', 'SLOW'],
  ] as const)('on %s tries %i times', async (_, calls, network, latency) => {
    givenDevice('HIGH', network, latency);
    const queryFn = jest.fn().mockRejectedValue(new Error('down'));

    const { result } = renderHook(
      () => useNetworkQuery({ queryKey, queryFn, retryDelay: 0 }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(queryFn).toHaveBeenCalledTimes(calls);
  });

  it.each([
    ['a fast connection', 'WIFI', 4],
    ['slow cellular', 'SLOW_CELLULAR', 2],
  ] as const)('polls on %s', async (_, network, calls) => {
    givenDevice('HIGH', network);
    const queryFn = jest.fn().mockResolvedValue(1);

    const { result } = renderHook(
      () => useNetworkQuery({ queryKey, queryFn, refetchInterval: 1000 }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    for (let second = 0; second < 3; second++) {
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
    }

    expect(queryFn).toHaveBeenCalledTimes(calls);
  });

  it('does not poll without an interval', async () => {
    givenDevice('HIGH', 'WIFI');
    const queryFn = jest.fn().mockResolvedValue(1);

    renderHook(() => useNetworkQuery({ queryKey, queryFn }), { wrapper });
    await act(async () => {
      jest.advanceTimersByTime(60_000);
    });

    expect(queryFn).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['LOW', 5 * 60_000],
    ['MID', 60 * 60_000],
    ['HIGH', 24 * 60 * 60_000],
    [null, 24 * 60 * 60_000],
  ] as const)(
    'keeps unused data in memory on %s hardware for %i ms',
    async (hardware, gcTime) => {
      givenDevice(hardware, 'WIFI');
      const { result, unmount } = renderHook(
        () => useNetworkQuery({ queryKey, queryFn: async () => 1 }),
        { wrapper },
      );
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      unmount();

      act(() => jest.advanceTimersByTime(gcTime - 1));
      expect(client.getQueryData(queryKey)).toBe(1);
      act(() => jest.advanceTimersByTime(1));
      expect(client.getQueryData(queryKey)).toBeUndefined();
    },
  );

  describe('timeout', () => {
    // Never settles, even when aborted: a request stalled below fetch.
    function stalledQuery(): {
      queryFn: jest.Mock;
      signals: AbortSignal[];
    } {
      const signals: AbortSignal[] = [];
      const queryFn = jest.fn(async ({ signal }: { signal: AbortSignal }) => {
        signals.push(signal);
        return new Promise(() => undefined);
      });
      return { queryFn, signals };
    }

    it.each([
      ['LOW', 30_000],
      ['MID', 15_000],
      ['HIGH', 8_000],
      [null, 15_000],
    ] as const)(
      'aborts a request on %s hardware after %i ms',
      async (hardware, timeoutMs) => {
        givenDevice(hardware, 'WIFI');
        const { queryFn, signals } = stalledQuery();

        renderHook(() => useNetworkQuery({ queryKey, queryFn }), { wrapper });
        await waitFor(() => expect(signals).toHaveLength(1));

        act(() => jest.advanceTimersByTime(timeoutMs - 1));
        expect(signals[0].aborted).toBe(false);
        act(() => jest.advanceTimersByTime(1));
        expect(signals[0].aborted).toBe(true);
      },
    );

    it('fails with NetworkTimeoutError when the request ignores the abort', async () => {
      givenDevice('HIGH', 'SLOW_CELLULAR');
      const { queryFn } = stalledQuery();

      const { result } = renderHook(
        () => useNetworkQuery({ queryKey, queryFn, retryDelay: 0 }),
        { wrapper },
      );
      await act(async () => {
        await jest.advanceTimersByTimeAsync(2 * 8_000);
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeInstanceOf(NetworkTimeoutError);
      expect(queryFn).toHaveBeenCalledTimes(2);
    });

    it('aborts the request when the query is cancelled', async () => {
      givenDevice('HIGH', 'WIFI');
      const { queryFn, signals } = stalledQuery();

      renderHook(() => useNetworkQuery({ queryKey, queryFn }), { wrapper });
      await waitFor(() => expect(signals).toHaveLength(1));
      await act(async () => {
        await client.cancelQueries({ queryKey });
      });

      expect(signals[0].aborted).toBe(true);
    });
  });
});
