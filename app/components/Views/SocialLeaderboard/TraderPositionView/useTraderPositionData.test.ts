import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { Position } from '@metamask/social-controllers';
import type { TokenPrice } from '../../../hooks/useTokenHistoricalPrices';
import {
  fetchHyperliquidHistoricalPrices,
  type HyperliquidCandleInterval,
} from '../utils/hyperliquidPrices';
import {
  getRecommendedTradeSpanPeriod,
  useTraderPositionData,
} from './useTraderPositionData';

jest.mock('react-redux', () => ({
  useSelector: (selector: () => unknown) => selector(),
}));

jest.mock('../../../../selectors/tokenRatesController', () => ({
  selectTokenMarketData: jest.fn(() => ({})),
}));

jest.mock('../../../../selectors/currencyRateController', () => ({
  selectCurrentCurrency: jest.fn(() => 'usd'),
}));

jest.mock('../utils/chainMapping', () => ({
  chainNameToId: jest.fn((chain: string) =>
    chain === 'hyperliquid' ? undefined : 'eip155:8453',
  ),
}));

jest.mock('../../../UI/Bridge/hooks/useAssetMetadata/utils', () => ({
  getAssetImageUrl: jest.fn(() => undefined),
  toAssetId: jest.fn(() => undefined),
}));

jest.mock('@metamask/controller-utils', () => ({
  handleFetch: jest.fn().mockResolvedValue({}),
}));

jest.mock('@metamask/perps-controller', () => ({
  getPerpsDisplaySymbol: (symbol: string) => symbol,
}));

jest.mock('../../../../util/Logger', () => ({ error: jest.fn() }));

jest.mock('../utils/hyperliquidPrices', () => ({
  ...jest.requireActual('../utils/hyperliquidPrices'),
  fetchHyperliquidHistoricalPrices: jest.fn().mockResolvedValue([]),
}));

const mockFetchHyperliquid =
  fetchHyperliquidHistoricalPrices as jest.MockedFunction<
    typeof fetchHyperliquidHistoricalPrices
  >;

const DAY_MS = 24 * 60 * 60 * 1000;

const tradeAt = (timestamp: number) => ({ timestamp });

const baseSpotPosition = {
  chain: 'base',
  tokenSymbol: 'STARKBOT',
  tokenAddress: '0x123',
  positionAmount: 100,
  boughtUsd: 1000,
  soldUsd: 0,
  realizedPnl: 0,
  currentValueUSD: 1500,
  pnlValueUsd: 500,
  pnlPercent: 50,
  trades: [{ timestamp: Date.now() - 60_000 }],
} as unknown as Position;

const spotPosition = {
  chain: 'ethereum',
  tokenSymbol: 'ETH',
  tokenAddress: '0x0000000000000000000000000000000000000001',
  trades: [],
} as unknown as Position;

const perpPosition = {
  chain: 'hyperliquid',
  perpPositionType: 'long',
  tokenSymbol: 'ETH',
  tokenAddress: '0x0000000000000000000000000000000000000000',
  boughtUsd: 1000,
  realizedPnl: 200,
  pnlValueUsd: 300,
  pnlPercent: 30,
  trades: [{ timestamp: Date.now() - 60_000 }],
} as unknown as Position;

describe('getRecommendedTradeSpanPeriod', () => {
  const start = 1_700_000_000_000;

  it('selects 1W for trades spanning three days', () => {
    expect(
      getRecommendedTradeSpanPeriod([
        tradeAt(start),
        tradeAt(start + 3 * DAY_MS),
      ]),
    ).toBe('1W');
  });

  it('selects 1M for trades spanning three weeks', () => {
    expect(
      getRecommendedTradeSpanPeriod([
        tradeAt(start),
        tradeAt(start + 21 * DAY_MS),
      ]),
    ).toBe('1M');
  });

  it('selects All for trades spanning more than one month', () => {
    expect(
      getRecommendedTradeSpanPeriod([
        tradeAt(start),
        tradeAt(start + 45 * DAY_MS),
      ]),
    ).toBe('All');
  });
});

