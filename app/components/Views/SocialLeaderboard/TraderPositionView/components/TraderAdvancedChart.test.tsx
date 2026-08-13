import React from 'react';
import { render, act } from '@testing-library/react-native';
import type { Trade } from '@metamask/social-controllers';
import type { TokenPrice } from '../../../../hooks/useTokenHistoricalPrices';
import { useOHLCVChart } from '../../../../UI/Charts/AdvancedChart/useOHLCVChart';
import {
  ChartType,
  type OHLCVBar,
} from '../../../../UI/Charts/AdvancedChart/AdvancedChart.types';
import { CandlePeriod } from '@metamask/perps-controller';
import TraderAdvancedChart, {
  getRecommendedTradeFocusPeriod,
  getTradeFocusSpanMs,
  getPerpTradeFocusSpanMs,
  mapTradesToAdvancedMarkers,
} from './TraderAdvancedChart';

// Capture the props AdvancedChart receives so we can assert on tradeMarkers,
// and expose a mock `focusTime` via the forwarded ref so we can assert centering.
const mockAdvancedChart = jest.fn();
const mockFocusTime = jest.fn();
const mockPulseTradeMarker = jest.fn();
jest.mock('../../../../UI/Charts/AdvancedChart/AdvancedChart', () => {
  const ReactActual = jest.requireActual('react');
  return {
    __esModule: true,
    default: ReactActual.forwardRef(
      (props: Record<string, unknown>, ref: unknown) => {
        mockAdvancedChart(props);
        ReactActual.useImperativeHandle(ref, () => ({
          focusTime: mockFocusTime,
          pulseTradeMarker: mockPulseTradeMarker,
        }));
        const { View, Text } = jest.requireActual('react-native');
        return (
          <View testID="advanced-chart">
            <Text>advanced</Text>
          </View>
        );
      },
    ),
  };
});

// Render a lightweight stand-in for the legacy fallback chart.
jest.mock('./TraderPriceChart', () => ({
  __esModule: true,
  default: () => {
    const { View, Text } = jest.requireActual('react-native');
    return (
      <View testID="legacy-chart">
        <Text>legacy</Text>
      </View>
    );
  },
}));

jest.mock('../../../../UI/Charts/AdvancedChart/useOHLCVChart');

const mockUsePerpsAdvancedChartAdapter = jest.fn();
jest.mock('../../../../UI/Perps/hooks/usePerpsAdvancedChartAdapter', () => ({
  ...jest.requireActual(
    '../../../../UI/Perps/hooks/usePerpsAdvancedChartAdapter',
  ),
  usePerpsAdvancedChartAdapter: (...args: unknown[]) =>
    mockUsePerpsAdvancedChartAdapter(...args),
}));

jest.mock('../../../../../util/theme', () => {
  const actual = jest.requireActual('../../../../../util/theme');
  return {
    ...actual,
    useTheme: jest.fn(() => actual.mockTheme),
  };
});

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => 'USD'),
}));

const mockUseOHLCVChart = useOHLCVChart as jest.MockedFunction<
  typeof useOHLCVChart
>;

const DAY_MS = 24 * 60 * 60 * 1000;

const makeBars = (n: number): OHLCVBar[] =>
  Array.from({ length: n }, (_, i) => ({
    time: 1_700_000_000_000 + i * 60_000,
    open: 100 + i,
    high: 101 + i,
    low: 99 + i,
    close: 100 + i,
    volume: 10,
  }));

const makeDailyBars = (n: number): OHLCVBar[] =>
  Array.from({ length: n }, (_, i) => ({
    time: 1_700_000_000_000 + i * DAY_MS,
    open: 100 + i,
    high: 101 + i,
    low: 99 + i,
    close: 100 + i,
    volume: 10,
  }));

const setOHLCV = (bars: OHLCVBar[], overrides = {}) =>
  mockUseOHLCVChart.mockReturnValue({
    ohlcvData: bars,
    isLoading: false,
    error: null,
    hasMore: false,
    nextCursor: null,
    hasEmptyData: false,
    ...overrides,
  } as unknown as ReturnType<typeof useOHLCVChart>);

const defaultProps = {
  assetId: 'eip155:1/erc20:0xtoken',
  activeTimePeriod: '1D' as const,
  chartType: ChartType.Line,
  trades: [] as Trade[],
  historicalPrices: [] as TokenPrice[],
  priceDiff: 0,
  isPricesLoading: false,
  onChartIndexChange: jest.fn(),
};

