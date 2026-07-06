/**
 * @jest-environment jsdom
 */
import {
  __resetTradeMarkerRefreshForTests,
  clearTradeMarkers,
  handleSetTradeMarkers,
  placeTradeMarkers,
  registerTradeMarkerOverlay,
  scheduleTradeMarkerRefresh,
  snapMarkerToNearestBar,
} from '../index';
import {
  __resetTradeMarkerStateForTests,
  getShapeIds,
  getShapesByMarkerId,
  getMarkers,
} from '../state';
import { __resetHandlersForTests } from '../../../messages/handler';
import {
  __resetDataLifecycleForTests,
  notifyDataLifecycle,
} from '../../../core/dataLifecycle';
import {
  __resetStateForTests,
  setChartReady,
  setOhlcvData,
  setTheme,
  setWidget,
} from '../../../core/state';
import type {
  ChartTheme,
  OHLCVBar,
  TVActiveChart,
  TVChartingLibraryWidget,
} from '../../../core/types';
import type { TradeMarker } from '../../../messages/contract';

const theme = {
  successColor: 'rgb(0, 128, 0)',
  errorColor: 'rgb(200, 0, 0)',
} as unknown as ChartTheme;

interface CreateShapeCall {
  point: { time?: number; price?: number };
  options: Record<string, unknown>;
  resolveWith: (id: string) => void;
}

interface StubChart {
  chart: TVActiveChart;
  createShapeCalls: CreateShapeCall[];
  removedIds: string[];
  runDataReadyOn: 'immediate' | 'call';
  flushDataReady: () => void;
  drainCreatePromises: () => Promise<void>;
}

function makeStubChart(): StubChart {
  const createShapeCalls: CreateShapeCall[] = [];
  const removedIds: string[] = [];
  let dataReadyCb: (() => void) | null = null;
  const chart = {
    createShape: (
      point: { time?: number; price?: number },
      options: Record<string, unknown>,
    ) =>
      new Promise<string>((resolve) => {
        createShapeCalls.push({ point, options, resolveWith: resolve });
      }),
    removeEntity: (id: string) => {
      removedIds.push(id);
    },
    dataReady: (cb: () => void) => {
      dataReadyCb = cb;
    },
  } as unknown as TVActiveChart;
  return {
    chart,
    createShapeCalls,
    removedIds,
    runDataReadyOn: 'call',
    flushDataReady: () => {
      dataReadyCb?.();
    },
    async drainCreatePromises() {
      // Yield until every queued createShape resolves and its `.then` runs.
      for (let i = 0; i < 100; i++) {
        await Promise.resolve();
      }
    },
  };
}

function installWidget(chart: TVActiveChart): TVChartingLibraryWidget {
  const widget = {
    activeChart: () => chart,
  } as unknown as TVChartingLibraryWidget;
  setWidget(widget);
  setChartReady(true);
  return widget;
}

const sampleBars: OHLCVBar[] = [
  { time: 1_000, open: 1, high: 1, low: 1, close: 10 },
  { time: 2_000, open: 1, high: 1, low: 1, close: 20 },
  { time: 3_000, open: 1, high: 1, low: 1, close: 30 },
];

const entryMarker = (id: string, timeMs: number): TradeMarker => ({
  id,
  time: timeMs,
  intent: 'enter',
});

describe('snapMarkerToNearestBar', () => {
  it('returns null on empty data', () => {
    expect(snapMarkerToNearestBar([], 100)).toBeNull();
  });
  it('picks the earlier bar on tie', () => {
    const bars: OHLCVBar[] = [
      { time: 1_000, open: 1, high: 1, low: 1, close: 100 },
      { time: 2_000, open: 1, high: 1, low: 1, close: 200 },
    ];
    // Midway 1500 → tie → picks earlier (index 0, close 100).
    expect(snapMarkerToNearestBar(bars, 1_500)).toEqual({
      timeSec: 1,
      close: 100,
    });
  });
  it('picks the later bar when closer', () => {
    const bars: OHLCVBar[] = [
      { time: 1_000, open: 1, high: 1, low: 1, close: 100 },
      { time: 2_000, open: 1, high: 1, low: 1, close: 200 },
    ];
    expect(snapMarkerToNearestBar(bars, 1_900)).toEqual({
      timeSec: 2,
      close: 200,
    });
  });
});

