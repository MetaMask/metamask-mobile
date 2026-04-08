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

    rerender({ ...arrangeDefaultOptions(), timePeriod: '1w' as const });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.nextCursor).toBeNull();
    expect(result.current.hasMore).toBe(false);
  });
});
