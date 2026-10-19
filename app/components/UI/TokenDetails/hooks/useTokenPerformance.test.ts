import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { selectTokenMarketData } from '../../../../selectors/tokenRatesController';
import { useOHLCVChart } from '../../Charts/AdvancedChart/useOHLCVChart';
import type { OHLCVBar } from '../../Charts/AdvancedChart/AdvancedChart.types';
import { TokenI } from '../../Tokens/types';
import {
  computeCandlePercentChange,
  useTokenPerformance,
} from './useTokenPerformance';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../selectors/tokenRatesController', () => ({
  selectTokenMarketData: jest.fn(),
}));

jest.mock('../../Charts/AdvancedChart/useOHLCVChart', () => ({
  useOHLCVChart: jest.fn(),
}));

const mockUseSelector = jest.mocked(useSelector);
const mockSelectTokenMarketData = jest.mocked(selectTokenMarketData);
const mockUseOHLCVChart = jest.mocked(useOHLCVChart);

const token = {
  address: '0xabc',
  chainId: '0x1',
  decimals: 18,
  symbol: 'PEPE',
  name: 'Pepe',
} as unknown as TokenI;

const makeBar = (time: number, close: number): OHLCVBar => ({
  time,
  open: close,
  high: close,
  low: close,
  close,
  volume: 0,
});

describe('computeCandlePercentChange', () => {
  it('computes the percent change between the latest close and the close at the lookback cutoff', () => {
    const now = 1_700_000_000;
    const candles = [
      makeBar(now - 300, 100), // 5m ago reference
      makeBar(now - 120, 110),
      makeBar(now, 121),
    ];

    expect(computeCandlePercentChange(candles, 300)).toBeCloseTo(21);
  });

  it('picks the latest bar at or before the cutoff, not after it', () => {
    const now = 1_700_000_000;
    const candles = [
      makeBar(now - 310, 100),
      makeBar(now - 250, 999), // after the 5m cutoff — must be ignored
      makeBar(now, 121),
    ];

    expect(computeCandlePercentChange(candles, 300)).toBeCloseTo(21);
  });

  it('returns null when no bar is old enough for the lookback', () => {
    const now = 1_700_000_000;
    const candles = [makeBar(now - 60, 100), makeBar(now, 101)];

    expect(computeCandlePercentChange(candles, 300)).toBeNull();
  });

  it('does not assume the API returns candles in ascending order', () => {
    const now = 1_700_000_000;
    const candles = [
      makeBar(now, 121),
      makeBar(now - 300, 100),
      makeBar(now - 120, 110),
    ];

    expect(computeCandlePercentChange(candles, 300)).toBeCloseTo(21);
  });

  it('returns null when there are fewer than two candles', () => {
    expect(computeCandlePercentChange([makeBar(1, 100)], 300)).toBeNull();
    expect(computeCandlePercentChange([], 300)).toBeNull();
  });

  it('returns null when the reference close is not a positive price', () => {
    const now = 1_700_000_000;
    const zeroPriceCandles = [makeBar(now - 300, 0), makeBar(now, 100)];

    expect(computeCandlePercentChange(zeroPriceCandles, 300)).toBeNull();
  });
});

describe('useTokenPerformance', () => {
  const setupMocks = ({
    marketData,
    ohlcvData = [] as OHLCVBar[],
  }: {
    marketData?: {
      pricePercentChange1h?: number;
      pricePercentChange1d?: number;
    };
    ohlcvData?: OHLCVBar[];
  }) => {
    // The hook selects via an inline selector; run it with an opaque state
    // so the mocked `selectTokenMarketData` supplies the market data.
    mockUseSelector.mockImplementation((selector) => selector(undefined));
    mockSelectTokenMarketData.mockReturnValue(
      marketData
        ? ({ '0x1': { '0xabc': marketData } } as never)
        : ({} as never),
    );
    mockUseOHLCVChart.mockReturnValue({
      ohlcvData,
      isLoading: false,
      error: null,
      hasMore: false,
      nextCursor: null,
      hasEmptyData: ohlcvData.length === 0,
    });
  };

  it('maps the spot-prices 1h / 24h percentages onto the cells', () => {
    setupMocks({
      marketData: { pricePercentChange1h: -0.52, pricePercentChange1d: 3.09 },
    });

    const { result } = renderHook(() =>
      useTokenPerformance({
        token,
        assetId: 'eip155:1/erc20:0xabc',
        currentCurrency: 'usd',
      }),
    );

    expect(result.current.oneHour).toBe(-0.52);
    expect(result.current.twentyFourHour).toBe(3.09);
  });

  it('derives the 5m / 4h cells from 1-minute OHLCV candles', () => {
    const now = 1_700_000_000;
    setupMocks({
      marketData: {},
      ohlcvData: [
        makeBar(now - 14400, 100), // 4h ago
        makeBar(now - 300, 110), // 5m ago
        makeBar(now, 121),
      ],
    });

    const { result } = renderHook(() =>
      useTokenPerformance({
        token,
        assetId: 'eip155:1/erc20:0xabc',
        currentCurrency: 'usd',
      }),
    );

    expect(result.current.fiveMinute).toBeCloseTo(10);
    expect(result.current.fourHour).toBeCloseTo(21);
  });

  it('degrades every cell to null when no source data is available', () => {
    setupMocks({ marketData: undefined, ohlcvData: [] });

    const { result } = renderHook(() =>
      useTokenPerformance({
        token,
        assetId: 'eip155:1/erc20:0xabc',
        currentCurrency: 'usd',
      }),
    );

    expect(result.current).toEqual({
      fiveMinute: null,
      oneHour: null,
      fourHour: null,
      twentyFourHour: null,
    });
  });

  it('requests 1-minute candles covering the full 4h lookback', () => {
    setupMocks({ marketData: {} });

    renderHook(() =>
      useTokenPerformance({
        token,
        assetId: 'eip155:1/erc20:0xabc',
        currentCurrency: 'usd',
      }),
    );

    expect(mockUseOHLCVChart).toHaveBeenCalledWith({
      assetId: 'eip155:1/erc20:0xabc',
      timePeriod: '1d',
      interval: '1m',
      vsCurrency: 'usd',
    });
  });

  it('skips the candle fetch when no asset id is available', () => {
    setupMocks({ marketData: {} });

    renderHook(() =>
      useTokenPerformance({ token, assetId: null, currentCurrency: 'usd' }),
    );

    expect(mockUseOHLCVChart).toHaveBeenCalledWith(
      expect.objectContaining({ assetId: '' }),
    );
  });
});
