/**
 * @jest-environment jsdom
 */
import {
  __resetMarkerHitTestForTests,
  attachMarkerHitTest,
  findTradeMarkerIdNearPixel,
  findTradeMarkerIdNearPoint,
} from '../markerHitTest';
import {
  __resetTradeMarkerStateForTests,
  getShapesByMarkerId,
  setMarkers,
} from '../state';
import {
  __resetStateForTests,
  setChartReady,
  setOhlcvData,
  setWidget,
} from '../../../core/state';
import type {
  OHLCVBar,
  TVActiveChart,
  TVChartingLibraryWidget,
  TVCrosshairParams,
  TVWidgetEvent,
} from '../../../core/types';

const sampleBars: OHLCVBar[] = [
  { time: 1_000, open: 1, high: 1, low: 1, close: 10 },
  { time: 2_000, open: 1, high: 1, low: 1, close: 20 },
  { time: 3_000, open: 1, high: 1, low: 1, close: 30 },
];

interface MockBridge {
  postMessage: jest.Mock<void, [string]>;
}

function installBridge(): MockBridge {
  const bridge: MockBridge = { postMessage: jest.fn() };
  (
    window as unknown as { ReactNativeWebView?: MockBridge }
  ).ReactNativeWebView = bridge;
  return bridge;
}

function makeChart(width: number): TVActiveChart {
  return {
    getVisibleBarsRange: () => ({ from: 1, to: 3 }),
    getVisibleRange: () => ({ from: 1, to: 3 }),
    getTimeScale: () => ({
      setRightOffset: () => undefined,
      barSpacingChanged: () => ({
        subscribe: () => undefined,
        unsubscribe: () => undefined,
      }),
      width: () => width,
    }),
    // No panes → priceToY returns null → dyPx = 0
    crossHairMoved: () => ({
      subscribe: (_scope: unknown, cb: (params: TVCrosshairParams) => void) => {
        (
          globalThis as unknown as {
            __crosshairCb: ((params: TVCrosshairParams) => void) | null;
          }
        ).__crosshairCb = cb;
      },
      unsubscribe: () => undefined,
    }),
  } as unknown as TVActiveChart;
}

function makeWidget(chart: TVActiveChart): TVChartingLibraryWidget {
  const subscribers: Record<string, () => void> = {};
  return {
    activeChart: () => chart,
    subscribe: (event: TVWidgetEvent, cb: () => void) => {
      subscribers[event] = cb;
    },
    __fire: (event: TVWidgetEvent) => subscribers[event]?.(),
  } as unknown as TVChartingLibraryWidget & { __fire: (e: string) => void };
}

describe('findTradeMarkerIdNearPoint', () => {
  beforeEach(() => {
    __resetStateForTests();
    __resetTradeMarkerStateForTests();
    __resetMarkerHitTestForTests();
    setOhlcvData(sampleBars);
  });

  it('returns null when no markers cached', () => {
    setWidget(makeWidget(makeChart(300)));
    setChartReady(true);
    setMarkers([]);
    expect(findTradeMarkerIdNearPoint(2, 0)).toBeNull();
  });

  it('returns null when marker is off-screen (not drawn)', () => {
    const chart = makeChart(300);
    setWidget(makeWidget(chart));
    setChartReady(true);
    setMarkers([{ id: 'a', time: 2_000, intent: 'enter' }]);
    // Not present in shapesByMarkerId → drawn.has(id) === false → skipped.
    expect(findTradeMarkerIdNearPoint(2, 0)).toBeNull();
  });

  it('returns marker id when tap is within radius', () => {
    const chart = makeChart(300);
    setWidget(makeWidget(chart));
    setChartReady(true);
    setMarkers([{ id: 'a', time: 2_000, intent: 'enter' }]);
    // Register drawn shape so hit-test doesn't skip it.
    getShapesByMarkerId().set('a', { fill: 'f', ring: 'r' });
    // Tap exactly on the marker time (2s), offsetY undefined → dyPx=0.
    expect(findTradeMarkerIdNearPoint(2, undefined)).toBe('a');
  });

  it('returns null when tap is outside radius', () => {
    const chart = makeChart(300);
    setWidget(makeWidget(chart));
    setChartReady(true);
    setMarkers([{ id: 'a', time: 2_000, intent: 'enter' }]);
    getShapesByMarkerId().set('a', { fill: 'f', ring: 'r' });
    // pxPerSec = 300 / (3-1) = 150. Tap at time 1 → dx = (2-1)*150 = 150px.
    // 150 > 26 (radius) → null.
    expect(findTradeMarkerIdNearPoint(1, undefined)).toBeNull();
  });
});

