import { act, renderHook, waitFor } from '@testing-library/react-native';
import nock from 'nock';
import {
  OHLCVApiCandle,
  OHLCVApiResponse,
  useOHLCVChart,
} from './useOHLCVChart';

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

function arrangeDefaultOptions() {
  return {
    assetId: ASSET_ID,
    timePeriod: '1d' as const,
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
});

describe('useOHLCVChart - fetchMoreHistory', () => {
  beforeEach(() => {
    nock.disableNetConnect();
  });

  afterEach(() => {
    nock.cleanAll();
    jest.restoreAllMocks();
  });

  it('prepends older bars and advances cursor when API returns a page', async () => {
    const older = createAPICandle({ timestamp: 100, close: 1 });
    const newer = createAPICandle({ timestamp: 200, close: 2 });

    const scope1 = arrangeNockOhlcvAPISuccessResponse(
      createSuccessBody({
        data: [newer],
        hasNext: true,
        nextCursor: 'cursor-a',
      }),
    );

    const scope2 = arrangeNockOhlcvAPIStrictQueryResponse(
      { nextCursor: 'cursor-a' },
      createSuccessBody({ data: [older], hasNext: false, nextCursor: '' }),
    );

    const { result } = renderUseOHLCVChart(arrangeDefaultOptions());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.hasMore).toBe(true);
    });

    expect(scope1.isDone()).toBe(true);
    expect(scope2.isDone()).toBe(false);

    await act(async () => {
      result.current.fetchMoreHistory({ oldestTimestamp: 100 });
    });

    await waitFor(() => {
      expect(result.current.ohlcvData).toHaveLength(2);
    });

    expect(result.current.ohlcvData[0]?.time).toBe(100);
    expect(result.current.ohlcvData[1]?.time).toBe(200);
    expect(result.current.hasMore).toBe(false);

    expect(scope1.isDone()).toBe(true);
    expect(scope2.isDone()).toBe(true);
  });

  it('discards stale pagination response when time range changes mid-flight', async () => {
    const rangeACandle = createAPICandle({ timestamp: 200, close: 2 });
    const rangeAOlderCandle = createAPICandle({ timestamp: 100, close: 1 });
    const rangeBCandle = createAPICandle({ timestamp: 300, close: 3 });

    // Initial load for range A
    arrangeNockOhlcvAPIStrictQueryResponse(
      { timePeriod: '1d' },
      createSuccessBody({
        data: [rangeACandle],
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
      expect(result.current.hasMore).toBe(true);
    });

    // Set up a delayed response for the pagination fetch so the time range
    // switch happens while it's in-flight.
    const paginationScope = nock(OHLCV_HOST)
      .get(`/v3/ohlcv-chart/${ASSET_ID}`)
      .query({ nextCursor: 'cursor-a' })
      .delay(100)
      .reply(
        200,
        createSuccessBody({
          data: [rangeAOlderCandle],
          hasNext: false,
          nextCursor: '',
        }),
      );

    // Start pagination fetch (in-flight)
    await act(async () => {
      result.current.fetchMoreHistory({ oldestTimestamp: 200 });
    });

    // Switch time range while pagination is in-flight — this triggers
    // loadInitial which aborts the shared AbortController.
    arrangeNockOhlcvAPIStrictQueryResponse(
      { timePeriod: '1w' },
      createSuccessBody({
        data: [rangeBCandle],
        hasNext: false,
        nextCursor: '',
      }),
    );

    rerender({ ...arrangeDefaultOptions(), timePeriod: '1w' as const });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // The stale range-A bar should NOT have been prepended.
    // Only range-B data should be present.
    expect(result.current.ohlcvData).toHaveLength(1);
    expect(result.current.ohlcvData[0]?.time).toBe(300);

    nock.abortPendingRequests();
    paginationScope.done();
  });

  it('does not request another page when hasMore is false', async () => {
    const scope = arrangeNockOhlcvAPIStrictQueryResponse(
      { timePeriod: '1d' },
      createSuccessBody({
        hasNext: false,
        nextCursor: '',
      }),
    );

    const scope2Call = arrangeNockOhlcvAPIStrictQueryResponse(
      { timePeriod: '1d' },
      createSuccessBody({
        hasNext: false,
        nextCursor: '',
      }),
    );

    const { result } = renderUseOHLCVChart(arrangeDefaultOptions());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(scope.isDone()).toBe(true);

    await act(async () => {
      result.current.fetchMoreHistory({ oldestTimestamp: 1 });
    });

    // Scope 2 never called because hasMore is false
    expect(scope2Call.isDone()).toBe(false);
  });
});
