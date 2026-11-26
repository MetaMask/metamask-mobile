import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  getHardwareTier,
  getNetworkTierSnapshot,
} from '../../util/deviceCapability';
import {
  getLatencySnapshot,
  getLatencyThresholds,
} from '../../util/deviceCapability/latencyStore';
import { HttpError, InvalidResponseError, NetworkTimeoutError } from './errors';
import StorageWrapper from '../../store/storage-wrapper';
import { CACHE_KEY_PREFIX } from './constants';
import { NetworkCache, type NetworkQueryOptions } from './types';
import { useNetworkQuery } from './useNetworkQuery';

jest.mock('../../util/deviceCapability', () => ({
  getHardwareTier: jest.fn(),
  getNetworkTierSnapshot: jest.fn(),
}));
jest.mock('../../util/deviceCapability/latencyStore', () => ({
  getLatencySnapshot: jest.fn(),
  getLatencyThresholds: jest.fn(),
}));

global.fetch = jest.fn();

const PRICES_URL = 'https://api.example.com/prices';
const queryKey = ['prices'];
const HUNG_MS = 8_000;
let client: QueryClient;
const wrapper = ({ children }: React.PropsWithChildren): React.JSX.Element => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
);

function parseNumber(body: unknown): number {
  if (typeof body !== 'number') throw new TypeError('Expected a number');
  return body;
}

function renderQuery(
  options: Partial<NetworkQueryOptions<number>> = {},
): ReturnType<typeof renderHook<ReturnType<typeof useNetworkQuery>, unknown>> {
  return renderHook(
    () =>
      useNetworkQuery({
        queryKey,
        url: PRICES_URL,
        parse: parseNumber,
        retryDelay: 0,
        ...options,
      }),
    { wrapper },
  );
}

function respondWith(body: unknown, status = 200): void {
  jest.mocked(fetch).mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response);
}

// Never settles, even when aborted: a request stalled below fetch.
function stallRequests(): AbortSignal[] {
  const signals: AbortSignal[] = [];
  jest.mocked(fetch).mockImplementation(async (_url, init) => {
    if (init?.signal) signals.push(init.signal);
    return new Promise<Response>(() => undefined);
  });
  return signals;
}

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
  jest.clearAllMocks();
  jest.useFakeTimers();
  client = new QueryClient();
  givenDevice('HIGH', 'WIFI');
  jest
    .mocked(getLatencyThresholds)
    .mockReturnValue({ hungMs: HUNG_MS, slowMs: 2_500 });
});

afterEach(() => {
  client.clear();
  jest.useRealTimers();
});

