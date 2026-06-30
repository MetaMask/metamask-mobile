import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { Position } from '@metamask/social-controllers';
import {
  fetchHyperliquidHistoricalPrices,
  type HyperliquidCandleInterval,
} from '../utils/hyperliquidPrices';
import { useTraderPositionData } from './useTraderPositionData';

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

describe('useTraderPositionData — facade', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchHyperliquid.mockResolvedValue([]);
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
    const oldTrade = { timestamp: Date.now() - 40 * 24 * 60 * 60 * 1000 };
    const recentTrade = { timestamp: Date.now() - 60_000 };
    const position = {
      ...baseSpotPosition,
      trades: [oldTrade, recentTrade],
    } as unknown as Position;

    const { result } = renderHook(() => useTraderPositionData(position));

    expect(result.current.allTrades).toHaveLength(2);
    expect(result.current.chartTrades).toHaveLength(1);

    act(() => {
      result.current.setActiveTimePeriod('All');
    });

    expect(result.current.chartTrades).toHaveLength(2);
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
    expect(result.current.activeTimePeriod).toBe('1M');

    act(() => {
      result.current.setActiveTimePeriod('1W');
    });

    expect(result.current.activeTimePeriod).toBe('1W');
  });
});