describe('findTradeMarkerIdNearPoint — edge cases', () => {
  beforeEach(() => {
    __resetStateForTests();
    __resetTradeMarkerStateForTests();
    __resetMarkerHitTestForTests();
    setOhlcvData(sampleBars);
  });

  it('returns null when widget is not ready', () => {
    expect(findTradeMarkerIdNearPoint(2, 0)).toBeNull();
  });

  it('returns null when timeSec is NaN', () => {
    setWidget(makeWidget(makeChart(300)));
    setChartReady(true);
    setMarkers([{ id: 'a', time: 2_000, intent: 'enter' }]);
    getShapesByMarkerId().set('a', { fill: 'f', ring: 'r' });
    expect(findTradeMarkerIdNearPoint(NaN, 0)).toBeNull();
  });

  it('returns null when chart.activeChart() throws', () => {
    const widget = {
      activeChart: () => {
        throw new Error('disposed');
      },
    } as unknown as TVChartingLibraryWidget;
    setWidget(widget);
    setChartReady(true);
    setMarkers([{ id: 'a', time: 2_000, intent: 'enter' }]);
    getShapesByMarkerId().set('a', { fill: 'f', ring: 'r' });
    expect(findTradeMarkerIdNearPoint(2, 0)).toBeNull();
  });

  it('returns null when getTimeScale().width() is 0', () => {
    const chart = makeChart(0);
    setWidget(makeWidget(chart));
    setChartReady(true);
    setMarkers([{ id: 'a', time: 2_000, intent: 'enter' }]);
    getShapesByMarkerId().set('a', { fill: 'f', ring: 'r' });
    expect(findTradeMarkerIdNearPoint(2, 0)).toBeNull();
  });

  it('falls back to getVisibleRange when getVisibleBarsRange is absent', () => {
    const chart = {
      getVisibleRange: () => ({ from: 1, to: 3 }),
      getTimeScale: () => ({ width: () => 300 }),
    } as unknown as TVActiveChart;
    setWidget(makeWidget(chart));
    setChartReady(true);
    setMarkers([{ id: 'a', time: 2_000, intent: 'enter' }]);
    getShapesByMarkerId().set('a', { fill: 'f', ring: 'r' });
    expect(findTradeMarkerIdNearPoint(2, undefined)).toBe('a');
  });

  it('returns null when neither getVisibleBarsRange nor getVisibleRange are available', () => {
    const chart = {
      getTimeScale: () => ({ width: () => 300 }),
    } as unknown as TVActiveChart;
    setWidget(makeWidget(chart));
    setChartReady(true);
    setMarkers([{ id: 'a', time: 2_000, intent: 'enter' }]);
    getShapesByMarkerId().set('a', { fill: 'f', ring: 'r' });
    expect(findTradeMarkerIdNearPoint(2, 0)).toBeNull();
  });

  it('uses priceToY for Y-distance when offsetY is provided and panes exist', () => {
    const chart = {
      getVisibleBarsRange: () => ({ from: 1, to: 3 }),
      getTimeScale: () => ({ width: () => 300 }),
      getPanes: () => [
        {
          getMainSourcePriceScale: () => ({
            getVisiblePriceRange: () => ({ from: 0, to: 100 }),
            isInverted: () => false,
            getMode: () => 0,
          }),
          getHeight: () => 400,
        },
      ],
    } as unknown as TVActiveChart;
    setWidget(makeWidget(chart));
    setChartReady(true);
    setMarkers([{ id: 'a', time: 2_000, intent: 'enter' }]);
    getShapesByMarkerId().set('a', { fill: 'f', ring: 'r' });
    // Marker snaps to bar at time 2_000, close=20
    // priceToY: hi=100, lo=0, price=20, h=400 → y = (100-20)/100 * 400 = 320
    // offsetY=320 → dyPx=0, dxPx=0 → dist=0 → within radius
    expect(findTradeMarkerIdNearPoint(2, 320)).toBe('a');
  });

  it('handles log scale mode in priceToY', () => {
    const chart = {
      getVisibleBarsRange: () => ({ from: 1, to: 3 }),
      getTimeScale: () => ({ width: () => 300 }),
      getPanes: () => [
        {
          getMainSourcePriceScale: () => ({
            getVisiblePriceRange: () => ({ from: 10, to: 1000 }),
            isInverted: () => false,
            getMode: () => 1,
          }),
          getHeight: () => 400,
        },
      ],
    } as unknown as TVActiveChart;
    setWidget(makeWidget(chart));
    setChartReady(true);
    setMarkers([{ id: 'a', time: 2_000, intent: 'enter' }]);
    getShapesByMarkerId().set('a', { fill: 'f', ring: 'r' });
    // Log mode with valid prices → should compute Y without error
    expect(findTradeMarkerIdNearPoint(2, 200)).not.toBeUndefined();
  });

  it('handles inverted price scale', () => {
    const chart = {
      getVisibleBarsRange: () => ({ from: 1, to: 3 }),
      getTimeScale: () => ({ width: () => 300 }),
      getPanes: () => [
        {
          getMainSourcePriceScale: () => ({
            getVisiblePriceRange: () => ({ from: 0, to: 100 }),
            isInverted: () => true,
            getMode: () => 0,
          }),
          getHeight: () => 400,
        },
      ],
    } as unknown as TVActiveChart;
    setWidget(makeWidget(chart));
    setChartReady(true);
    setMarkers([{ id: 'a', time: 2_000, intent: 'enter' }]);
    getShapesByMarkerId().set('a', { fill: 'f', ring: 'r' });
    // Inverted: y = (price-lo)/(hi-lo)*h = (20-0)/(100-0)*400 = 80
    expect(findTradeMarkerIdNearPoint(2, 80)).toBe('a');
  });

  it('returns null when getPanes returns empty array', () => {
    const chart = {
      getVisibleBarsRange: () => ({ from: 1, to: 3 }),
      getTimeScale: () => ({ width: () => 300 }),
      getPanes: () => [],
    } as unknown as TVActiveChart;
    setWidget(makeWidget(chart));
    setChartReady(true);
    setMarkers([{ id: 'a', time: 2_000, intent: 'enter' }]);
    getShapesByMarkerId().set('a', { fill: 'f', ring: 'r' });
    // priceToY returns null → dyPx=0 → only X distance matters
    // dxPx=0 → within radius
    expect(findTradeMarkerIdNearPoint(2, 9999)).toBe('a');
  });

  it('skips markers with invalid time', () => {
    const chart = makeChart(300);
    setWidget(makeWidget(chart));
    setChartReady(true);
    setMarkers([{ id: 'a', time: NaN, intent: 'enter' }]);
    getShapesByMarkerId().set('a', { fill: 'f', ring: 'r' });
    expect(findTradeMarkerIdNearPoint(2, 0)).toBeNull();
  });

  it('uses marker.price when snap returns null price', () => {
    const chart = {
      getVisibleBarsRange: () => ({ from: 1, to: 3 }),
      getTimeScale: () => ({ width: () => 300 }),
      getPanes: () => [
        {
          getMainSourcePriceScale: () => ({
            getVisiblePriceRange: () => ({ from: 0, to: 100 }),
            isInverted: () => false,
            getMode: () => 0,
          }),
          getHeight: () => 400,
        },
      ],
    } as unknown as TVActiveChart;
    setWidget(makeWidget(chart));
    setChartReady(true);
    // Empty OHLCV so snapMarkerToNearestBar returns null → falls back to marker.price
    setOhlcvData([]);
    setMarkers([{ id: 'a', time: 2_000, intent: 'enter', price: 50 }]);
    getShapesByMarkerId().set('a', { fill: 'f', ring: 'r' });
    // priceToY(50) = (100-50)/100*400 = 200 → dyPx = 200-200 = 0, dxPx = 0 → dist=0
    expect(findTradeMarkerIdNearPoint(2, 200)).toBe('a');
  });
});

