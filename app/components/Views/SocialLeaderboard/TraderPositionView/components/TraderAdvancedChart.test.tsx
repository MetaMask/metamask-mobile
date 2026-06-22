import React from 'react';
import { render } from '@testing-library/react-native';
import type { Trade } from '@metamask/social-controllers';
import type { TokenPrice } from '../../../../hooks/useTokenHistoricalPrices';
import { useOHLCVChart } from '../../../../UI/Charts/AdvancedChart/useOHLCVChart';
import type { OHLCVBar } from '../../../../UI/Charts/AdvancedChart/AdvancedChart.types';
import TraderAdvancedChart, {
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

  it('falls back to the execution price (usdCost / tokenAmount) when no OHLCV data is provided', () => {
    const markers = mapTradesToAdvancedMarkers([baseTrade()]);

    expect(markers).toEqual([
      {
        time: 1_700_000_000_000, // normalized seconds → ms
        price: 100,
        intent: 'enter',
        id: '0xabc',
      },
    ]);
  });

  it('anchors the marker price on the OHLCV line at the trade time, not the execution price', () => {
    const ohlcv: OHLCVBar[] = [
      {
        time: 1_700_000_000_000,
        open: 0,
        high: 0,
        low: 0,
        close: 10,
        volume: 0,
      },
      {
        time: 1_700_000_060_000,
        open: 0,
        high: 0,
        low: 0,
        close: 20,
        volume: 0,
      },
    ];

    // Trade at the time midpoint → interpolated close = 15, regardless of the
    // execution price (usdCost / tokenAmount = 100).
    const markers = mapTradesToAdvancedMarkers(
      [
        baseTrade({
          timestamp: 1_700_000_030_000,
          usdCost: 100,
          tokenAmount: 1,
        }),
      ],
      ohlcv,
    );

    expect(markers[0].price).toBe(15);
  });

  it('keeps millisecond timestamps unchanged', () => {
    const markers = mapTradesToAdvancedMarkers([
      baseTrade({ timestamp: 1_700_000_000_000 }),
    ]);

    expect(markers[0].time).toBe(1_700_000_000_000);
  });

  it('uses absolute values so sells with a negative usdCost/tokenAmount keep a positive price', () => {
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
        price: 420.32,
        intent: 'exit',
        id: '0xsell',
      },
    ]);
  });

  it('drops trades with a zero token amount or non-finite price', () => {
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
            // Snapped onto the line: close at bar[1] (time 1_700_000_060_000) is
            // 101, not the execution price of 100.
            price: 101,
            intent: 'enter',
            id: '0xbuy',
          },
        ],
      }),
    );
  });

  it('filters out trades that fall outside the loaded OHLCV data window', () => {
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
        timestamp: (bars[bars.length - 1].time + 60_000_000) / 1000, // after last bar
        transactionHash: '0xoutside',
      },
    ];

    render(<TraderAdvancedChart {...defaultProps} trades={trades} />);

    const lastCall = mockAdvancedChart.mock.calls.at(-1)?.[0] as {
      tradeMarkers: { id: string }[];
    };
    expect(lastCall.tradeMarkers.map((m) => m.id)).toEqual(['0xinside']);
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

  it('centers and pulses a trade when focusRequest changes (normalizing seconds → ms)', () => {
    setOHLCV(makeBars(20));

    const { rerender } = render(<TraderAdvancedChart {...defaultProps} />);
    expect(mockFocusTime).not.toHaveBeenCalled();
    expect(mockPulseTradeMarker).not.toHaveBeenCalled();

    rerender(
      <TraderAdvancedChart
        {...defaultProps}
        focusRequest={{ id: '0xbuy', timestamp: 1_700_000_060, nonce: 1 }}
      />,
    );
    expect(mockFocusTime).toHaveBeenCalledWith(1_700_000_060_000);
    expect(mockPulseTradeMarker).toHaveBeenCalledWith('0xbuy');

    // Re-tapping (new nonce) re-centers and re-pulses, even with the same trade.
    rerender(
      <TraderAdvancedChart
        {...defaultProps}
        focusRequest={{ id: '0xbuy', timestamp: 1_700_000_060, nonce: 2 }}
      />,
    );
    expect(mockFocusTime).toHaveBeenCalledTimes(2);
    expect(mockPulseTradeMarker).toHaveBeenCalledTimes(2);
  });
});
