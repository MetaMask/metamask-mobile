import { act, renderHook, waitFor } from '@testing-library/react-native';
import nock from 'nock';
import {
  OHLCVApiCandle,
  OHLCVApiResponse,
  useOHLCVChart,
} from './useOHLCVChart';
import type { OHLCVTimePeriod } from './TimeRangeSelector';

const OHLCV_HOST = 'https://price.api.cx.metamask.io';

const ASSET_ID = 'eip155:1/slip44:60';

const createAPICandle = (
  overrides: Partial<OHLCVApiCandle> = {},
): OHLCVApiCandle => ({
  timestamp: 1_700_000_000_000,
  open: 1,
  high: 2,
  low: 0.5,
  close: 1.5,
  volume: 1000,
  ...overrides,
});

const createSuccessBody = (
  overrides: Partial<OHLCVApiResponse> = {},
): OHLCVApiResponse => ({
  data: [createAPICandle()],
  hasNext: false,
  nextCursor: '',
  ...overrides,
});

function arrangeNockOhlcvAPISuccessResponse(body?: OHLCVApiResponse) {
  return nock(OHLCV_HOST)
    .get(`/v3/ohlcv-chart/${ASSET_ID}`)
    .query(true)
    .reply(200, body ?? createSuccessBody());
}

function arrangeNockOhlcvAPIStrictQueryResponse(
  query: Record<string, string>,
  body?: OHLCVApiResponse,
) {
  return nock(OHLCV_HOST)
    .get(`/v3/ohlcv-chart/${ASSET_ID}`)
    .query(query)
    .reply(200, body ?? createSuccessBody());
}

function arrangeNockOhlcvAPI404Response() {
  return nock(OHLCV_HOST)
    .get(`/v3/ohlcv-chart/${ASSET_ID}`)
    .query(true)
    .reply(404);
}

function arrangeDefaultOptions(): Parameters<typeof useOHLCVChart>[0] {
  return {
    assetId: ASSET_ID,
    timePeriod: '1d',
  };
}

function renderUseOHLCVChart(options: Parameters<typeof useOHLCVChart>[0]) {
  return renderHook(() => useOHLCVChart(options));
}

describe('useOHLCVChart - initial load', () => {
  beforeEach(() => {
    nock.disableNetConnect();
  });

  afterEach(() => {
    nock.cleanAll();
    jest.restoreAllMocks();
  });

  it('maps API candles to ohlcvData after successful response', async () => {
    const candle = createAPICandle({
      timestamp: 42,
      open: 10,
      high: 11,
      low: 9,
      close: 10.5,
      volume: 500,
    });
    const successBody = createSuccessBody({ data: [candle] });
    arrangeNockOhlcvAPISuccessResponse(successBody);

    const options = arrangeDefaultOptions();

    const { result } = renderUseOHLCVChart(options);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.ohlcvData).toEqual([
      {
        time: 42,
        open: 10,
        high: 11,
        low: 9,
        close: 10.5,
        volume: 500,
      },
    ]);
    expect(result.current.error).toBeNull();
  });

  it('sets error from response status when request fails', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    arrangeNockOhlcvAPI404Response();

    const { result } = renderUseOHLCVChart(arrangeDefaultOptions());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('OHLCV API error: 404');
    expect(result.current.ohlcvData).toEqual([]);
  });

  it('sets hasMore from API hasNext flag', async () => {
    const successBody = createSuccessBody({
      hasNext: true,
      nextCursor: 'next-page',
    });
    arrangeNockOhlcvAPISuccessResponse(successBody);

    const { result } = renderUseOHLCVChart(arrangeDefaultOptions());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasMore).toBe(true);
  });

  it('does not fetch when assetId is empty', async () => {
    const scope = arrangeNockOhlcvAPISuccessResponse();

    const { result } = renderUseOHLCVChart({
      ...arrangeDefaultOptions(),
      assetId: '',
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(scope.isDone()).toBe(false);
    expect(result.current.ohlcvData).toEqual([]);
    expect(result.current.hasEmptyData).toBe(false);
  });
});

