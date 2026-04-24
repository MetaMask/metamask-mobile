/**
 * Tests for the incremental candle update routing logic in TradingViewChart.
 *
 * These tests verify that:
 * - Live ticks (only the last candle changes) emit UPDATE_LAST_CANDLE
 * - True reloads (initial load, symbol/interval/history change) emit SET_CANDLESTICK_DATA
 *
 * This is a standalone file with its own WebView mock so it can intercept
 * postMessage calls without affecting the broader TradingViewChart test suite.
 */

import React from 'react';
import { render, act } from '@testing-library/react-native';
import { CandlePeriod, type CandleData } from '@metamask/perps-controller';
import TradingViewChart from './TradingViewChart';

const { mockTheme } = jest.requireActual('../../../../../util/theme');

// --- Mocks ---------------------------------------------------------------

const mockPostMessage = jest.fn();

/**
 * WebView mock that:
 * - Exposes `postMessage` on the forwarded ref so the component under test can
 * call `webViewRef.current.postMessage(...)`.
 * - Accepts an `onMessage` prop so tests can simulate incoming WebView messages.
 * - Renders a View with the passed testID so RNTL can locate the element.
 */
jest.mock('@metamask/react-native-webview', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const ReactMock = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const { View } = require('react-native');

  const MockWebView = ReactMock.forwardRef(
    (
      props: { testID?: string; onMessage?: (event: unknown) => void },
      ref: React.Ref<unknown>,
    ) => {
      ReactMock.useImperativeHandle(ref, () => ({
        postMessage: mockPostMessage,
      }));
      return <View testID={props.testID} />;
    },
  );
  MockWebView.displayName = 'MockWebView';
  return { WebView: MockWebView };
});

jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: () => ({
    styles: { webView: { flex: 1 } },
    theme: mockTheme,
  }),
}));

jest.mock('../../../../../core/SDKConnect/utils/DevLogger', () => ({
  log: jest.fn(),
}));

jest.mock('../../Perps.testIds', () => ({
  TradingViewChartSelectorsIDs: { CONTAINER: 'tradingview-chart-container' },
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light' },
}));

jest.mock('../../../../../util/haptics', () => ({
  playImpact: jest.fn(),
  ImpactMoment: { ChartCrosshair: 'ChartCrosshair' },
}));

jest.mock('react-native-gesture-handler', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const { View } = require('react-native');
  return {
    Gesture: { Pinch: jest.fn(() => ({})) },
    GestureDetector: ({ children }: { children: React.ReactNode }) => children,
    PanGestureHandler: View,
    ScrollView: View,
  };
});

jest.mock('../../../../../lib/lightweight-charts/LightweightChartsLib', () => ({
  LIGHTWEIGHT_CHARTS_LIBRARY: '',
}));

// --- Helpers -------------------------------------------------------------

/** Fire a synthetic CHART_READY message into the component's onMessage handler. */
function triggerChartReady(
  getByTestId: (id: string) => { props: Record<string, unknown> },
  testID: string,
) {
  const webViewEl = getByTestId(`${testID}-webview`);
  const onMessage = webViewEl.props.onMessage as (e: unknown) => void;
  act(() => {
    onMessage({
      nativeEvent: { data: JSON.stringify({ type: 'CHART_READY' }) },
    });
  });
}

/** Return the last type of message posted via postMessage. */
function lastMessageType(): string | undefined {
  if (!mockPostMessage.mock.calls.length) return undefined;
  const lastCall =
    mockPostMessage.mock.calls[mockPostMessage.mock.calls.length - 1][0];
  return JSON.parse(lastCall).type;
}

/** Return all message types posted since the last clearMock. */
function allMessageTypes(): string[] {
  return mockPostMessage.mock.calls.map((call) => JSON.parse(call[0]).type);
}

// --- Fixtures ------------------------------------------------------------

const BASE_TIME = 1640995200; // Unix seconds

const makeCandle = (
  offset: number,
  close = '45500',
): CandleData['candles'][number] => ({
  time: (BASE_TIME + offset * 3600) * 1000, // stored in ms
  open: '45000',
  high: '46000',
  low: '44000',
  close,
  volume: '1000',
});