const setPerpAdapter = (bars: OHLCVBar[], overrides = {}) => {
  mockUsePerpsAdvancedChartAdapter.mockReturnValue({
    ohlcvData: bars,
    realtimeBar: undefined,
    latestBar: bars.at(-1),
    ohlcvSeriesKey: 'BTC|15m',
    visibleFromMs: undefined,
    visibleToMs: undefined,
    isLoading: false,
    handleFetchOlderBarsRequest: jest.fn().mockResolvedValue({
      requestId: 'test',
      seriesGeneration: 0,
      bars: [],
      noData: true,
    }),
    ...overrides,
  });
};

describe('getRecommendedTradeFocusPeriod', () => {
  const now = 1_700_000_000_000;
  const ago = (ms: number) => now - ms;

  it('recommends the smallest period that can contain a recent spot trade', () => {
    expect(
      getRecommendedTradeFocusPeriod(ago(30 * 60 * 1000), false, now),
    ).toBe('1H');
    expect(
      getRecommendedTradeFocusPeriod(ago(12 * 60 * 60 * 1000), false, now),
    ).toBe('1D');
    expect(getRecommendedTradeFocusPeriod(ago(3 * DAY_MS), false, now)).toBe(
      '1W',
    );
    expect(getRecommendedTradeFocusPeriod(ago(30 * DAY_MS), false, now)).toBe(
      '1M',
    );
    expect(getRecommendedTradeFocusPeriod(ago(31 * DAY_MS), false, now)).toBe(
      'All',
    );
  });

  it('recommends the smallest period that can contain a recent perp trade', () => {
    expect(getRecommendedTradeFocusPeriod(ago(30 * 60 * 1000), true, now)).toBe(
      '1H',
    );
    expect(
      getRecommendedTradeFocusPeriod(ago(12 * 60 * 60 * 1000), true, now),
    ).toBe('1D');
    expect(getRecommendedTradeFocusPeriod(ago(30 * DAY_MS), true, now)).toBe(
      '1M',
    );
    expect(getRecommendedTradeFocusPeriod(ago(31 * DAY_MS), true, now)).toBe(
      'All',
    );
  });
});

describe('getPerpTradeFocusSpanMs', () => {
  it('uses the one-month interval for CandlePeriod.OneMonth', () => {
    const monthMs = 30 * 24 * 60 * 60_000;
    expect(getPerpTradeFocusSpanMs(CandlePeriod.OneMonth, 30)).toBe(
      monthMs * 30,
    );
  });
});

describe('mapTradesToAdvancedMarkers', () => {
  const baseTrade = (overrides: Partial<Trade> = {}): Trade => ({
    intent: 'enter',
    direction: 'buy',
    tokenAmount: 2,
    usdCost: 200,
    timestamp: 1_700_000_000, // seconds
    transactionHash: '0xabc',
    ...overrides,
  });

  it('maps a trade to a marker without a price (WebView snaps to line)', () => {
    const markers = mapTradesToAdvancedMarkers([baseTrade()]);

    expect(markers).toEqual([
      {
        time: 1_700_000_000_000, // normalized seconds → ms
        intent: 'enter',
        id: '0xabc',
      },
    ]);
  });

  it('keeps millisecond timestamps unchanged', () => {
    const markers = mapTradesToAdvancedMarkers([
      baseTrade({ timestamp: 1_700_000_000_000 }),
    ]);

    expect(markers[0].time).toBe(1_700_000_000_000);
  });

  it('maps sells with correct intent and id', () => {
    const markers = mapTradesToAdvancedMarkers([
      baseTrade({
        intent: 'exit',
        direction: 'sell',
        usdCost: -840.64,
        tokenAmount: -2,
        transactionHash: '0xsell',
      }),
    ]);

    expect(markers).toEqual([
      {
        time: 1_700_000_000_000,
        intent: 'exit',
        id: '0xsell',
      },
    ]);
  });

  it('drops trades with a zero token amount', () => {
    const markers = mapTradesToAdvancedMarkers([
      baseTrade({ tokenAmount: 0, transactionHash: '0xzero' }),
      baseTrade({ transactionHash: '0xok' }),
    ]);

    expect(markers).toHaveLength(1);
    expect(markers[0].id).toBe('0xok');
  });
});

