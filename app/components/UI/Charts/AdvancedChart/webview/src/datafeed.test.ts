import {
  VARIABLE_TICK_SIZE,
  OHLCV_BASE_URL,
  SUPPORTED_RESOLUTIONS,
  filterBarsForRange,
  fetchOlderBars,
  type FetchOlderBarsDeps,
} from './datafeed';
import type { OHLCVBar } from './types';

function makeBar(time: number, close = 100): OHLCVBar {
  return {
    time,
    open: close,
    high: close + 1,
    low: close - 1,
    close,
    volume: 1000,
  };
}

describe('VARIABLE_TICK_SIZE', () => {
  it('is a non-empty space-separated string', () => {
    expect(typeof VARIABLE_TICK_SIZE).toBe('string');
    expect(VARIABLE_TICK_SIZE.split(' ').length).toBeGreaterThan(1);
  });
});

describe('SUPPORTED_RESOLUTIONS', () => {
  it('includes common resolutions', () => {
    expect(SUPPORTED_RESOLUTIONS).toContain('1');
    expect(SUPPORTED_RESOLUTIONS).toContain('1D');
    expect(SUPPORTED_RESOLUTIONS).toContain('1W');
    expect(SUPPORTED_RESOLUTIONS).toContain('1M');
  });
});

describe('OHLCV_BASE_URL', () => {
  it('points to the MetaMask price API', () => {
    expect(OHLCV_BASE_URL).toContain('price.api.cx.metamask.io');
  });
});

describe('filterBarsForRange', () => {
  const bars = [
    makeBar(1000),
    makeBar(2000),
    makeBar(3000),
    makeBar(4000),
    makeBar(5000),
  ];

  it('returns bars within [fromMs, toMs) when enough for countBack', () => {
    const result = filterBarsForRange(bars, 2000, 5000, 2);
    expect(result).toHaveLength(3);
    expect(result[0].time).toBe(2000);
    expect(result[1].time).toBe(3000);
    expect(result[2].time).toBe(4000);
  });

  it('excludes toMs boundary', () => {
    const result = filterBarsForRange(bars, 1000, 3000, 2);
    expect(result.map((b) => b.time)).toEqual([1000, 2000]);
  });

  it('falls back to last countBack bars before toMs when range has fewer', () => {
    const result = filterBarsForRange(bars, 9000, 10000, 3);
    expect(result).toHaveLength(3);
    expect(result[0].time).toBe(3000);
    expect(result[2].time).toBe(5000);
  });

  it('returns empty array for empty input', () => {
    expect(filterBarsForRange([], 0, 10000, 10)).toEqual([]);
  });

  it('returns all bars when range covers everything', () => {
    const result = filterBarsForRange(bars, 0, 99999, 100);
    expect(result).toHaveLength(5);
  });

  it('returns shallow copies, not references', () => {
    const result = filterBarsForRange(bars, 1000, 2000, 10);
    expect(result[0]).not.toBe(bars[0]);
    expect(result[0]).toEqual({
      time: 1000,
      open: 100,
      high: 101,
      low: 99,
      close: 100,
      volume: 1000,
    });
  });
});