const twoCandles: CandleData = {
  symbol: 'BTC',
  interval: CandlePeriod.FourHours,
  candles: [makeCandle(0), makeCandle(4)],
};

// =========================================================================
// Tests
// =========================================================================

describe('TradingViewChart — incremental update routing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // -----------------------------------------------------------------------
  // Initial load
  // -----------------------------------------------------------------------

  it('sends SET_CANDLESTICK_DATA on initial data load', () => {
    const testID = 'incremental-initial';
    const { getByTestId } = render(
      <TradingViewChart candleData={twoCandles} symbol="BTC" testID={testID} />,
    );

    triggerChartReady(getByTestId, testID);

    expect(allMessageTypes()).toContain('SET_CANDLESTICK_DATA');
    expect(allMessageTypes()).not.toContain('UPDATE_LAST_CANDLE');
  });

  // -----------------------------------------------------------------------
  // Live tick (only last candle changes)
  // -----------------------------------------------------------------------

  it('sends UPDATE_LAST_CANDLE on a live tick after initial load', () => {
    const testID = 'incremental-live-tick';
    const { getByTestId, rerender } = render(
      <TradingViewChart candleData={twoCandles} symbol="BTC" testID={testID} />,
    );

    triggerChartReady(getByTestId, testID);
    // Capture how many calls happened after initial load
    const callsAfterInit = mockPostMessage.mock.calls.length;

    // Simulate a live tick: same symbol/interval/firstTime/length, only close changed
    const liveTick: CandleData = {
      ...twoCandles,
      candles: [twoCandles.candles[0], makeCandle(4, '45800')], // close updated
    };

    act(() => {
      rerender(
        <TradingViewChart candleData={liveTick} symbol="BTC" testID={testID} />,
      );
    });

    const typesAfterTick = mockPostMessage.mock.calls
      .slice(callsAfterInit)
      .map((call) => JSON.parse(call[0]).type);

    expect(typesAfterTick).toContain('UPDATE_LAST_CANDLE');
    expect(typesAfterTick).not.toContain('SET_CANDLESTICK_DATA');
  });

  it('sends UPDATE_LAST_CANDLE payload with only the last 1-2 candles', () => {
    const testID = 'incremental-payload';
    const manyCandles: CandleData = {
      symbol: 'BTC',
      interval: CandlePeriod.FourHours,
      candles: Array.from({ length: 10 }, (_, i) => makeCandle(i * 4)),
    };

    const { getByTestId, rerender } = render(
      <TradingViewChart
        candleData={manyCandles}
        symbol="BTC"
        testID={testID}
      />,
    );
    triggerChartReady(getByTestId, testID);
    mockPostMessage.mockClear();

    const liveTick: CandleData = {
      ...manyCandles,
      candles: [
        ...manyCandles.candles.slice(0, -1),
        makeCandle((10 - 1) * 4, '46000'), // only last close changed
      ],
    };

    act(() => {
      rerender(
        <TradingViewChart candleData={liveTick} symbol="BTC" testID={testID} />,
      );
    });

    expect(mockPostMessage).toHaveBeenCalledTimes(1);
    const msg = JSON.parse(mockPostMessage.mock.calls[0][0]);
    expect(msg.type).toBe('UPDATE_LAST_CANDLE');
    // Payload contains at most 2 candles (last + previous for bar-close transitions)
    expect(msg.candles.length).toBeGreaterThanOrEqual(1);
    expect(msg.candles.length).toBeLessThanOrEqual(2);
  });

  // -----------------------------------------------------------------------
  // New bar appended (live tick that adds one candle)
  // -----------------------------------------------------------------------

  it('sends UPDATE_LAST_CANDLE when one new bar is appended', () => {
    const testID = 'incremental-new-bar';
    const { getByTestId, rerender } = render(
      <TradingViewChart candleData={twoCandles} symbol="BTC" testID={testID} />,
    );
    triggerChartReady(getByTestId, testID);
    mockPostMessage.mockClear();

    const withNewBar: CandleData = {
      ...twoCandles,
      candles: [...twoCandles.candles, makeCandle(8)], // one new bar
    };

    act(() => {
      rerender(
        <TradingViewChart
          candleData={withNewBar}
          symbol="BTC"
          testID={testID}
        />,
      );
    });

    expect(lastMessageType()).toBe('UPDATE_LAST_CANDLE');
  });

  // -----------------------------------------------------------------------
  // True reload: interval change
  // -----------------------------------------------------------------------

  it('sends SET_CANDLESTICK_DATA when the interval changes', () => {
    const testID = 'incremental-interval-change';
    const { getByTestId, rerender } = render(
      <TradingViewChart candleData={twoCandles} symbol="BTC" testID={testID} />,
    );
    triggerChartReady(getByTestId, testID);
    mockPostMessage.mockClear();

    const newInterval: CandleData = {
      symbol: 'BTC',
      interval: CandlePeriod.OneDay, // different interval
      candles: [makeCandle(0), makeCandle(24)],
    };

    act(() => {
      rerender(
        <TradingViewChart
          candleData={newInterval}
          symbol="BTC"
          testID={testID}
        />,
      );
    });

    expect(lastMessageType()).toBe('SET_CANDLESTICK_DATA');
  });

  // -----------------------------------------------------------------------
  // True reload: symbol change
  // -----------------------------------------------------------------------

  it('sends SET_CANDLESTICK_DATA when the symbol changes', () => {
    const testID = 'incremental-symbol-change';
    const { getByTestId, rerender } = render(
      <TradingViewChart candleData={twoCandles} symbol="BTC" testID={testID} />,
    );
    triggerChartReady(getByTestId, testID);
    mockPostMessage.mockClear();

    const ethData: CandleData = {
      symbol: 'ETH',
      interval: CandlePeriod.FourHours,
      candles: [makeCandle(0), makeCandle(4)],
    };

    act(() => {
      rerender(
        <TradingViewChart candleData={ethData} symbol="ETH" testID={testID} />,
      );
    });

    expect(lastMessageType()).toBe('SET_CANDLESTICK_DATA');
  });

  // -----------------------------------------------------------------------
  // True reload: historical prepend (firstTime moves earlier)
  // -----------------------------------------------------------------------

  it('sends SET_CANDLESTICK_DATA when historical candles are prepended', () => {
    const testID = 'incremental-history-prepend';
    const { getByTestId, rerender } = render(
      <TradingViewChart candleData={twoCandles} symbol="BTC" testID={testID} />,
    );
    triggerChartReady(getByTestId, testID);
    mockPostMessage.mockClear();

    // Prepend older candles — firstTime moves back, length grows by more than 1
    const withHistory: CandleData = {
      ...twoCandles,
      candles: [makeCandle(-8), makeCandle(-4), ...twoCandles.candles],
    };

    act(() => {
      rerender(
        <TradingViewChart
          candleData={withHistory}
          symbol="BTC"
          testID={testID}
        />,
      );
    });

    expect(lastMessageType()).toBe('SET_CANDLESTICK_DATA');
  });

  // -----------------------------------------------------------------------
  // CHART_READY resets the signature → next update is a full reload
  // -----------------------------------------------------------------------

  it('resets to full reload after a CHART_READY (WebView remount)', () => {
    const testID = 'incremental-remount-reset';
    const { getByTestId, rerender } = render(
      <TradingViewChart candleData={twoCandles} symbol="BTC" testID={testID} />,
    );

    // First boot
    triggerChartReady(getByTestId, testID);
    mockPostMessage.mockClear();

    // Live tick → UPDATE_LAST_CANDLE
    const liveTick: CandleData = {
      ...twoCandles,
      candles: [twoCandles.candles[0], makeCandle(4, '45900')],
    };
    act(() => {
      rerender(
        <TradingViewChart candleData={liveTick} symbol="BTC" testID={testID} />,
      );
    });
    expect(lastMessageType()).toBe('UPDATE_LAST_CANDLE');

    // Simulate WebView remount (CHART_READY fires again)
    triggerChartReady(getByTestId, testID);
    mockPostMessage.mockClear();

    // Next update must be a full reload, not an incremental update
    const nextTick: CandleData = {
      ...twoCandles,
      candles: [twoCandles.candles[0], makeCandle(4, '46000')],
    };
    act(() => {
      rerender(
        <TradingViewChart candleData={nextTick} symbol="BTC" testID={testID} />,
      );
    });
    expect(lastMessageType()).toBe('SET_CANDLESTICK_DATA');
  });
});