describe('TraderAdvancedChart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseOHLCVChart.mockReset();
    mockUsePerpsAdvancedChartAdapter.mockReset();
    setPerpAdapter(makeBars(20));
  });

  it('renders the AdvancedChart with mapped trade markers when OHLCV data is sufficient', () => {
    setOHLCV(makeBars(20));

    const trades: Trade[] = [
      {
        intent: 'enter',
        direction: 'buy',
        tokenAmount: 1,
        usdCost: 100,
        timestamp: 1_700_000_060,
        transactionHash: '0xbuy',
      },
    ];

    const { getByTestId, queryByTestId } = render(
      <TraderAdvancedChart {...defaultProps} trades={trades} />,
    );

    expect(getByTestId('advanced-chart')).toBeTruthy();
    expect(queryByTestId('legacy-chart')).toBeNull();
    expect(mockAdvancedChart).toHaveBeenCalledWith(
      expect.objectContaining({
        tradeMarkers: [
          {
            time: 1_700_000_060_000,
            // No price — the WebView snaps the marker onto the line itself.
            intent: 'enter',
            id: '0xbuy',
          },
        ],
      }),
    );
  });

  it('opts into SLB-scoped chart behavior via slbMode', () => {
    setOHLCV(makeBars(20));

    render(<TraderAdvancedChart {...defaultProps} />);

    // Gates the SocialLeaderboard-only WebView paths (centering, back-fill
    // pagination, full-window focus guard) so they never affect other consumers.
    expect(mockAdvancedChart).toHaveBeenCalledWith(
      expect.objectContaining({ slbMode: true }),
    );
  });

  it('passes ALL trades as markers and frames a trade older than the loaded page when more history can be paginated', () => {
    const bars = makeBars(20); // window: 1_700_000_000_000 .. +19*60_000
    setOHLCV(bars, { hasMore: true, nextCursor: 'next' });
    const oldTradeTime = bars[0].time - 60_000_000;

    const trades: Trade[] = [
      {
        intent: 'enter',
        direction: 'buy',
        tokenAmount: 1,
        usdCost: 100,
        timestamp: bars[5].time / 1000, // inside the window (seconds)
        transactionHash: '0xinside',
      },
      {
        intent: 'exit',
        direction: 'sell',
        tokenAmount: 1,
        usdCost: 100,
        timestamp: oldTradeTime / 1000, // long before the loaded page
        transactionHash: '0xoutside',
      },
    ];

    render(<TraderAdvancedChart {...defaultProps} trades={trades} />);

    const lastCall = mockAdvancedChart.mock.calls.at(-1)?.[0] as {
      tradeMarkers: { id: string }[];
      visibleFromMs: number;
      visibleToMs: number;
    };
    // Both markers are sent — the WebView decides which to draw as candles load.
    expect(lastCall.tradeMarkers.map((m) => m.id).sort()).toEqual([
      '0xinside',
      '0xoutside',
    ]);
    // The viewport frames the first→last trade (with padding). Because more
    // history can be paginated, `from` is allowed below the loaded page so the
    // WebView datafeed pages the older trade in; `to` clamps to the last loaded
    // candle so there is no blank gap past the available data.
    const span = bars[5].time - oldTradeTime;
    const pad = Math.max(span, DAY_MS * 0.5) * 0.2;
    expect(lastCall.visibleFromMs).toBe(oldTradeTime - pad);
    expect(lastCall.visibleToMs).toBe(bars[bars.length - 1].time);
  });

  it('frames the first→last loaded trade with padding instead of a fixed period-wide window', () => {
    const bars = makeDailyBars(12);
    setOHLCV(bars);

    const firstTradeTime = bars[2].time;
    const lastTradeTime = bars[5].time;
    const trades: Trade[] = [
      {
        intent: 'enter',
        direction: 'buy',
        tokenAmount: 1,
        usdCost: 100,
        timestamp: firstTradeTime / 1000,
        transactionHash: '0xbuy',
      },
      {
        intent: 'exit',
        direction: 'sell',
        tokenAmount: 1,
        usdCost: 110,
        timestamp: lastTradeTime / 1000,
        transactionHash: '0xsell',
      },
    ];

    render(
      <TraderAdvancedChart
        {...defaultProps}
        activeTimePeriod="1W"
        trades={trades}
      />,
    );

    const lastCall = mockAdvancedChart.mock.calls.at(-1)?.[0] as {
      visibleFromMs: number;
      visibleToMs: number;
    };
    // Window is sized to the trades + padding (not the full 1W `durationMs`),
    // so a short position fills the screen without a blank gap.
    const span = lastTradeTime - firstTradeTime;
    const pad = Math.max(span, 7 * DAY_MS * 0.5) * 0.2;
    expect(lastCall.visibleFromMs).toBe(firstTradeTime - pad);
    expect(lastCall.visibleToMs).toBe(lastTradeTime + pad);
  });

  it('clamps the viewport to the oldest loaded candle when no older history can be paginated (no blank gap)', () => {
    const bars = makeDailyBars(12);
    // hasMore: false — the asset has no more history to page in.
    setOHLCV(bars, { hasMore: false, nextCursor: null });

    // A trade at the very first loaded candle: padding would push the framed
    // `from` before the data, which previously left a blank gap on the left.
    const tradeTime = bars[0].time;
    const trades: Trade[] = [
      {
        intent: 'enter',
        direction: 'buy',
        tokenAmount: 1,
        usdCost: 100,
        timestamp: tradeTime / 1000,
        transactionHash: '0xopen',
      },
    ];

    render(
      <TraderAdvancedChart
        {...defaultProps}
        activeTimePeriod="1W"
        trades={trades}
      />,
    );

    const lastCall = mockAdvancedChart.mock.calls.at(-1)?.[0] as {
      visibleFromMs: number;
      visibleToMs: number;
    };
    // No blank gap: the viewport starts no earlier than the oldest loaded bar.
    expect(lastCall.visibleFromMs).toBe(bars[0].time);
    expect(lastCall.visibleFromMs).toBeGreaterThanOrEqual(bars[0].time);
  });

  it('falls back to the legacy chart when OHLCV coverage is below threshold', () => {
    setOHLCV(makeBars(2));

    const { getByTestId, queryByTestId } = render(
      <TraderAdvancedChart {...defaultProps} />,
    );

    expect(getByTestId('legacy-chart')).toBeTruthy();
    expect(queryByTestId('advanced-chart')).toBeNull();
  });

  it('falls back to the legacy chart when the OHLCV feed errors', () => {
    setOHLCV(makeBars(20), { error: 'boom' });

    const { getByTestId } = render(<TraderAdvancedChart {...defaultProps} />);

    expect(getByTestId('legacy-chart')).toBeTruthy();
  });

  it('renders a perp position from the perps stream adapter, ignoring spot OHLCV', () => {
    setOHLCV([]);
    const perpBars = makeBars(20);

    const { getByTestId, queryByTestId } = render(
      <TraderAdvancedChart
        {...defaultProps}
        assetId={undefined}
        isPerp
        perpSymbol="BTC"
        selectedCandlePeriod={CandlePeriod.FifteenMinutes}
        chartType={ChartType.Candles}
        historicalPrices={[]}
      />,
    );

    expect(getByTestId('advanced-chart')).toBeTruthy();
    expect(queryByTestId('legacy-chart')).toBeNull();

    const props = mockAdvancedChart.mock.calls.at(-1)?.[0] as {
      ohlcvData: OHLCVBar[];
      chartType: ChartType;
      showVolume: boolean;
    };
    expect(props.ohlcvData).toHaveLength(20);
    expect(props.chartType).toBe(ChartType.Candles);
    expect(props.showVolume).toBe(true);
    expect(mockUsePerpsAdvancedChartAdapter).toHaveBeenCalledWith(
      expect.objectContaining({
        symbol: 'BTC',
        interval: CandlePeriod.FifteenMinutes,
      }),
    );
    expect(perpBars).toBeDefined();
  });

  it('uses the adapter candle-period viewport for perps instead of trade-framing', () => {
    setOHLCV([]);
    const intervalMs = 15 * 60 * 1000;
    const bars = Array.from({ length: 100 }, (_, i) => ({
      time: 1_700_000_000_000 + i * intervalMs,
      open: 100 + i,
      high: 101 + i,
      low: 99 + i,
      close: 100 + i,
      volume: 10,
    }));
    const visibleFromMs = bars[bars.length - 1].time - 30 * intervalMs;
    const visibleToMs = bars[bars.length - 1].time;
    setPerpAdapter(bars, { visibleFromMs, visibleToMs });

    render(
      <TraderAdvancedChart
        {...defaultProps}
        assetId={undefined}
        isPerp
        perpSymbol="BTC"
        selectedCandlePeriod={CandlePeriod.FifteenMinutes}
        chartType={ChartType.Candles}
        historicalPrices={[]}
        trades={[
          {
            intent: 'enter',
            direction: 'buy',
            tokenAmount: 1,
            usdCost: 100,
            timestamp: bars[0].time / 1000,
            transactionHash: '0xold',
          },
        ]}
      />,
    );

    const chartProps = mockAdvancedChart.mock.calls.at(-1)?.[0] as {
      visibleFromMs: number;
      visibleToMs: number;
    };
    expect(chartProps.visibleFromMs).toBe(visibleFromMs);
    expect(chartProps.visibleToMs).toBe(visibleToMs);
    expect(chartProps.visibleFromMs).toBeGreaterThan(bars[0].time);
  });

  it('reports perp header metrics from the visible candle window', () => {
    setOHLCV([]);
    const bars = Array.from({ length: 50 }, (_, i) => ({
      time: 1_700_000_000_000 + i * 15 * 60 * 1000,
      open: 100,
      high: 101,
      low: 99,
      close: i < 40 ? 100 : 110,
      volume: 10,
    }));
    const visibleFromMs = bars[39].time;
    const visibleToMs = bars[bars.length - 1].time;
    const mockOnPerpMetricsChange = jest.fn();
    setPerpAdapter(bars, {
      visibleFromMs,
      visibleToMs,
      latestBar: bars.at(-1),
    });

    render(
      <TraderAdvancedChart
        {...defaultProps}
        assetId={undefined}
        isPerp
        perpSymbol="BTC"
        selectedCandlePeriod={CandlePeriod.FifteenMinutes}
        chartType={ChartType.Candles}
        historicalPrices={[]}
        onPerpMetricsChange={mockOnPerpMetricsChange}
      />,
    );

    expect(mockOnPerpMetricsChange).toHaveBeenCalledWith({
      percentChange: 10,
      currentPrice: 110,
    });
  });

  it('paginates and focuses an older perp trade after chart layout settles', async () => {
    setOHLCV([]);
    const intervalMs = 15 * 60 * 1000;
    const recentBars = Array.from({ length: 20 }, (_, index) => ({
      time: 1_700_000_000_000 + (index + 10) * intervalMs,
      open: 100,
      high: 101,
      low: 99,
      close: 100,
      volume: 10,
    }));
    const oldTradeTime = recentBars[0].time - intervalMs;
    const olderBar = {
      time: oldTradeTime,
      open: 90,
      high: 91,
      low: 89,
      close: 90,
      volume: 10,
    };
    const expandedBars = [olderBar, ...recentBars];

    const mockFetchOlder = jest.fn().mockResolvedValue({
      requestId: 'focus-older',
      seriesGeneration: 1,
      bars: [olderBar],
      noData: false,
    });

    setPerpAdapter(recentBars, {
      handleFetchOlderBarsRequest: mockFetchOlder,
    });

    const focusRequest = {
      id: '0xold',
      timestamp: oldTradeTime / 1000,
      nonce: 1,
      spanMs: getPerpTradeFocusSpanMs(CandlePeriod.FifteenMinutes),
    };

    const chartProps = {
      ...defaultProps,
      assetId: undefined,
      isPerp: true,
      perpSymbol: 'BTC',
      selectedCandlePeriod: CandlePeriod.FifteenMinutes,
      chartType: ChartType.Candles,
      historicalPrices: [] as TokenPrice[],
      trades: [
        {
          intent: 'enter' as const,
          direction: 'buy' as const,
          tokenAmount: 1,
          usdCost: 100,
          timestamp: oldTradeTime / 1000,
          transactionHash: '0xold',
        },
      ],
      focusRequest,
    };

    const { rerender } = render(<TraderAdvancedChart {...chartProps} />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockFetchOlder).toHaveBeenCalled();
    expect(mockFocusTime).not.toHaveBeenCalled();

    setPerpAdapter(expandedBars, {
      handleFetchOlderBarsRequest: mockFetchOlder,
    });
    rerender(<TraderAdvancedChart {...chartProps} />);

    const lastChartProps = mockAdvancedChart.mock.calls.at(-1)?.[0] as {
      onChartLayoutSettled?: () => void;
    };
    expect(lastChartProps.onChartLayoutSettled).toBeDefined();

    act(() => {
      lastChartProps.onChartLayoutSettled?.();
    });

    expect(mockFocusTime).toHaveBeenCalledWith(oldTradeTime, {
      spanMs: getPerpTradeFocusSpanMs(CandlePeriod.FifteenMinutes),
    });
    expect(mockPulseTradeMarker).toHaveBeenCalledWith('0xold');
  });

  it('does not drop a newer older-trade focus while pagination is in flight', async () => {
    setOHLCV([]);
    const intervalMs = 15 * 60 * 1000;
    const recentBars = Array.from({ length: 20 }, (_, index) => ({
      time: 1_700_000_000_000 + (index + 10) * intervalMs,
      open: 100,
      high: 101,
      low: 99,
      close: 100,
      volume: 10,
    }));
    const firstTradeTime = recentBars[0].time - intervalMs;
    const secondTradeTime = firstTradeTime - intervalMs;
    const olderBars = [
      {
        time: secondTradeTime,
        open: 80,
        high: 81,
        low: 79,
        close: 80,
        volume: 10,
      },
      {
        time: firstTradeTime,
        open: 90,
        high: 91,
        low: 89,
        close: 90,
        volume: 10,
      },
    ];

    let resolveFetch: (value: {
      requestId: string;
      seriesGeneration: number;
      bars: typeof olderBars;
      noData: boolean;
    }) => void = () => undefined;
    const mockFetchOlder = jest.fn(
      () =>
        new Promise<Parameters<typeof resolveFetch>[0]>((resolve) => {
          resolveFetch = resolve;
        }),
    );

    setPerpAdapter(recentBars, {
      handleFetchOlderBarsRequest: mockFetchOlder,
    });

    const chartProps = {
      ...defaultProps,
      assetId: undefined,
      isPerp: true,
      perpSymbol: 'BTC',
      selectedCandlePeriod: CandlePeriod.FifteenMinutes,
      chartType: ChartType.Candles,
      historicalPrices: [] as TokenPrice[],
      trades: [
        {
          intent: 'enter' as const,
          direction: 'buy' as const,
          tokenAmount: 1,
          usdCost: 100,
          timestamp: firstTradeTime / 1000,
          transactionHash: '0xfirst',
        },
        {
          intent: 'enter' as const,
          direction: 'buy' as const,
          tokenAmount: 1,
          usdCost: 100,
          timestamp: secondTradeTime / 1000,
          transactionHash: '0xsecond',
        },
      ],
    };

    const { rerender } = render(
      <TraderAdvancedChart
        {...chartProps}
        focusRequest={{
          id: '0xfirst',
          timestamp: firstTradeTime / 1000,
          nonce: 1,
          spanMs: getPerpTradeFocusSpanMs(CandlePeriod.FifteenMinutes),
        }}
      />,
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(mockFetchOlder).toHaveBeenCalledTimes(1);

    rerender(
      <TraderAdvancedChart
        {...chartProps}
        focusRequest={{
          id: '0xsecond',
          timestamp: secondTradeTime / 1000,
          nonce: 2,
          spanMs: getPerpTradeFocusSpanMs(CandlePeriod.FifteenMinutes),
        }}
      />,
    );

    expect(mockFocusTime).not.toHaveBeenCalled();

    await act(async () => {
      resolveFetch({
        requestId: 'focus-older',
        seriesGeneration: 1,
        bars: olderBars,
        noData: false,
      });
    });

    setPerpAdapter([...olderBars, ...recentBars], {
      handleFetchOlderBarsRequest: mockFetchOlder,
    });
    rerender(
      <TraderAdvancedChart
        {...chartProps}
        focusRequest={{
          id: '0xsecond',
          timestamp: secondTradeTime / 1000,
          nonce: 2,
          spanMs: getPerpTradeFocusSpanMs(CandlePeriod.FifteenMinutes),
        }}
      />,
    );

    expect(mockFocusTime).not.toHaveBeenCalled();

    const lastChartProps = mockAdvancedChart.mock.calls.at(-1)?.[0] as {
      onChartLayoutSettled?: () => void;
    };
    act(() => {
      lastChartProps.onChartLayoutSettled?.();
    });

    expect(mockFocusTime).toHaveBeenCalledWith(secondTradeTime, {
      spanMs: getPerpTradeFocusSpanMs(CandlePeriod.FifteenMinutes),
    });
    expect(mockPulseTradeMarker).toHaveBeenCalledWith('0xsecond');
  });

  it('falls back to the legacy chart for a perp with insufficient adapter data', () => {
    setOHLCV([]);
    setPerpAdapter(makeBars(2));

    const { getByTestId, queryByTestId } = render(
      <TraderAdvancedChart
        {...defaultProps}
        assetId={undefined}
        isPerp
        perpSymbol="BTC"
        selectedCandlePeriod={CandlePeriod.FifteenMinutes}
        chartType={ChartType.Candles}
        historicalPrices={[]}
      />,
    );

    expect(getByTestId('legacy-chart')).toBeTruthy();
    expect(queryByTestId('advanced-chart')).toBeNull();
  });

  it('centers and pulses a trade in the current period when its data is loaded', () => {
    setOHLCV(makeBars(20));

    const { rerender } = render(<TraderAdvancedChart {...defaultProps} />);
    expect(mockFocusTime).not.toHaveBeenCalled();
    expect(mockPulseTradeMarker).not.toHaveBeenCalled();

    rerender(
      <TraderAdvancedChart
        {...defaultProps}
        focusRequest={{
          id: '0xbuy',
          timestamp: 1_700_000_060,
          nonce: 1,
          spanMs: getTradeFocusSpanMs('1D'),
        }}
      />,
    );
    expect(mockFocusTime).toHaveBeenCalledWith(1_700_000_060_000, {
      spanMs: getTradeFocusSpanMs('1D'),
    });
    expect(mockPulseTradeMarker).toHaveBeenCalledWith('0xbuy');

    // Re-tapping (new nonce) re-centers and re-pulses, even with the same trade.
    rerender(
      <TraderAdvancedChart
        {...defaultProps}
        focusRequest={{
          id: '0xbuy',
          timestamp: 1_700_000_060,
          nonce: 2,
          spanMs: getTradeFocusSpanMs('1D'),
        }}
      />,
    );
    expect(mockFocusTime).toHaveBeenCalledTimes(2);
    expect(mockPulseTradeMarker).toHaveBeenCalledTimes(2);
  });

  it('still focuses a pending trade after the active period changes (not pinned to the tap-time period)', () => {
    // A focus request arrives while the chart is still loading, so it can't be
    // handled yet. The auto-period selection then changes the active period
    // (e.g. widening) before the request resolves. The request must NOT be pinned
    // to the period that was active at tap time — it should resolve against the
    // new active period once its data is ready. Regression for "focus stalls
    // after hook period change".
    setOHLCV(makeBars(20), { isLoading: true });
    const { rerender } = render(
      <TraderAdvancedChart
        {...defaultProps}
        activeTimePeriod="1D"
        focusRequest={{
          id: '0xbuy',
          timestamp: 1_700_000_060,
          nonce: 1,
          spanMs: getTradeFocusSpanMs('1D'),
        }}
      />,
    );
    expect(mockFocusTime).not.toHaveBeenCalled();

    // Data settles and the active period has since widened to 1W (same request).
    setOHLCV(makeBars(20), { isLoading: false });
    rerender(
      <TraderAdvancedChart
        {...defaultProps}
        activeTimePeriod="1W"
        focusRequest={{
          id: '0xbuy',
          timestamp: 1_700_000_060,
          nonce: 1,
          spanMs: getTradeFocusSpanMs('1W'),
        }}
      />,
    );

    expect(mockFocusTime).toHaveBeenCalledWith(1_700_000_060_000, {
      spanMs: getTradeFocusSpanMs('1W'),
    });
    expect(mockPulseTradeMarker).toHaveBeenCalledWith('0xbuy');
  });

  it('does not focus when the selected widest period still lacks the trade time', () => {
    const bars = makeBars(20);
    setOHLCV(bars);
    const mockRequestTimePeriod = jest.fn();

    render(
      <TraderAdvancedChart
        {...defaultProps}
        activeTimePeriod="All"
        focusRequest={{
          id: '0xold',
          timestamp: bars[0].time - DAY_MS,
          nonce: 1,
          spanMs: getTradeFocusSpanMs('All'),
        }}
        onRequestTimePeriod={mockRequestTimePeriod}
      />,
    );

    expect(mockFocusTime).not.toHaveBeenCalled();
    expect(mockPulseTradeMarker).not.toHaveBeenCalled();
    expect(mockRequestTimePeriod).not.toHaveBeenCalled();
  });

  it('requests the next wider period when loaded bars start after the focused trade', () => {
    const bars = makeBars(20);
    setOHLCV(bars);
    const mockRequestTimePeriod = jest.fn();

    render(
      <TraderAdvancedChart
        {...defaultProps}
        activeTimePeriod="1M"
        focusRequest={{
          id: '0xold',
          timestamp: bars[0].time - DAY_MS,
          nonce: 1,
          spanMs: getTradeFocusSpanMs('1M'),
        }}
        onRequestTimePeriod={mockRequestTimePeriod}
      />,
    );

    expect(mockFocusTime).not.toHaveBeenCalled();
    expect(mockPulseTradeMarker).not.toHaveBeenCalled();
    expect(mockRequestTimePeriod).toHaveBeenCalledWith('All');
  });

  it('auto-requests the first loaded spot period that contains every trade', () => {
    const oldTradeTime = 1_700_000_000_000;
    const recentBars = makeBars(20).map((bar) => ({
      ...bar,
      time: oldTradeTime + 30 * DAY_MS + (bar.time - 1_700_000_000_000),
    }));
    const coveringBars = makeDailyBars(40);
    let call = 0;
    mockUseOHLCVChart.mockImplementation(() => {
      call += 1;
      const bars = call === 3 ? coveringBars : recentBars;
      return {
        ohlcvData: bars,
        isLoading: false,
        error: null,
        hasMore: false,
        nextCursor: null,
        hasEmptyData: false,
      } as unknown as ReturnType<typeof useOHLCVChart>;
    });
    const mockRequestTimePeriod = jest.fn();

    render(
      <TraderAdvancedChart
        {...defaultProps}
        activeTimePeriod="1H"
        shouldAutoRequestTimePeriod
        trades={[
          {
            intent: 'enter',
            direction: 'buy',
            tokenAmount: 1,
            usdCost: 100,
            timestamp: oldTradeTime / 1000,
            transactionHash: '0xold',
          },
        ]}
        onRequestTimePeriod={mockRequestTimePeriod}
      />,
    );

    expect(mockRequestTimePeriod).toHaveBeenCalledWith('1W');
  });

  describe('stale-while-revalidate interval switching', () => {
    const lastProps = () =>
      mockAdvancedChart.mock.calls.at(-1)?.[0] as {
        webViewInstanceKey: string;
        ohlcvSeriesKey: string;
        isLoading: boolean;
        onSkeletonHidden: () => void;
      };

    it('keeps a stable webViewInstanceKey across interval changes (no WebView remount)', () => {
      setOHLCV(makeBars(20));

      const { rerender } = render(
        <TraderAdvancedChart {...defaultProps} activeTimePeriod="1D" />,
      );
      const first = lastProps();

      rerender(<TraderAdvancedChart {...defaultProps} activeTimePeriod="1W" />);
      const second = lastProps();

      // The instance key (which drives the WebView React key) is unchanged, so
      // the WebView is NOT remounted on an interval tap...
      expect(second.webViewInstanceKey).toBe(first.webViewInstanceKey);
      expect(first.webViewInstanceKey).toBe('eip155:1/erc20:0xtoken|usd');
      // ...while the series key DOES change, triggering an in-place hot reload.
      expect(second.ohlcvSeriesKey).not.toBe(first.ohlcvSeriesKey);
    });

    it('uses a perp instance key when there is no assetId', () => {
      setOHLCV([]);
      setPerpAdapter(makeBars(20));

      render(
        <TraderAdvancedChart
          {...defaultProps}
          assetId={undefined}
          isPerp
          perpSymbol="BTC"
          selectedCandlePeriod={CandlePeriod.FifteenMinutes}
          chartType={ChartType.Candles}
          historicalPrices={[]}
        />,
      );

      expect(lastProps().webViewInstanceKey).toBe('perp|BTC|usd');
    });

    it('shows the skeleton on first load, then suppresses it on a background refetch', () => {
      // First load still loading → skeleton is allowed.
      setOHLCV(makeBars(20), { isLoading: true });
      const { rerender } = render(<TraderAdvancedChart {...defaultProps} />);
      expect(lastProps().isLoading).toBe(true);

      // Chart paints and reports it is revealed.
      act(() => lastProps().onSkeletonHidden());

      // A later interval tap refetches (loading again), but the chart has been
      // revealed, so the skeleton stays hidden (stale-while-revalidate).
      setOHLCV(makeBars(20), { isLoading: true });
      rerender(<TraderAdvancedChart {...defaultProps} activeTimePeriod="1W" />);
      expect(lastProps().isLoading).toBe(false);
    });

    it('pre-fetches every period up front so an interval switch needs no network', () => {
      setOHLCV(makeBars(20));
      render(<TraderAdvancedChart {...defaultProps} activeTimePeriod="1D" />);

      // One warm hook per period (1H, 1D, 1W, 1M, All) — five distinct configs,
      // all keyed to the real spot asset id (deduped across re-renders).
      const spotConfigs = new Set(
        mockUseOHLCVChart.mock.calls
          .map(([opts]) => opts)
          .filter((opts) => opts.assetId === defaultProps.assetId)
          .map((opts) => `${opts.timePeriod}|${opts.interval ?? ''}`),
      );
      expect(spotConfigs.size).toBe(5);
    });

    it('does not fetch spot OHLCV for a perp position (data comes from the adapter)', () => {
      setOHLCV([]);
      setPerpAdapter(makeBars(20));

      render(
        <TraderAdvancedChart
          {...defaultProps}
          assetId={undefined}
          isPerp
          perpSymbol="BTC"
          selectedCandlePeriod={CandlePeriod.FifteenMinutes}
          chartType={ChartType.Candles}
          historicalPrices={[]}
        />,
      );

      const spotFetches = mockUseOHLCVChart.mock.calls
        .map(([opts]) => opts)
        .filter((opts) => opts.assetId !== '');
      expect(spotFetches).toHaveLength(0);
      expect(mockUsePerpsAdvancedChartAdapter).toHaveBeenCalled();
    });
  });
});
