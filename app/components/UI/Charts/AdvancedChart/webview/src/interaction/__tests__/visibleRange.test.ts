/**
 * @jest-environment jsdom
 */
import {
  __resetVisibleRangeForTests,
  attachVisibleRangeListeners,
} from '../visibleRange';
import {
  __resetStateForTests,
  setChartReady,
  setCurrentResolution,
  setOhlcvData,
  setWidget,
} from '../../core/state';
import type {
  OHLCVBar,
  TVActiveChart,
  TVChartingLibraryWidget,
} from '../../core/types';

interface MockBridge {
  postMessage: jest.Mock<void, [string]>;
}

const installRNBridge = (): MockBridge => {
  const bridge: MockBridge = { postMessage: jest.fn() };
  (
    window as unknown as { ReactNativeWebView?: MockBridge }
  ).ReactNativeWebView = bridge;
  return bridge;
};

const makeChart = (
  visibleRange: { from: number; to: number } = {
    from: 1_700_000_000,
    to: 1_700_027_000,
  },
): {
  chart: TVActiveChart;
  emitZoom: () => void;
  emitPan: () => void;
} => {
  let zoomCb: (() => void) | null = null;
  let panCb: (() => void) | null = null;
  const chart = {
    getTimeScale: () => ({
      barSpacingChanged: () => ({
        subscribe: (_scope: unknown, cb: () => void) => {
          zoomCb = cb;
        },
        unsubscribe: () => undefined,
      }),
      setRightOffset: () => undefined,
    }),
    onVisibleRangeChanged: () => ({
      subscribe: (_scope: unknown, cb: () => void) => {
        panCb = cb;
      },
      unsubscribe: () => undefined,
    }),
    getVisibleRange: () => visibleRange,
  } as unknown as TVActiveChart;
  return {
    chart,
    emitZoom: () => zoomCb?.(),
    emitPan: () => panCb?.(),
  };
};

