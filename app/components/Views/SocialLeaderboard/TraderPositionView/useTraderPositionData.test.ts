import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { Position } from '@metamask/social-controllers';
import type { TokenPrice } from '../../../hooks/useTokenHistoricalPrices';
import {
  fetchHyperliquidHistoricalPrices,
  type HyperliquidCandleInterval,
} from '../utils/hyperliquidPrices';
import { useTraderPositionData } from './useTraderPositionData';

// useSelector calls the selector with no state; the mocked selectors below return
// fixed values, so the hook reads `{}` market data and `usd` currency.
jest.mock('react-redux', () => ({
  useSelector: (selector: () => unknown) => selector(),
}));

jest.mock('../../../../selectors/tokenRatesController', () => ({
  selectTokenMarketData: jest.fn(() => ({})),
}));

jest.mock('../../../../selectors/currencyRateController', () => ({
  selectCurrentCurrency: jest.fn(() => 'usd'),
}));

// Keep caipChainId undefined so the spot/market-cap machinery stays dormant and
// the test isolates the perp candle pre-fetch path.
jest.mock('../utils/chainMapping', () => ({
  chainNameToId: jest.fn(() => undefined),
}));

jest.mock('../../../UI/Bridge/hooks/useAssetMetadata/utils', () => ({
  getAssetImageUrl: jest.fn(() => undefined),
  toAssetId: jest.fn(() => undefined),
}));

jest.mock('@metamask/controller-utils', () => ({
  handleFetch: jest.fn().mockResolvedValue({}),
}));

// The real module pulls in PerpsController (and a native dep) at import time;
// only the display-symbol helper is needed here.
jest.mock('@metamask/perps-controller', () => ({
  getPerpsDisplaySymbol: (symbol: string) => symbol,
}));

jest.mock('../../../../util/Logger', () => ({ error: jest.fn() }));

// Partial mock: keep resolveHyperliquidCandleLimit (pure) real; stub the network.
jest.mock('../utils/hyperliquidPrices', () => ({
  ...jest.requireActual('../utils/hyperliquidPrices'),
  fetchHyperliquidHistoricalPrices: jest.fn().mockResolvedValue([]),
}));

const mockFetchHyperliquid =
  fetchHyperliquidHistoricalPrices as jest.MockedFunction<
    typeof fetchHyperliquidHistoricalPrices
  >;

const perpPosition = {
  chain: 'hyperliquid',
  perpPositionType: 'long',
  tokenSymbol: 'ETH',
  tokenAddress: '0x0000000000000000000000000000000000000000',
  trades: [],
} as unknown as Position;

describe('useTraderPositionData — perp candle pre-fetch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchHyperliquid.mockResolvedValue([]);
  });

  it('pre-fetches every period up front so an interval switch needs no network', async () => {
    renderHook(() => useTraderPositionData(perpPosition));

    // One candleSnapshot request per period (1H, 1D, 1W, 1M, All), each with its
    // own distinct Hyperliquid interval — warmed on mount, not on demand.
    await waitFor(() => expect(mockFetchHyperliquid).toHaveBeenCalledTimes(5));

    const intervals = mockFetchHyperliquid.mock.calls.map(
      ([opts]) => opts.interval,
    );
    const expected: HyperliquidCandleInterval[] = [
      '1m',
      '15m',
      '1h',
      '4h',
      '1d',
    ];
    expect(new Set(intervals)).toEqual(new Set(expected));
  });

  it('requests every period for the position symbol', async () => {
    renderHook(() => useTraderPositionData(perpPosition));

    await waitFor(() => expect(mockFetchHyperliquid).toHaveBeenCalledTimes(5));
    for (const [opts] of mockFetchHyperliquid.mock.calls) {
      expect(opts.symbol).toBe('ETH');
    }
  });

  it('does not refetch already-loaded periods when positionParam gets a new reference', async () => {
    // Each period resolves to non-empty candles, so all five get cached.
    const goodPrices: TokenPrice[] = [
      ['1', 100],
      ['2', 101],
    ];
    mockFetchHyperliquid.mockResolvedValue(goodPrices);

    const { rerender } = renderHook(
      (position: Position) => useTraderPositionData(position),
      { initialProps: perpPosition },
    );

    // Let all five fetches resolve and populate the cache.
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockFetchHyperliquid).toHaveBeenCalledTimes(5);

    // Pull-to-refresh hands down a NEW positionParam reference with the same
    // identity (chain + symbol → same perpKey), re-running the pre-fetch effect.
    rerender({ ...perpPosition } as Position);
    await act(async () => {
      await Promise.resolve();
    });

    // Every period already holds non-empty candles, so none are refetched — a
    // transient empty response therefore cannot overwrite the cached data.
    expect(mockFetchHyperliquid).toHaveBeenCalledTimes(5);
  });

  it('refetches with a larger limit when an earlier trade extends the required window', async () => {
    // resolveHyperliquidCandleLimit grows the limit from `nowMs - earliestTradeMs`,
    // and the test harness pins Date.now() to a tiny value — push it forward so an
    // old trade produces a meaningfully larger window. Restore the harness clock
    // afterwards.
    const savedNow = Date.now;
    Date.now = () => 2_000_000_000_000; // ~2033
    try {
      mockFetchHyperliquid.mockResolvedValue([
        ['1', 100],
        ['2', 101],
      ] as TokenPrice[]);

      // Row-tap snapshot has no trades → each period uses its baseLimit.
      const snapshot = { ...perpPosition, trades: [] } as unknown as Position;
      const { rerender } = renderHook(
        (position: Position) => useTraderPositionData(position),
        { initialProps: snapshot },
      );
      await act(async () => {
        await Promise.resolve();
      });
      expect(mockFetchHyperliquid).toHaveBeenCalledTimes(5);
      const initialOneMinLimit = mockFetchHyperliquid.mock.calls.find(
        ([opts]) => opts.interval === '1m',
      )?.[0].limit as number;

      // Fetched position (same market) arrives with a much older trade (~2001),
      // growing the required candle window beyond what the cached candles cover.
      const withOldTrade = {
        ...perpPosition,
        trades: [{ timestamp: 1_000_000_000_000 }],
      } as unknown as Position;
      rerender(withOldTrade);
      await act(async () => {
        await Promise.resolve();
      });

      // The fine-interval periods are refetched with a larger limit so the older
      // trade can be framed — without this fix the cache skip would keep the
      // shorter window and total calls would stay at 5.
      expect(mockFetchHyperliquid.mock.calls.length).toBeGreaterThan(5);
      const oneMinCalls = mockFetchHyperliquid.mock.calls.filter(
        ([opts]) => opts.interval === '1m',
      );
      expect(oneMinCalls.length).toBeGreaterThanOrEqual(2);
      expect(oneMinCalls.at(-1)?.[0].limit).toBeGreaterThan(initialOneMinLimit);
    } finally {
      Date.now = savedNow;
    }
  });
});