describe('findTradeMarkerIdNearPixel', () => {
  beforeEach(() => {
    __resetStateForTests();
    __resetTradeMarkerStateForTests();
    __resetMarkerHitTestForTests();
    setOhlcvData(sampleBars);
  });

  it('returns null when no markers cached', () => {
    setWidget(makeWidget(makeChart(300)));
    setChartReady(true);
    setMarkers([]);
    expect(findTradeMarkerIdNearPixel(150, 0)).toBeNull();
  });

  it('returns marker id when offsetX maps to the marker plot-X', () => {
    const chart = makeChart(300);
    setWidget(makeWidget(chart));
    setChartReady(true);
    setMarkers([{ id: 'a', time: 2_000, intent: 'enter' }]);
    getShapesByMarkerId().set('a', { fill: 'f', ring: 'r' });
    // pxPerSec = 300 / (3-1) = 150. Marker snaps to time 2s.
    // Plot-X = (2 - range.lo=1) * 150 = 150 → timeSec = 1 + 150/150 = 2.
    expect(findTradeMarkerIdNearPixel(150, undefined)).toBe('a');
  });

  it('returns null when offsetX lands beyond the tap radius', () => {
    const chart = makeChart(300);
    setWidget(makeWidget(chart));
    setChartReady(true);
    setMarkers([{ id: 'a', time: 2_000, intent: 'enter' }]);
    getShapesByMarkerId().set('a', { fill: 'f', ring: 'r' });
    // offsetX = 0 → timeSec = 1 → dx = (2-1)*150 = 150px > 26 → null.
    expect(findTradeMarkerIdNearPixel(0, undefined)).toBeNull();
  });

  it('returns null when offsetX is NaN', () => {
    const chart = makeChart(300);
    setWidget(makeWidget(chart));
    setChartReady(true);
    setMarkers([{ id: 'a', time: 2_000, intent: 'enter' }]);
    getShapesByMarkerId().set('a', { fill: 'f', ring: 'r' });
    expect(findTradeMarkerIdNearPixel(NaN, 0)).toBeNull();
  });
});