describe('attachVisibleRangeListeners', () => {
  beforeEach(() => {
    __resetStateForTests();
    __resetVisibleRangeForTests();
    delete (window as unknown as { ReactNativeWebView?: unknown })
      .ReactNativeWebView;
    setWidget({} as unknown as TVChartingLibraryWidget);
    setChartReady(true);
    setCurrentResolution('15');
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('reports each candle count immediately but debounces analytics zoom', () => {
    const bridge = installRNBridge();
    const { chart, emitZoom } = makeChart();
    attachVisibleRangeListeners(chart);
    emitZoom();
    emitZoom();
    emitZoom();
    expect(
      bridge.postMessage.mock.calls.filter((call) =>
        call[0].includes('VISIBLE_CANDLE_COUNT_CHANGED'),
      ),
    ).toHaveLength(3);
    expect(
      bridge.postMessage.mock.calls.filter((call) =>
        call[0].includes('CHART_INTERACTED'),
      ),
    ).toHaveLength(0);
    jest.advanceTimersByTime(450);
    expect(
      bridge.postMessage.mock.calls.filter((call) =>
        call[0].includes('CHART_INTERACTED'),
      ),
    ).toHaveLength(1);
    expect(bridge.postMessage.mock.calls.at(-1)?.[0]).toContain(
      '"interaction_type":"zoom"',
    );
    expect(bridge.postMessage.mock.calls.at(-1)?.[0]).not.toContain(
      '"candleCount"',
    );
  });

  it('reports zoom candle count immediately before analytics debounce', () => {
    const bridge = installRNBridge();
    const { chart, emitZoom } = makeChart();
    attachVisibleRangeListeners(chart);
    emitZoom();
    expect(bridge.postMessage).toHaveBeenCalledTimes(1);
    expect(bridge.postMessage.mock.calls[0][0]).toContain(
      'VISIBLE_CANDLE_COUNT_CHANGED',
    );
    expect(bridge.postMessage.mock.calls[0][0]).toContain('"candleCount":30');
    jest.advanceTimersByTime(450);
    expect(bridge.postMessage).toHaveBeenCalledTimes(2);
  });

  it('debounces pan and emits CHART_INTERACTED with type=pan', () => {
    const bridge = installRNBridge();
    const { chart, emitPan } = makeChart();
    attachVisibleRangeListeners(chart);
    emitPan();
    jest.advanceTimersByTime(450);
    const last = bridge.postMessage.mock.calls[0][0];
    expect(last).toContain('"interaction_type":"pan"');
  });

  it('does not emit zoom when widget is null', () => {
    const bridge = installRNBridge();
    setWidget(null);
    const { chart, emitZoom } = makeChart();
    attachVisibleRangeListeners(chart);
    emitZoom();
    jest.advanceTimersByTime(450);
    expect(bridge.postMessage).not.toHaveBeenCalled();
  });

  it('does not emit pan when chart is not ready', () => {
    const bridge = installRNBridge();
    setChartReady(false);
    const { chart, emitPan } = makeChart();
    attachVisibleRangeListeners(chart);
    emitPan();
    jest.advanceTimersByTime(450);
    expect(bridge.postMessage).not.toHaveBeenCalled();
  });

  it('reports error to RN when barSpacingChanged throws', () => {
    const bridge = installRNBridge();
    const chart = {
      getTimeScale: () => ({
        barSpacingChanged: () => ({
          subscribe: () => {
            throw new Error('getTimeScale fail');
          },
        }),
      }),
      onVisibleRangeChanged: () => ({
        subscribe: jest.fn(),
      }),
    } as unknown as TVActiveChart;

    attachVisibleRangeListeners(chart);

    expect(bridge.postMessage).toHaveBeenCalledWith(
      expect.stringContaining('"type":"ERROR"'),
    );
  });

  it('reports error to RN when onVisibleRangeChanged throws', () => {
    const bridge = installRNBridge();
    const chart = {
      getTimeScale: () => ({
        barSpacingChanged: () => ({
          subscribe: jest.fn(),
        }),
      }),
      onVisibleRangeChanged: () => ({
        subscribe: () => {
          throw new Error('visibleRange fail');
        },
      }),
    } as unknown as TVActiveChart;

    attachVisibleRangeListeners(chart);

    expect(bridge.postMessage).toHaveBeenCalledWith(
      expect.stringContaining('"type":"ERROR"'),
    );
  });

  describe('zoom candleCount reporting', () => {
    // Matches setCurrentResolution('15') in beforeEach.
    const INTERVAL_SEC = 15 * 60;
    const LAST_BAR_SEC = 1_700_027_000;

    const seedBars = (count: number): void => {
      const bars: OHLCVBar[] = Array.from({ length: count }, (_, i) => ({
        time: (LAST_BAR_SEC - (count - 1 - i) * INTERVAL_SEC) * 1000,
        open: 1,
        high: 2,
        low: 0.5,
        close: 1.5,
      }));
      setOhlcvData(bars);
    };

    /** Mirrors ohlcvIngestion's applyVisibleRange framing (2-bar right pad). */
    const rangeFromApplyVisibleRange = (candleCount: number) => ({
      from: LAST_BAR_SEC - INTERVAL_SEC * candleCount,
      to: LAST_BAR_SEC + INTERVAL_SEC * 2,
    });

    const emitZoomAndRead = (range: {
      from: number;
      to: number;
    }): number | undefined => {
      const bridge = installRNBridge();
      const { chart, emitZoom } = makeChart(range);
      attachVisibleRangeListeners(chart);
      emitZoom();
      const countMessage = bridge.postMessage.mock.calls.find((call) =>
        call[0].includes('VISIBLE_CANDLE_COUNT_CHANGED'),
      )?.[0];
      return countMessage
        ? JSON.parse(countMessage).payload?.candleCount
        : undefined;
    };

    it.each([15, 30, 45, 90, 200])(
      'round-trips a %i-candle viewport without drifting the persisted zoom',
      (candleCount) => {
        seedBars(400);

        expect(emitZoomAndRead(rangeFromApplyVisibleRange(candleCount))).toBe(
          candleCount,
        );
      },
    );

    it('ignores trailing whitespace beyond the last loaded bar', () => {
      seedBars(400);

      // Right edge sits 10 bars past the latest candle; only the 30 real
      // candles behind it are visible.
      expect(
        emitZoomAndRead({
          from: LAST_BAR_SEC - INTERVAL_SEC * 30,
          to: LAST_BAR_SEC + INTERVAL_SEC * 10,
        }),
      ).toBe(30);
    });

    it('measures the raw range when no bars are loaded yet', () => {
      expect(
        emitZoomAndRead({
          from: LAST_BAR_SEC - INTERVAL_SEC * 30,
          to: LAST_BAR_SEC,
        }),
      ).toBe(30);
    });
  });

  it('skips pan within 500ms after a zoom', () => {
    const bridge = installRNBridge();
    const { chart, emitZoom, emitPan } = makeChart();
    attachVisibleRangeListeners(chart);
    emitZoom();
    jest.advanceTimersByTime(450); // zoom fires
    bridge.postMessage.mockClear();
    emitPan();
    jest.advanceTimersByTime(450);
    expect(bridge.postMessage).not.toHaveBeenCalled();
  });
});
