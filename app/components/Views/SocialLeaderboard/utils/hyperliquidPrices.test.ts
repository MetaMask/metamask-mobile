import Logger from '../../../../util/Logger';
import {
  HYPERLIQUID_INFO_URL,
  fetchHyperliquidHistoricalPrices,
} from './hyperliquidPrices';

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

const mockLoggerError = Logger.error as jest.Mock;

/** A candleSnapshot entry — only `t` (open time) and `c` (close) are consumed. */
const makeCandle = (t: number, c: string) => ({
  t,
  T: t + 60_000,
  s: 'BTC',
  i: '1m',
  o: c,
  c,
  h: c,
  l: c,
  v: '1',
  n: 1,
});

const mockFetchResolving = (body: unknown, init?: { ok?: boolean }) => {
  const fetchMock = jest.fn().mockResolvedValue({
    ok: init?.ok ?? true,
    json: () => Promise.resolve(body),
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
};

const NOW = 1_700_000_000_000;

describe('fetchHyperliquidHistoricalPrices', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('maps candle close prices to [timestamp, price] tuples', async () => {
    mockFetchResolving([
      makeCandle(1_000, '100.5'),
      makeCandle(2_000, '101.25'),
    ]);

    const result = await fetchHyperliquidHistoricalPrices({
      symbol: 'BTC',
      interval: '1m',
      limit: 60,
      nowMs: NOW,
    });

    expect(result).toEqual([
      ['1000', 100.5],
      ['2000', 101.25],
    ]);
  });

  it('POSTs a candleSnapshot request with a window derived from limit × interval', async () => {
    const fetchMock = mockFetchResolving([]);

    await fetchHyperliquidHistoricalPrices({
      symbol: 'ETH',
      interval: '1h',
      limit: 168,
      nowMs: NOW,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe(HYPERLIQUID_INFO_URL);
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({
      type: 'candleSnapshot',
      req: {
        coin: 'ETH',
        interval: '1h',
        startTime: NOW - 168 * 60 * 60 * 1000,
        endTime: NOW,
      },
    });
  });

  it('returns an empty array without fetching when the symbol is empty', async () => {
    const fetchMock = mockFetchResolving([]);

    const result = await fetchHyperliquidHistoricalPrices({
      symbol: '',
      interval: '1d',
      limit: 365,
      nowMs: NOW,
    });

    expect(result).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns an empty array when the response is not ok', async () => {
    mockFetchResolving([makeCandle(1_000, '100')], { ok: false });

    const result = await fetchHyperliquidHistoricalPrices({
      symbol: 'BTC',
      interval: '1m',
      limit: 60,
      nowMs: NOW,
    });

    expect(result).toEqual([]);
  });

  it('returns an empty array when the payload is not an array', async () => {
    mockFetchResolving({ error: 'rate limited' });

    const result = await fetchHyperliquidHistoricalPrices({
      symbol: 'BTC',
      interval: '1m',
      limit: 60,
      nowMs: NOW,
    });

    expect(result).toEqual([]);
  });

  it('drops candles whose close price is not a finite number', async () => {
    mockFetchResolving([
      makeCandle(1_000, '100'),
      makeCandle(2_000, 'not-a-number'),
      makeCandle(3_000, '102'),
    ]);

    const result = await fetchHyperliquidHistoricalPrices({
      symbol: 'BTC',
      interval: '1m',
      limit: 60,
      nowMs: NOW,
    });

    expect(result).toEqual([
      ['1000', 100],
      ['3000', 102],
    ]);
  });

  it('logs and returns an empty array when the request throws', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error('network down')) as unknown as typeof fetch;

    const result = await fetchHyperliquidHistoricalPrices({
      symbol: 'BTC',
      interval: '1m',
      limit: 60,
      nowMs: NOW,
    });

    expect(result).toEqual([]);
    expect(mockLoggerError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.stringContaining('BTC'),
    );
  });
});