describe('useOHLCVChart - query parameters', () => {
  beforeEach(() => {
    nock.disableNetConnect();
  });

  afterEach(() => {
    nock.cleanAll();
    jest.restoreAllMocks();
  });

  it('requests initial range with timePeriod, interval, and vsCurrency', async () => {
    const nockScope = arrangeNockOhlcvAPIStrictQueryResponse({
      timePeriod: '1w',
      interval: '1m',
      vsCurrency: 'eur',
    });

    const { result } = renderUseOHLCVChart({
      ...arrangeDefaultOptions(),
      timePeriod: '1w',
      interval: '1m',
      vsCurrency: 'eur',
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(nockScope.isDone()).toBe(true);
  });

  it('includes only interval when no timePeriod is provided', async () => {
    const nockScope = nock(OHLCV_HOST)
      .get(`/v3/ohlcv-chart/${ASSET_ID}`)
      .query({ interval: '5m' })
      .reply(200, createSuccessBody());

    const { result } = renderUseOHLCVChart({
      assetId: ASSET_ID,
      timePeriod: '' as OHLCVTimePeriod,
      interval: '5m',
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(nockScope.isDone()).toBe(true);
  });
});

describe('useOHLCVChart - pagination metadata', () => {
  beforeEach(() => {
    nock.disableNetConnect();
  });

  afterEach(() => {
    nock.cleanAll();
    jest.restoreAllMocks();
  });

  it('exposes nextCursor from the API response', async () => {
    arrangeNockOhlcvAPISuccessResponse(
      createSuccessBody({
        hasNext: true,
        nextCursor: 'cursor-abc',
      }),
    );

    const { result } = renderUseOHLCVChart(arrangeDefaultOptions());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.nextCursor).toBe('cursor-abc');
    expect(result.current.hasMore).toBe(true);
  });

  it('sets nextCursor to null when API returns empty cursor', async () => {
    arrangeNockOhlcvAPISuccessResponse(
      createSuccessBody({
        hasNext: false,
        nextCursor: '',
      }),
    );

    const { result } = renderUseOHLCVChart(arrangeDefaultOptions());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.nextCursor).toBeNull();
    expect(result.current.hasMore).toBe(false);
  });

  it('resets nextCursor when time range changes', async () => {
    arrangeNockOhlcvAPIStrictQueryResponse(
      { timePeriod: '1d' },
      createSuccessBody({
        hasNext: true,
        nextCursor: 'cursor-a',
      }),
    );

    const initialProps: Parameters<typeof useOHLCVChart>[0] =
      arrangeDefaultOptions();
    const { result, rerender } = renderHook(
      (props: Parameters<typeof useOHLCVChart>[0]) => useOHLCVChart(props),
      { initialProps },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.nextCursor).toBe('cursor-a');

    arrangeNockOhlcvAPIStrictQueryResponse(
      { timePeriod: '1w' },
      createSuccessBody({
        hasNext: false,
        nextCursor: '',
      }),
    );

    rerender({
      ...arrangeDefaultOptions(),
      timePeriod: '1w',
    } as Parameters<typeof useOHLCVChart>[0]);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.nextCursor).toBeNull();
    expect(result.current.hasMore).toBe(false);
  });
});

describe('useOHLCVChart - empty data handling', () => {
  beforeEach(() => {
    nock.disableNetConnect();
  });

  afterEach(() => {
    nock.cleanAll();
    jest.restoreAllMocks();
  });

  it('sets hasEmptyData to true when API returns empty data array', async () => {
    arrangeNockOhlcvAPISuccessResponse(
      createSuccessBody({
        data: [],
        hasNext: false,
        nextCursor: '',
      }),
    );

    const { result } = renderUseOHLCVChart(arrangeDefaultOptions());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasEmptyData).toBe(true);
    expect(result.current.ohlcvData).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('sets hasEmptyData to false when API returns data', async () => {
    arrangeNockOhlcvAPISuccessResponse(
      createSuccessBody({
        data: [createAPICandle()],
      }),
    );

    const { result } = renderUseOHLCVChart(arrangeDefaultOptions());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasEmptyData).toBe(false);
    expect(result.current.ohlcvData.length).toBe(1);
  });

  it('resets hasEmptyData from true to false when a subsequent fetch returns candles', async () => {
    nock(OHLCV_HOST)
      .get(`/v3/ohlcv-chart/${ASSET_ID}`)
      .query({ timePeriod: '1d' })
      .times(2) // Strict Mode can run the initial effect twice with the same params
      .reply(200, createSuccessBody({ data: [] }));

    const initialProps = arrangeDefaultOptions();
    const { result, rerender } = renderHook(
      (props: Parameters<typeof useOHLCVChart>[0]) => useOHLCVChart(props),
      { initialProps },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.hasEmptyData).toBe(true);

    arrangeNockOhlcvAPIStrictQueryResponse({ timePeriod: '1w' });

    rerender({
      ...arrangeDefaultOptions(),
      timePeriod: '1w',
    } as Parameters<typeof useOHLCVChart>[0]);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasEmptyData).toBe(false);
    expect(result.current.ohlcvData.length).toBe(1);
  });

  it('keeps hasEmptyData false when the API request fails', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    arrangeNockOhlcvAPI404Response();

    const { result } = renderUseOHLCVChart(arrangeDefaultOptions());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasEmptyData).toBe(false);
    expect(result.current.error).toBe('OHLCV API error: 404');
  });
});