interface SyntheticTouch {
  clientX: number;
  clientY: number;
}

/** Build a plot element with a stubbed bounding rect and mount it. */
function mountPlot(rect: DOMRect): HTMLElement {
  const el = document.createElement('div');
  el.className = 'chart-markup-table';
  el.getBoundingClientRect = () => rect;
  document.body.appendChild(el);
  return el;
}

function makeRect(width: number, height: number): DOMRect {
  return {
    left: 0,
    top: 0,
    right: width,
    bottom: height,
    width,
    height,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  };
}

function dispatchTouch(
  target: EventTarget,
  type: 'touchstart' | 'touchend',
  x: number,
  y: number,
): void {
  const touch: SyntheticTouch = { clientX: x, clientY: y };
  const ev = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(ev, {
    touches: type === 'touchend' ? [] : [touch],
    changedTouches: [touch],
  });
  target.dispatchEvent(ev);
}

function dispatchClick(target: EventTarget, x: number, y: number): void {
  target.dispatchEvent(
    new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
    }),
  );
}

describe('attachMarkerHitTest — DOM tap detection', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    __resetStateForTests();
    __resetTradeMarkerStateForTests();
    __resetMarkerHitTestForTests();
    setOhlcvData(sampleBars);
    delete (window as unknown as { ReactNativeWebView?: MockBridge })
      .ReactNativeWebView;
  });

  afterEach(() => {
    __resetMarkerHitTestForTests();
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
    document.body.innerHTML = '';
  });

  function setupChart(): {
    bridge: MockBridge;
    widget: TVChartingLibraryWidget;
    chart: TVActiveChart;
    plot: HTMLElement;
  } {
    const bridge = installBridge();
    const chart = makeChart(300);
    const widget = makeWidget(chart);
    setWidget(widget);
    setChartReady(true);
    setMarkers([{ id: 'a', time: 2_000, intent: 'enter' }]);
    getShapesByMarkerId().set('a', { fill: 'f', ring: 'r' });
    // pxPerSec = 300 / (3-1) = 150; marker plot-X = 150.
    const plot = mountPlot(makeRect(300, 400));
    return { bridge, widget, chart, plot };
  }

  it('posts TRADE_MARKER_PRESSED on a tap landing on a marker', () => {
    const { bridge, widget, chart, plot } = setupChart();
    attachMarkerHitTest(widget, chart);

    dispatchTouch(plot, 'touchstart', 150, 0);
    dispatchTouch(plot, 'touchend', 150, 0);

    expect(bridge.postMessage).toHaveBeenCalledTimes(1);
    expect(JSON.parse(bridge.postMessage.mock.calls[0][0])).toEqual({
      type: 'TRADE_MARKER_PRESSED',
      payload: { id: 'a' },
    });
  });

  it('does not post when the tap lands off any marker', () => {
    const { bridge, widget, chart, plot } = setupChart();
    attachMarkerHitTest(widget, chart);

    // offsetX = 0 → timeSec = 1 → ~150px from the marker.
    dispatchTouch(plot, 'touchstart', 0, 0);
    dispatchTouch(plot, 'touchend', 0, 0);

    expect(bridge.postMessage).not.toHaveBeenCalled();
  });

  it('does not post for a long-press beyond the tap duration', () => {
    const { bridge, widget, chart, plot } = setupChart();
    attachMarkerHitTest(widget, chart);

    dispatchTouch(plot, 'touchstart', 150, 0);
    jest.advanceTimersByTime(400); // > TAP_MAX_DURATION_MS (350)
    dispatchTouch(plot, 'touchend', 150, 0);

    expect(bridge.postMessage).not.toHaveBeenCalled();
  });

  it('does not post for a drag beyond the movement slop', () => {
    const { bridge, widget, chart, plot } = setupChart();
    attachMarkerHitTest(widget, chart);

    dispatchTouch(plot, 'touchstart', 150, 0);
    dispatchTouch(plot, 'touchend', 150, 50); // moved 50px > 10px slop

    expect(bridge.postMessage).not.toHaveBeenCalled();
  });

  it('dedupes the synthetic click that follows a touch tap', () => {
    const { bridge, widget, chart, plot } = setupChart();
    attachMarkerHitTest(widget, chart);

    dispatchTouch(plot, 'touchstart', 150, 0);
    dispatchTouch(plot, 'touchend', 150, 0);
    // Browser fires a synthetic click right after the touch tap.
    dispatchClick(plot, 150, 0);

    expect(bridge.postMessage).toHaveBeenCalledTimes(1);
  });

  it('reports an error when installing listeners throws', () => {
    const bridge = installBridge();
    const chart = makeChart(300);
    const widget = makeWidget(chart);
    setWidget(widget);
    setChartReady(true);
    jest.spyOn(document, 'addEventListener').mockImplementation(() => {
      throw new Error('addEventListener fail');
    });

    attachMarkerHitTest(widget, chart);

    expect(bridge.postMessage).toHaveBeenCalledWith(
      expect.stringContaining('"type":"ERROR"'),
    );
  });
});
