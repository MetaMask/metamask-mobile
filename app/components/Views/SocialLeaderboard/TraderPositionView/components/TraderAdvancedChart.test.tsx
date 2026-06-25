import React from 'react';
import { render, act } from '@testing-library/react-native';
import type { Trade } from '@metamask/social-controllers';
import type { TokenPrice } from '../../../../hooks/useTokenHistoricalPrices';
import { useOHLCVChart } from '../../../../UI/Charts/AdvancedChart/useOHLCVChart';
import type { OHLCVBar } from '../../../../UI/Charts/AdvancedChart/AdvancedChart.types';
import TraderAdvancedChart, {
  getRecommendedTradeFocusPeriod,
  getTradeFocusSpanMs,
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

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => 'USD'),
}));

const mockUseOHLCVChart = useOHLCVChart as jest.MockedFunction<
  typeof useOHLCVChart
>;

const makeBars = (n: number): OHLCVBar[] =>
  Array.from({ length: n }, (_, i) => ({
    time: 1_700_000_000_000 + i * 60_000,
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
  trades: [] as Trade[],
  historicalPrices: [] as TokenPrice[],
  priceDiff: 0,
  isPricesLoading: false,
  onChartIndexChange: jest.fn(),
};

const DAY_MS = 24 * 60 * 60 * 1000;

describe('getRecommendedTradeFocusPeriod', () => {
  const now = 1_700_000_000_000;
  const ago = (ms: number) => now - ms;

  it('uses only 1M and All for spot trade focus', () => {
    expect(
      getRecommendedTradeFocusPeriod(ago(30 * 60 * 1000), false, now),
    ).toBe('1M');
    expect(
      getRecommendedTradeFocusPeriod(ago(12 * 60 * 60 * 1000), false, now),
    ).toBe('1M');
    expect(getRecommendedTradeFocusPeriod(ago(3 * DAY_MS), false, now)).toBe(
      '1M',
    );
    expect(getRecommendedTradeFocusPeriod(ago(30 * DAY_MS), false, now)).toBe(
      '1M',
    );
    expect(getRecommendedTradeFocusPeriod(ago(31 * DAY_MS), false, now)).toBe(
      'All',
    );
  });

  it('uses only 1M and All for perp trade focus', () => {
    expect(getRecommendedTradeFocusPeriod(ago(30 * 60 * 1000), true, now)).toBe(
      '1M',
    );
    expect(getRecommendedTradeFocusPeriod(ago(30 * DAY_MS), true, now)).toBe(
      '1M',
    );
    expect(getRecommendedTradeFocusPeriod(ago(31 * DAY_MS), true, now)).toBe(
      'All',
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

  it('passes ALL trades as markers, even ones outside the loaded window (draw-on-pan)', () => {
    const bars = makeBars(20); // window: 1_700_000_000_000 .. +19*60_000
    setOHLCV(bars);

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
        timestamp: (bars[0].time - 60_000_000) / 1000, // long before the window
        transactionHash: '0xoutside',
      },
    ];

    render(<TraderAdvancedChart {...defaultProps} trades={trades} />);

    const lastCall = mockAdvancedChart.mock.calls.at(-1)?.[0] as {
      tradeMarkers: { id: string }[];
      visibleFromMs: number;
    };
    // Both markers are sent — the WebView decides which to draw as candles load.
    expect(lastCall.tradeMarkers.map((m) => m.id).sort()).toEqual([
      '0xinside',
      '0xoutside',
    ]);
    // The out-of-window trade must NOT pull the initial viewport before the data.
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

  it('renders a perp position from historicalPrices, ignoring the spot OHLCV feed', () => {
    // Spot feed empty: the perp path must build its series from historicalPrices.
    setOHLCV([]);
    const historicalPrices: TokenPrice[] = Array.from(
      { length: 10 },
      (_, i) => [String(1_700_000_000_000 + i * 60_000), 100 + i],
    );

    const { getByTestId, queryByTestId } = render(
      <TraderAdvancedChart
        {...defaultProps}
        assetId={undefined}
        isPerp
        historicalPrices={historicalPrices}
      />,
    );

    expect(getByTestId('advanced-chart')).toBeTruthy();
    expect(queryByTestId('legacy-chart')).toBeNull();

    const props = mockAdvancedChart.mock.calls.at(-1)?.[0] as {
      ohlcvData: { time: number; open: number; close: number }[];
    };
    expect(props.ohlcvData).toHaveLength(10);
    // Each line point becomes a flat OHLC bar (open === close).
    expect(props.ohlcvData[0]).toMatchObject({
      time: 1_700_000_000_000,
      open: 100,
      close: 100,
    });
  });

  it('falls back to the legacy chart for a perp with insufficient price history', () => {
    setOHLCV([]);

    const { getByTestId, queryByTestId } = render(
      <TraderAdvancedChart
        {...defaultProps}
        assetId={undefined}
        isPerp
        historicalPrices={[
          ['1', 1],
          ['2', 2],
        ]}
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
          timePeriod: '1D',
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
          timePeriod: '1D',
          spanMs: getTradeFocusSpanMs('1D'),
        }}
      />,
    );
    expect(mockFocusTime).toHaveBeenCalledTimes(2);
    expect(mockPulseTradeMarker).toHaveBeenCalledTimes(2);
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
          timePeriod: 'All',
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
          timePeriod: '1M',
          spanMs: getTradeFocusSpanMs('1M'),
        }}
        onRequestTimePeriod={mockRequestTimePeriod}
      />,
    );

    expect(mockFocusTime).not.toHaveBeenCalled();
    expect(mockPulseTradeMarker).not.toHaveBeenCalled();
    expect(mockRequestTimePeriod).toHaveBeenCalledWith('All');
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
      const historicalPrices: TokenPrice[] = Array.from(
        { length: 10 },
        (_, i) => [String(1_700_000_000_000 + i * 60_000), 100 + i],
      );

      render(
        <TraderAdvancedChart
          {...defaultProps}
          assetId={undefined}
          isPerp
          historicalPrices={historicalPrices}
        />,
      );

      expect(lastProps().webViewInstanceKey).toBe('perp|usd');
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

    it('fetches no spot OHLCV for a perp position (data comes from historicalPrices)', () => {
      setOHLCV([]);
      const historicalPrices: TokenPrice[] = Array.from(
        { length: 10 },
        (_, i) => [String(1_700_000_000_000 + i * 60_000), 100 + i],
      );

      render(
        <TraderAdvancedChart
          {...defaultProps}
          assetId={undefined}
          isPerp
          historicalPrices={historicalPrices}
        />,
      );

      const spotFetches = mockUseOHLCVChart.mock.calls
        .map(([opts]) => opts)
        .filter((opts) => opts.assetId !== '');
      expect(spotFetches).toHaveLength(0);
    });
  });
});