describe('useOHLCVChart - abort controller', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    nock.disableNetConnect();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    nock.cleanAll();
    nock.enableNetConnect();
    jest.restoreAllMocks();
  });

  function jsonResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Promise that rejects with AbortError when `signal` aborts (mirrors fetch).
   */
  function hangUntilAborted(
    signal: AbortSignal | null | undefined,
  ): Promise<Response> {
    return new Promise((resolve, reject) => {
      if (signal == null) {
        reject(new Error('expected AbortSignal'));
        return;
      }
      if (signal.aborted) {
        reject(new DOMException('The user aborted a request.', 'AbortError'));
        return;
      }
      signal.addEventListener(
        'abort',
        () => {
          reject(new DOMException('The user aborted a request.', 'AbortError'));
        },
        { once: true },
      );
    });
  }

  it('aborts previous request when parameters change', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const successBody = createSuccessBody();

    global.fetch = jest
      .fn()
      .mockImplementation((_input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof _input === 'string' ? _input : _input.toString();
        // Keep every 1d request in-flight until aborted
        if (url.includes('timePeriod=1d')) {
          return hangUntilAborted(init?.signal);
        }
        return Promise.resolve(jsonResponse(successBody));
      }) as typeof fetch;

    const initialProps: Parameters<typeof useOHLCVChart>[0] =
      arrangeDefaultOptions();
    const { result, rerender } = renderHook(
      (props: Parameters<typeof useOHLCVChart>[0]) => useOHLCVChart(props),
      { initialProps },
    );

    rerender({
      ...arrangeDefaultOptions(),
      timePeriod: '1w',
    } as Parameters<typeof useOHLCVChart>[0]);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.ohlcvData.length).toBeGreaterThan(0);
  });

  it('cleans up abort controller on unmount', async () => {
    global.fetch = jest
      .fn()
      .mockImplementation((_input, init?: RequestInit) =>
        hangUntilAborted(init?.signal),
      ) as typeof fetch;

    const { unmount } = renderUseOHLCVChart(arrangeDefaultOptions());

    await act(async () => {
      unmount();
    });

    await act(async () => {
      await Promise.resolve();
    });
  });
});

describe('useOHLCVChart - error handling', () => {
  beforeEach(() => {
    nock.disableNetConnect();
  });

  afterEach(() => {
    nock.cleanAll();
    jest.restoreAllMocks();
  });

  it('handles non-Error exceptions', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    // Mock fetch to throw a non-Error object
    nock(OHLCV_HOST)
      .get(`/v3/ohlcv-chart/${ASSET_ID}`)
      .query(true)
      .replyWithError('Network failure');

    const { result } = renderUseOHLCVChart(arrangeDefaultOptions());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.ohlcvData).toEqual([]);
  });

  it('clears data on error', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    // First successful request
    arrangeNockOhlcvAPIStrictQueryResponse({ timePeriod: '1d' });

    const initialProps: Parameters<typeof useOHLCVChart>[0] =
      arrangeDefaultOptions();
    const { result, rerender } = renderHook(
      (props: Parameters<typeof useOHLCVChart>[0]) => useOHLCVChart(props),
      { initialProps },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.ohlcvData.length).toBeGreaterThan(0);

    // Second request fails
    nock(OHLCV_HOST)
      .get(`/v3/ohlcv-chart/${ASSET_ID}`)
      .query({ timePeriod: '1w' })
      .reply(500);

    rerender({
      ...arrangeDefaultOptions(),
      timePeriod: '1w',
    } as Parameters<typeof useOHLCVChart>[0]);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Data should be cleared on error
    expect(result.current.ohlcvData).toEqual([]);
    expect(result.current.error).toBeTruthy();
  });
});