describe('useNetworkQuery', () => {
  describe('request', () => {
    it('GETs the URL past the HTTP cache and returns the parsed body', async () => {
      respondWith(42);

      const { result } = renderQuery();

      await waitFor(() => expect(result.current.data).toBe(42));
      expect(fetch).toHaveBeenCalledWith(PRICES_URL, {
        signal: expect.any(Object),
        cache: 'no-cache',
      });
    });

    it('fails once, without retrying, when the body has the wrong shape', async () => {
      respondWith('not a number');

      const { result } = renderQuery();

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeInstanceOf(InvalidResponseError);
      expect((result.current.error as Error).cause).toBeInstanceOf(TypeError);
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('cache', () => {
    const STORAGE_KEY = `${CACHE_KEY_PREFIX}${JSON.stringify(queryKey)}`;

    function givenSaved(body: unknown, ageMs: number): void {
      jest
        .mocked(StorageWrapper.getItemSync)
        .mockReturnValue(JSON.stringify({ savedAt: Date.now() - ageMs, body }));
    }

    beforeEach(() => {
      jest.mocked(StorageWrapper.getItemSync).mockReturnValue(null);
      jest.mocked(StorageWrapper.setItem).mockResolvedValue(undefined);
      jest.mocked(StorageWrapper.removeItem).mockResolvedValue(undefined);
    });

    it('does not read or write the device by default', async () => {
      respondWith(42);

      const { result } = renderQuery();

      await waitFor(() => expect(result.current.data).toBe(42));
      expect(StorageWrapper.getItemSync).not.toHaveBeenCalled();
      expect(StorageWrapper.setItem).not.toHaveBeenCalled();
    });

    it('saves a validated response', async () => {
      respondWith(42);

      const { result } = renderQuery({ cache: NetworkCache.SHORT });

      await waitFor(() => expect(result.current.data).toBe(42));
      expect(StorageWrapper.setItem).toHaveBeenCalledWith(
        STORAGE_KEY,
        expect.stringMatching(/^\{"savedAt":\d+,"body":42\}$/),
        { emitEvent: false },
      );
    });

    it('does not save a body that fails parse', async () => {
      respondWith('not a number');

      const { result } = renderQuery({ cache: NetworkCache.SHORT });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(StorageWrapper.setItem).not.toHaveBeenCalled();
    });

    it('shows a fresh saved response with no request', async () => {
      givenSaved(7, 1_000);
      respondWith(42);

      const { result } = renderQuery({
        cache: NetworkCache.SHORT,
        staleTime: 60_000,
      });

      expect(result.current.data).toBe(7);
      expect(result.current.isLoading).toBe(false);
      await act(async () => jest.advanceTimersByTimeAsync(1_000));
      expect(fetch).not.toHaveBeenCalled();
    });

    it('shows an older saved response while it refetches', async () => {
      givenSaved(7, 1_000);
      respondWith(42);

      const { result } = renderQuery({ cache: NetworkCache.SHORT });

      expect(result.current.data).toBe(7);
      await waitFor(() => expect(result.current.data).toBe(42));
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('ignores a saved response that no longer passes parse', async () => {
      givenSaved('stale shape', 1_000);
      respondWith(42);

      const { result } = renderQuery({ cache: NetworkCache.SHORT });

      expect(result.current.data).toBeUndefined();
      await waitFor(() => expect(result.current.data).toBe(42));
      expect(StorageWrapper.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
    });
  });

  describe('retries', () => {
    it.each([
      ['a fast connection', 3, 'WIFI', 'OK'],
      ['slow cellular', 2, 'SLOW_CELLULAR', 'OK'],
      ['slow measured latency', 2, 'WIFI', 'SLOW'],
    ] as const)('on %s tries %i times', async (_, calls, network, latency) => {
      givenDevice('HIGH', network, latency);
      jest.mocked(fetch).mockRejectedValue(new TypeError('Network error'));

      const { result } = renderQuery();

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(fetch).toHaveBeenCalledTimes(calls);
    });

    it.each([500, 503, 408, 429])('retries HTTP %i', async (status) => {
      respondWith(null, status);

      const { result } = renderQuery();

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(fetch).toHaveBeenCalledTimes(3);
      expect(result.current.error).toEqual(new HttpError(status));
    });

    it.each([400, 401, 404])('does not retry HTTP %i', async (status) => {
      respondWith(null, status);

      const { result } = renderQuery();

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(fetch).toHaveBeenCalledTimes(1);
      expect((result.current.error as HttpError).status).toBe(status);
    });
  });

  describe('polling', () => {
    it.each([
      ['a fast connection', 'WIFI', 4],
      ['slow cellular', 'SLOW_CELLULAR', 2],
    ] as const)('polls on %s', async (_, network, calls) => {
      givenDevice('HIGH', network);
      respondWith(1);

      const { result } = renderQuery({ refetchInterval: 1000 });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      for (let second = 0; second < 3; second++) {
        await act(async () => {
          jest.advanceTimersByTime(1000);
        });
      }

      expect(fetch).toHaveBeenCalledTimes(calls);
    });

    it('does not poll without an interval', async () => {
      respondWith(1);

      renderQuery();
      await act(async () => {
        jest.advanceTimersByTime(60_000);
      });

      expect(fetch).toHaveBeenCalledTimes(1);
    });
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
      respondWith(1);
      const { result, unmount } = renderQuery();
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      unmount();

      act(() => jest.advanceTimersByTime(gcTime - 1));
      expect(client.getQueryData(queryKey)).toBe(1);
      act(() => jest.advanceTimersByTime(1));
      expect(client.getQueryData(queryKey)).toBeUndefined();
    },
  );

  describe('timeout', () => {
    it("aborts a request after the device's hung threshold", async () => {
      const signals = stallRequests();

      renderQuery();
      await waitFor(() => expect(signals).toHaveLength(1));

      act(() => jest.advanceTimersByTime(HUNG_MS - 1));
      expect(signals[0].aborted).toBe(false);
      act(() => jest.advanceTimersByTime(1));
      expect(signals[0].aborted).toBe(true);
    });

    it.each([
      ['normal', 2, 'WIFI', 'OK'],
      ['unknown', 2, null, 'UNKNOWN'],
      ['slow cellular', 1, 'SLOW_CELLULAR', 'UNKNOWN'],
      ['slow measured latency', 1, 'WIFI', 'SLOW'],
    ] as const)(
      'ends a stalled request on %s with NetworkTimeoutError after %i attempts',
      async (_, attempts, network, latency) => {
        givenDevice('HIGH', network, latency);
        stallRequests();

        const { result } = renderQuery();
        await act(async () => {
          await jest.advanceTimersByTimeAsync(attempts * HUNG_MS);
        });

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(result.current.error).toBeInstanceOf(NetworkTimeoutError);
        expect(fetch).toHaveBeenCalledTimes(attempts);
      },
    );

    it('gives the fetch latency sampler a full hung threshold before aborting', async () => {
      let elapsedMsAtAbort: number | undefined;
      jest.mocked(fetch).mockImplementation(async (_url, init) => {
        // The fetch wrapper starts sampling after its synchronous setup.
        jest.advanceTimersByTime(2);
        const sampleStart = performance.now();
        init?.signal?.addEventListener('abort', () => {
          elapsedMsAtAbort = performance.now() - sampleStart;
        });
        return new Promise<Response>(() => undefined);
      });

      renderQuery();
      await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
      await act(async () => jest.advanceTimersByTimeAsync(HUNG_MS));

      expect(elapsedMsAtAbort).toBe(HUNG_MS);
    });

    it('aborts the request when the query is cancelled', async () => {
      const signals = stallRequests();

      renderQuery();
      await waitFor(() => expect(signals).toHaveLength(1));
      await act(async () => {
        await client.cancelQueries({ queryKey });
      });

      expect(signals[0].aborted).toBe(true);
    });
  });
});