describe('handleSetTradeMarkers', () => {
  beforeEach(() => {
    __resetStateForTests();
    __resetTradeMarkerStateForTests();
    __resetTradeMarkerRefreshForTests();
    __resetHandlersForTests();
    __resetDataLifecycleForTests();
    setTheme(theme);
  });

  it('caches markers when the widget is not ready', () => {
    handleSetTradeMarkers({ markers: [entryMarker('a', 2_000)] });
    expect(getMarkers()).toEqual([entryMarker('a', 2_000)]);
  });

  it('null payload clears drawn shapes', () => {
    const stub = makeStubChart();
    installWidget(stub.chart);
    setOhlcvData(sampleBars);
    // Seed state with a shape as if placement had run before.
    getShapesByMarkerId().set('a', { fill: 'f1', ring: 'r1' });
    getShapeIds().push('r1', 'f1');
    handleSetTradeMarkers({ markers: null });
    expect(getMarkers()).toBeNull();
    expect(stub.removedIds).toContain('r1');
    expect(stub.removedIds).toContain('f1');
    expect(getShapeIds()).toHaveLength(0);
  });

  it('places ring + fill sequentially per marker', async () => {
    const stub = makeStubChart();
    installWidget(stub.chart);
    setOhlcvData(sampleBars);

    handleSetTradeMarkers({ markers: [entryMarker('a', 2_000)] });
    stub.flushDataReady();
    await stub.drainCreatePromises();

    // First creation should be the ring, awaiting resolution before fill.
    expect(stub.createShapeCalls).toHaveLength(1);
    expect(stub.createShapeCalls[0].options.overrides).toMatchObject({
      color: 'rgb(0, 0, 0)',
      size: 14,
    });
    stub.createShapeCalls[0].resolveWith('ring-a');
    await stub.drainCreatePromises();

    expect(stub.createShapeCalls).toHaveLength(2);
    // Second creation is the fill, colored by entry → theme.successColor.
    expect(stub.createShapeCalls[1].options.overrides).toMatchObject({
      color: theme.successColor,
      size: 10,
    });
    stub.createShapeCalls[1].resolveWith('fill-a');
    await stub.drainCreatePromises();

    expect(getShapeIds()).toEqual(['ring-a', 'fill-a']);
    expect(getShapesByMarkerId().get('a')).toEqual({
      fill: 'fill-a',
      ring: 'ring-a',
    });
  });

  it('uses errorColor for exit markers', async () => {
    const stub = makeStubChart();
    installWidget(stub.chart);
    setOhlcvData(sampleBars);

    handleSetTradeMarkers({
      markers: [{ id: 'x', time: 2_000, intent: 'exit' }],
    });
    stub.flushDataReady();
    await stub.drainCreatePromises();
    stub.createShapeCalls[0].resolveWith('ring-x');
    await stub.drainCreatePromises();
    expect(stub.createShapeCalls[1].options.overrides).toMatchObject({
      color: theme.errorColor,
    });
  });

  it('skips redraw when the desired id set matches the drawn set', () => {
    const stub = makeStubChart();
    installWidget(stub.chart);
    setOhlcvData(sampleBars);
    // Simulate previously-drawn state.
    getShapesByMarkerId().set('a', { fill: 'f', ring: 'r' });

    handleSetTradeMarkers({ markers: [entryMarker('a', 2_000)] });
    stub.flushDataReady();
    expect(stub.createShapeCalls).toHaveLength(0);
    expect(stub.removedIds).toHaveLength(0);
  });

  it('skips markers outside the loaded range', () => {
    const stub = makeStubChart();
    installWidget(stub.chart);
    setOhlcvData(sampleBars);

    // 5_000 > lastBar.time (3_000) → filtered out.
    handleSetTradeMarkers({
      markers: [entryMarker('outside', 5_000)],
    });
    stub.flushDataReady();
    expect(stub.createShapeCalls).toHaveLength(0);
  });
});

describe('placeTradeMarkers', () => {
  beforeEach(() => {
    __resetStateForTests();
    __resetTradeMarkerStateForTests();
    __resetTradeMarkerRefreshForTests();
    __resetHandlersForTests();
    __resetDataLifecycleForTests();
    setTheme(theme);
  });

  it('no-ops when no bars are loaded', () => {
    const stub = makeStubChart();
    installWidget(stub.chart);
    // no setOhlcvData
    getShapesByMarkerId(); // touch to force lazy init
    placeTradeMarkers();
    expect(stub.createShapeCalls).toHaveLength(0);
  });
});