describe('fetchOlderBars', () => {
  function makeDeps(
    overrides: Partial<FetchOlderBarsDeps> = {},
  ): FetchOlderBarsDeps {
    return {
      getOhlcvPagination: () => ({
        nextCursor: 'cursor123',
        hasMore: true,
        assetId: 'eip155:1/slip44:60',
        vsCurrency: 'usd',
      }),
      getOhlcvGeneration: () => 1,
      getOhlcvData: () => [makeBar(5000), makeBar(6000)],
      setOhlcvData: jest.fn(),
      updatePagination: jest.fn(),
      onLayoutSettlePending: jest.fn(),
      sendDebug: jest.fn(),
      ...overrides,
    };
  }

  it('calls onResult with noData when no cursor', () => {
    const onResult = jest.fn();
    const deps = makeDeps({
      getOhlcvPagination: () => ({
        nextCursor: null,
        hasMore: false,
        assetId: null,
        vsCurrency: null,
      }),
    });
    fetchOlderBars({ onResult, oldestAtDefer: 5000 }, deps);
    expect(onResult).toHaveBeenCalledWith([], { noData: true });
    expect(deps.onLayoutSettlePending).toHaveBeenCalled();
  });

  it('calls onResult with noData when hasMore is false', () => {
    const onResult = jest.fn();
    const deps = makeDeps({
      getOhlcvPagination: () => ({
        nextCursor: 'abc',
        hasMore: false,
        assetId: 'eip155:1/slip44:60',
        vsCurrency: 'usd',
      }),
    });
    fetchOlderBars({ onResult, oldestAtDefer: 5000 }, deps);
    expect(onResult).toHaveBeenCalledWith([], { noData: true });
  });

  it('fetches from the API and delivers older bars', async () => {
    const onResult = jest.fn();
    const mockResponse = {
      data: [
        { timestamp: 1000, open: 10, high: 11, low: 9, close: 10, volume: 500 },
        {
          timestamp: 2000,
          open: 11,
          high: 12,
          low: 10,
          close: 11,
          volume: 600,
        },
      ],
      nextCursor: 'cursor456',
      hasNext: true,
    };

    const fetchFn = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const deps = makeDeps({ fetchFn: fetchFn as unknown as typeof fetch });

    fetchOlderBars({ onResult, oldestAtDefer: 5000 }, deps);

    await new Promise((r) => setTimeout(r, 10));

    expect(fetchFn).toHaveBeenCalledTimes(1);
    const url = fetchFn.mock.calls[0][0] as string;
    expect(url).toContain(OHLCV_BASE_URL);
    expect(url).toContain('nextCursor=cursor123');
    expect(url).toContain('vsCurrency=usd');

    expect(deps.updatePagination).toHaveBeenCalledWith('cursor456', true);
    expect(deps.setOhlcvData).toHaveBeenCalled();

    expect(onResult).toHaveBeenCalledTimes(1);
    const [olderBars, meta] = onResult.mock.calls[0];
    expect(olderBars).toHaveLength(2);
    expect(meta.noData).toBe(false);
  });

  it('discards results when generation has changed', async () => {
    const onResult = jest.fn();
    let gen = 1;
    const fetchFn = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: [
            { timestamp: 1000, open: 1, high: 2, low: 0, close: 1, volume: 1 },
          ],
          nextCursor: null,
          hasNext: false,
        }),
    });

    const deps = makeDeps({
      getOhlcvGeneration: () => gen,
      fetchFn: fetchFn as unknown as typeof fetch,
    });

    fetchOlderBars({ onResult, oldestAtDefer: 5000 }, deps);
    gen = 2; // simulate user switching timeframes

    await new Promise((r) => setTimeout(r, 10));

    expect(onResult).not.toHaveBeenCalled();
  });

  it('handles fetch errors gracefully', async () => {
    const onResult = jest.fn();
    const fetchFn = jest.fn().mockRejectedValue(new Error('Network error'));
    const deps = makeDeps({ fetchFn: fetchFn as unknown as typeof fetch });

    fetchOlderBars({ onResult, oldestAtDefer: 5000 }, deps);

    await new Promise((r) => setTimeout(r, 10));

    expect(onResult).toHaveBeenCalledWith([], { noData: true });
    expect(deps.sendDebug).toHaveBeenCalledWith(
      expect.stringContaining('Network error'),
    );
  });

  it('handles non-ok HTTP responses', async () => {
    const onResult = jest.fn();
    const fetchFn = jest.fn().mockResolvedValue({ ok: false, status: 500 });
    const deps = makeDeps({ fetchFn: fetchFn as unknown as typeof fetch });

    fetchOlderBars({ onResult, oldestAtDefer: 5000 }, deps);

    await new Promise((r) => setTimeout(r, 10));

    expect(onResult).toHaveBeenCalledWith([], { noData: true });
    expect(deps.sendDebug).toHaveBeenCalledWith(expect.stringContaining('500'));
  });
});