describe('useTraderPositionData — facade', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchHyperliquid.mockResolvedValue([]);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ prices: [[1_700_000_000, 1.5]] }),
    }) as jest.Mock;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('marks perp positions with isPerp true', () => {
    const { result } = renderHook(() => useTraderPositionData(perpPosition));
    expect(result.current.isPerp).toBe(true);
    expect(result.current.symbol).toBe('ETH');
  });

  it('marks spot positions with isPerp false', () => {
    const { result } = renderHook(() =>
      useTraderPositionData(baseSpotPosition),
    );
    expect(result.current.isPerp).toBe(false);
    expect(result.current.symbol).toBe('STARKBOT');
  });

  it('uses unrealized PnL for an open spot position', () => {
    const { result } = renderHook(() =>
      useTraderPositionData(baseSpotPosition),
    );
    expect(result.current.isClosed).toBe(false);
    expect(result.current.pnlValue).toBe(500);
    expect(result.current.pnlPercent).toBe(50);
    expect(result.current.isPnlPositive).toBe(true);
  });

  it('uses realized PnL for a closed spot position', () => {
    const closedSpot = {
      ...baseSpotPosition,
      positionAmount: 0,
      soldUsd: 1200,
      realizedPnl: 200,
      pnlValueUsd: null,
      pnlPercent: null,
    } as unknown as Position;

    const { result } = renderHook(() => useTraderPositionData(closedSpot));
    expect(result.current.isClosed).toBe(true);
    expect(result.current.pnlValue).toBe(200);
    expect(result.current.pnlPercent).toBe(20);
  });

  it('prefers pnlValueUsd for perp positions', () => {
    const { result } = renderHook(() => useTraderPositionData(perpPosition));
    expect(result.current.pnlValue).toBe(300);
    expect(result.current.pnlPercent).toBe(30);
  });

  it('filters chartTrades by the active time period', () => {
    const oldTrade = { timestamp: Date.now() - 40 * DAY_MS };
    const recentTrade = { timestamp: Date.now() - 60_000 };
    const position = {
      ...baseSpotPosition,
      trades: [oldTrade, recentTrade],
    } as unknown as Position;

    const { result } = renderHook(() => useTraderPositionData(position));

    expect(result.current.allTrades).toHaveLength(2);
    // A ~40-day trade span auto-selects 'All', so both trades are in range.
    expect(result.current.chartTrades).toHaveLength(2);

    act(() => {
      result.current.setActiveTimePeriod('1D');
    });

    expect(result.current.chartTrades).toHaveLength(1);
  });

  it('delegates perp candle pre-fetch to the perp prices hook end-to-end', async () => {
    renderHook(() => useTraderPositionData(perpPosition));

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

  it('exposes time period controls from the facade', () => {
    const { result } = renderHook(() =>
      useTraderPositionData(baseSpotPosition),
    );

    expect(result.current.timePeriods).toEqual(['1H', '1D', '1W', '1M', 'All']);
    // A single recent trade (~zero span) auto-selects the narrowest period.
    expect(result.current.activeTimePeriod).toBe('1H');

    act(() => {
      result.current.setActiveTimePeriod('1W');
    });

    expect(result.current.activeTimePeriod).toBe('1W');
  });
});

describe('useTraderPositionData — default chart period', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchHyperliquid.mockResolvedValue([]);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ prices: [] }),
    }) as jest.Mock;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('defaults to the period recommended by the full trade span', () => {
    const position = {
      ...spotPosition,
      trades: [
        tradeAt(1_700_000_000_000),
        tradeAt(1_700_000_000_000 + 3 * DAY_MS),
      ],
    } as unknown as Position;
    const { result } = renderHook(
      (initialPosition: Position) => useTraderPositionData(initialPosition),
      { initialProps: position },
    );

    expect(result.current.activeTimePeriod).toBe('1W');
  });

  it('widens to the first cached period whose prices cover the trade date', async () => {
    const tradeTime = 1_700_000_000_000;
    const recentPrices: TokenPrice[] = [
      [String(tradeTime + 30 * DAY_MS), 100],
      [String(tradeTime + 30 * DAY_MS + 60_000), 101],
    ];
    const coveringPrices: TokenPrice[] = [
      [String(tradeTime - DAY_MS), 100],
      [String(tradeTime + DAY_MS), 101],
    ];
    const position = {
      ...perpPosition,
      trades: [tradeAt(tradeTime)],
    } as unknown as Position;

    mockFetchHyperliquid.mockImplementation(({ interval }) =>
      Promise.resolve(interval === '1h' ? coveringPrices : recentPrices),
    );

    const { result } = renderHook(
      (initialPosition: Position) => useTraderPositionData(initialPosition),
      { initialProps: position },
    );

    await waitFor(() => expect(result.current.activeTimePeriod).toBe('1W'));
  });

  it('updates the automatic default when fuller trade data arrives before manual selection', () => {
    const { result, rerender } = renderHook(
      (position: Position) => useTraderPositionData(position),
      {
        initialProps: {
          ...spotPosition,
          trades: [tradeAt(1_700_000_000_000)],
        } as unknown as Position,
      },
    );

    expect(result.current.activeTimePeriod).toBe('1H');

    rerender({
      ...spotPosition,
      trades: [
        tradeAt(1_700_000_000_000),
        tradeAt(1_700_000_000_000 + 21 * DAY_MS),
      ],
    } as unknown as Position);

    expect(result.current.activeTimePeriod).toBe('1M');
  });

  it('does not override a user-selected period on same-position refresh', () => {
    const { result, rerender } = renderHook(
      (position: Position) => useTraderPositionData(position),
      {
        initialProps: {
          ...spotPosition,
          trades: [
            tradeAt(1_700_000_000_000),
            tradeAt(1_700_000_000_000 + 3 * DAY_MS),
          ],
        } as unknown as Position,
      },
    );

    act(() => {
      result.current.setActiveTimePeriod('1D');
    });

    rerender({
      ...spotPosition,
      trades: [
        tradeAt(1_700_000_000_000),
        tradeAt(1_700_000_000_000 + 21 * DAY_MS),
      ],
    } as unknown as Position);

    expect(result.current.activeTimePeriod).toBe('1D');
  });
});