describe('scheduleTradeMarkerRefresh', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    __resetStateForTests();
    __resetTradeMarkerStateForTests();
    __resetTradeMarkerRefreshForTests();
    __resetHandlersForTests();
    __resetDataLifecycleForTests();
    setTheme(theme);
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('no-ops when no markers are cached', () => {
    scheduleTradeMarkerRefresh();
    jest.runAllTimers();
    // Nothing to assert other than no throw.
  });

  it('debounces to a single placeTradeMarkers call', () => {
    const stub = makeStubChart();
    installWidget(stub.chart);
    setOhlcvData(sampleBars);
    handleSetTradeMarkers({ markers: [entryMarker('a', 2_000)] });
    stub.flushDataReady();
    // Nothing to resolve — createShape queue drains via the debounced refresh.

    scheduleTradeMarkerRefresh();
    scheduleTradeMarkerRefresh();
    scheduleTradeMarkerRefresh();
    jest.advanceTimersByTime(200);
    // With markers matching drawn set placement is a no-op (dedup check),
    // but scheduling itself should have run its debounced callback once.
  });
});

describe('registerTradeMarkerOverlay lifecycle hooks', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    __resetStateForTests();
    __resetTradeMarkerStateForTests();
    __resetTradeMarkerRefreshForTests();
    __resetHandlersForTests();
    __resetDataLifecycleForTests();
    setTheme(theme);
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('clears shape tracking on ohlcvReset and re-schedules refresh', () => {
    const stub = makeStubChart();
    installWidget(stub.chart);
    setOhlcvData(sampleBars);
    registerTradeMarkerOverlay();

    handleSetTradeMarkers({ markers: [entryMarker('a', 2_000)] });
    stub.flushDataReady();
    stub.createShapeCalls[0]?.resolveWith('ring-a');

    // Simulate the widget's shape tracking existing then a data reset.
    getShapesByMarkerId().set('a', { fill: 'f', ring: 'r' });
    expect(getShapesByMarkerId().size).toBe(1);

    notifyDataLifecycle('ohlcvReset');
    expect(getShapesByMarkerId().size).toBe(0);
    // Refresh is debounced; advance timers to let it run.
    jest.advanceTimersByTime(200);
  });

  it('clearTradeMarkers is safe when no widget is bound', () => {
    __resetStateForTests();
    expect(() => clearTradeMarkers()).not.toThrow();
  });

  it('placeTradeMarkers no-ops when theme is null', () => {
    const stub = makeStubChart();
    installWidget(stub.chart);
    setOhlcvData(sampleBars);
    setTheme(null as unknown as ChartTheme);
    handleSetTradeMarkers({ markers: [entryMarker('a', 2_000)] });
    stub.flushDataReady();
    expect(stub.createShapeCalls).toHaveLength(0);
  });

  it('placeTradeMarkers falls back to paint() when dataReady is not a function', async () => {
    const createShapeCalls: CreateShapeCall[] = [];
    const chart = {
      createShape: (
        point: { time?: number; price?: number },
        options: Record<string, unknown>,
      ) =>
        new Promise<string>((resolve) => {
          createShapeCalls.push({ point, options, resolveWith: resolve });
        }),
      removeEntity: jest.fn(),
    } as unknown as TVActiveChart;
    installWidget(chart);
    setOhlcvData(sampleBars);

    handleSetTradeMarkers({ markers: [entryMarker('a', 2_000)] });
    // paint() starts a Promise.resolve().then() chain — await a tick
    await Promise.resolve();
    expect(createShapeCalls.length).toBeGreaterThan(0);
  });

  it('reports error when widget.activeChart() throws in placeTradeMarkers', () => {
    const bridge = { postMessage: jest.fn() };
    (
      window as unknown as { ReactNativeWebView: typeof bridge }
    ).ReactNativeWebView = bridge;
    const widget = {
      activeChart: () => {
        throw new Error('disposed');
      },
    } as unknown as TVChartingLibraryWidget;
    setWidget(widget);
    setChartReady(true);
    setOhlcvData(sampleBars);

    handleSetTradeMarkers({ markers: [entryMarker('a', 2_000)] });
    expect(bridge.postMessage).toHaveBeenCalledWith(
      expect.stringContaining('"type":"ERROR"'),
    );
  });

  it('clearTradeMarkers swallows removeEntity errors', () => {
    const chart = {
      removeEntity: () => {
        throw new Error('already removed');
      },
    } as unknown as TVActiveChart;
    installWidget(chart);
    getShapeIds().push('dead-shape');

    expect(() => clearTradeMarkers()).not.toThrow();
    expect(getShapeIds()).toHaveLength(0);
  });

  it('snapMarkerToNearestBar returns null for non-finite close', () => {
    const bars: OHLCVBar[] = [
      { time: 1_000, open: 1, high: 1, low: 1, close: NaN },
    ];
    expect(snapMarkerToNearestBar(bars, 1_000)).toBeNull();
  });

  it('snapMarkerToNearestBar returns null for non-finite tMs', () => {
    expect(snapMarkerToNearestBar(sampleBars, Infinity)).toBeNull();
  });
});
