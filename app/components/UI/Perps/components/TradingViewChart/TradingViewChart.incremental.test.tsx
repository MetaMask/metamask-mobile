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
import { createTradingViewChartTemplate } from './TradingViewChartTemplate';
import DevLogger from '../../../../../core/SDKConnect/utils/DevLogger';

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
      // Cast View to accept onMessage so tests can access it via getByTestId().props.onMessage
      const ViewWithMessage = View as React.ComponentType<{
        testID?: string;
        onMessage?: (event: unknown) => void;
      }>;
      return (
        <ViewWithMessage testID={props.testID} onMessage={props.onMessage} />
      );
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

    const msg = JSON.parse(
      mockPostMessage.mock.calls[mockPostMessage.mock.calls.length - 1][0],
    );
    expect(msg.isNewBar).toBe(false);
    expect(msg.previousCandleCount).toBe(2);
    expect(msg.nextCandleCount).toBe(2);
  });

  // -----------------------------------------------------------------------
  // Perf: incremental ticks must NOT re-format the full candle array
  // -----------------------------------------------------------------------

  it('does not format the full candle array on an incremental tick', () => {
    const testID = 'incremental-no-full-format';
    const INVALID_LOG = '🚨 Invalid candle data:';

    // Dataset with an INVALID candle at the FRONT (close = 0 fails validation).
    // formatCandleData logs an invalid-candle entry for every invalid candle it
    // processes. If the full array were formatted on a live tick, this leading
    // invalid candle would be logged again — which is exactly the O(N)-per-tick
    // work the fix eliminates.
    const dataWithInvalidHead: CandleData = {
      symbol: 'BTC',
      interval: CandlePeriod.FourHours,
      candles: [
        makeCandle(0, '0'), // INVALID: close = 0
        makeCandle(4),
        makeCandle(8),
      ],
    };

    const { getByTestId, rerender } = render(
      <TradingViewChart
        candleData={dataWithInvalidHead}
        symbol="BTC"
        testID={testID}
      />,
    );
    triggerChartReady(getByTestId, testID);

    // Initial full load formats everything, so the invalid head candle is logged
    // once here. Reset the spies so we only observe the live-tick behavior.
    mockPostMessage.mockClear();
    (DevLogger.log as jest.Mock).mockClear();

    // Live tick: same symbol/interval/firstTime/count, only the last close moves.
    const liveTick: CandleData = {
      ...dataWithInvalidHead,
      candles: [
        makeCandle(0, '0'), // same invalid head
        makeCandle(4),
        makeCandle(8, '46000'), // only the last candle changed
      ],
    };

    act(() => {
      rerender(
        <TradingViewChart candleData={liveTick} symbol="BTC" testID={testID} />,
      );
    });

    // Routing is unchanged: a live tick still emits a single UPDATE_LAST_CANDLE
    // carrying only the last 1-2 candles.
    expect(mockPostMessage).toHaveBeenCalledTimes(1);
    const msg = JSON.parse(mockPostMessage.mock.calls[0][0]);
    expect(msg.type).toBe('UPDATE_LAST_CANDLE');
    expect(msg.candles.length).toBeGreaterThanOrEqual(1);
    expect(msg.candles.length).toBeLessThanOrEqual(2);

    // The leading invalid candle must NOT be re-processed on the tick — proving
    // formatCandleData ran only on the sliced tail, not the full array.
    const invalidLogs = (DevLogger.log as jest.Mock).mock.calls.filter(
      (call) => call[0] === INVALID_LOG,
    );
    expect(invalidLogs).toHaveLength(0);
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
    const msg = JSON.parse(mockPostMessage.mock.calls[0][0]);
    expect(msg.isNewBar).toBe(true);
    expect(msg.previousCandleCount).toBe(2);
    expect(msg.nextCandleCount).toBe(3);
    expect(msg.previousLastTime).toBe(twoCandles.candles[1].time);
    expect(msg.nextLastTime).toBe(withNewBar.candles[2].time);
  });

  it('template follows appended bars only when currently tracking realtime', () => {
    const template = createTradingViewChartTemplate(mockTheme, '', true);

    expect(template).toContain('RIGHT_MARGIN_CANDLES: 2');
    expect(template).toContain('const wasTrackingRealtime =');
    expect(template).toContain(
      'previousDataLength - 1 + window.ZOOM_LIMITS.RIGHT_MARGIN_CANDLES',
    );
    expect(template).toContain(
      'visibleLogicalRangeBefore.to >= rightEdgeBefore - realtimeFollowThreshold',
    );
    expect(template).toContain(
      'if ((message.isNewBar || appendedCandle) && wasTrackingRealtime)',
    );
    expect(template).toContain(
      'window.applyZoom(window.visibleCandleCount, false)',
    );
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
  // CHART_READY resets the signature → self-heal repaints immediately, and
  // subsequent updates are routed against the freshly-painted signature.
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

    // Simulate WebView remount (CHART_READY fires again). The self-heal
    // immediately repaints the currently-held data into the freshly blanked
    // WebView — this is itself a full reload, so it must NOT wait for the
    // next prop change.
    mockPostMessage.mockClear();
    triggerChartReady(getByTestId, testID);
    expect(lastMessageType()).toBe('SET_CANDLESTICK_DATA');

    // A subsequent tick is now routed against the data that was just
    // repainted, so a same-count close update is correctly incremental.
    mockPostMessage.mockClear();
    const nextTick: CandleData = {
      ...twoCandles,
      candles: [twoCandles.candles[0], makeCandle(4, '46000')],
    };
    act(() => {
      rerender(
        <TradingViewChart candleData={nextTick} symbol="BTC" testID={testID} />,
      );
    });
    expect(lastMessageType()).toBe('UPDATE_LAST_CANDLE');
  });

  // -----------------------------------------------------------------------
  // Self-heal: a WebView reload with unchanged candleData must still repaint.
  // Without a repaint trigger, a WebView that silently reloads in the
  // background (e.g. iOS reclaiming the WKWebView content process) would
  // re-fire CHART_READY into a blanked chart, but no prop change would occur
  // to re-run the send effect — leaving the chart permanently empty.
  // -----------------------------------------------------------------------

  it('resends full candlestick data on a repeated CHART_READY even when candleData is unchanged', () => {
    const testID = 'incremental-selfheal-repaint';
    const { getByTestId, rerender } = render(
      <TradingViewChart candleData={twoCandles} symbol="BTC" testID={testID} />,
    );

    // First boot — establishes isChartReady and the initial signature. Other
    // effects (TPSL lines / volume sync) also fire on this first transition,
    // so assert presence rather than relying on message ordering.
    triggerChartReady(getByTestId, testID);
    expect(allMessageTypes()).toContain('SET_CANDLESTICK_DATA');
    mockPostMessage.mockClear();

    // Re-render with the exact same candleData reference — simulates no new
    // data having arrived, only the WebView having reloaded underneath.
    act(() => {
      rerender(
        <TradingViewChart
          candleData={twoCandles}
          symbol="BTC"
          testID={testID}
        />,
      );
    });
    expect(mockPostMessage).not.toHaveBeenCalled();

    // Simulate the WebView reloading and re-firing CHART_READY with no
    // accompanying prop change. isChartReady/tpslLines/showVolume are all
    // unchanged, so only the self-heal (chartReadyNonce) effect re-runs.
    triggerChartReady(getByTestId, testID);

    // The chart must repaint from the data it already holds, not stay blank.
    expect(mockPostMessage).toHaveBeenCalledTimes(1);
    expect(lastMessageType()).toBe('SET_CANDLESTICK_DATA');
  });
});
