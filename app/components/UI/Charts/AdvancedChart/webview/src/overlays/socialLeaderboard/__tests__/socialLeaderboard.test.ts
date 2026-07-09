/**
 * @jest-environment jsdom
 */
import {
  __resetSocialLeaderboardForTests,
  slbCenterViewport,
  slbHandleGetBars,
  slbScheduleInitialCentering,
} from '../index';
import {
  __resetStateForTests,
  bumpOhlcvGeneration,
  setChartReady,
  setOhlcvData,
  setSlbCenteringPending,
  setSlbMode,
  setVisibleFromMs,
  setVisibleToMs,
  setWidget,
} from '../../../core/state';
import type {
  OHLCVBar,
  TVActiveChart,
  TVChartingLibraryWidget,
  TVSubscription,
} from '../../../core/types';

// One bar per hour; last bar at t = 10h so a trade window ending well before it
// is a "historical frame" and a window ending at it is a "trailing frame".
const HOUR_MS = 60 * 60 * 1000;
const bars: OHLCVBar[] = Array.from({ length: 11 }, (_, i) => ({
  time: i * HOUR_MS,
  open: 1,
  high: 1,
  low: 1,
  close: 1 + i,
}));
const LAST_BAR_MS = 10 * HOUR_MS;

interface SetRangeCall {
  range: { from: number; to: number };
  options?: { percentRightMargin?: number };
}

interface StubChart {
  chart: TVActiveChart;
  setRangeCalls: SetRangeCall[];
  /** Fire the onDataLoaded subscribers, simulating TradingView's load event. */
  fireDataLoaded: () => void;
}

function makeStubChart(): StubChart {
  const setRangeCalls: SetRangeCall[] = [];
  const subscribers: (() => void)[] = [];
  const subscription: TVSubscription = {
    subscribe: (_scope, cb) => {
      subscribers.push(cb as () => void);
    },
    unsubscribe: (_scope, cb) => {
      const idx = subscribers.indexOf(cb as () => void);
      if (idx >= 0) subscribers.splice(idx, 1);
    },
  };
  const chart = {
    onDataLoaded: () => subscription,
    setVisibleRange: (
      range: { from: number; to: number },
      options?: { percentRightMargin?: number },
    ) => {
      setRangeCalls.push({ range: { ...range }, options });
    },
  } as unknown as TVActiveChart;
  return {
    chart,
    setRangeCalls,
    fireDataLoaded: () => subscribers.slice().forEach((cb) => cb()),
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

describe('slbCenterViewport', () => {
  beforeEach(() => {
    __resetStateForTests();
    __resetSocialLeaderboardForTests();
    setOhlcvData(bars);
    setSlbMode(true);
    setSlbCenteringPending(true);
    jest.useFakeTimers();
    jest
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((cb: FrameRequestCallback) => {
        setTimeout(() => cb(Date.now()), 16);
        return 0;
      });
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('no-ops when slbMode is off', () => {
    setSlbMode(false);
    const stub = makeStubChart();
    installWidget(stub.chart);
    slbCenterViewport(stub.chart);
    stub.fireDataLoaded();
    expect(stub.setRangeCalls).toHaveLength(0);
  });

  it('no-ops when centering is not pending', () => {
    setSlbCenteringPending(false);
    const stub = makeStubChart();
    installWidget(stub.chart);
    slbCenterViewport(stub.chart);
    stub.fireDataLoaded();
    expect(stub.setRangeCalls).toHaveLength(0);
  });

  it('no-ops when visible bounds are missing', () => {
    const stub = makeStubChart();
    installWidget(stub.chart);
    setVisibleFromMs(null);
    setVisibleToMs(null);
    slbCenterViewport(stub.chart);
    stub.fireDataLoaded();
    expect(stub.setRangeCalls).toHaveLength(0);
  });

  it('trailing frame: a single anchored setVisibleRange after data load', () => {
    const stub = makeStubChart();
    installWidget(stub.chart);
    // Trade window ends at the latest bar → trailing frame.
    setVisibleFromMs(8 * HOUR_MS);
    setVisibleToMs(LAST_BAR_MS);

    slbCenterViewport(stub.chart);
    expect(stub.setRangeCalls).toHaveLength(0); // waits for onDataLoaded

    stub.fireDataLoaded();
    jest.advanceTimersByTime(1000);

    // Exactly one call, anchored with percentRightMargin: 0, and no hold loop.
    expect(stub.setRangeCalls).toHaveLength(1);
    expect(stub.setRangeCalls[0].options).toEqual({ percentRightMargin: 0 });
  });

  it('historical frame: re-asserts the range across the hold window without percentRightMargin', () => {
    const stub = makeStubChart();
    installWidget(stub.chart);
    // Trade window ends well before the latest bar → historical frame.
    setVisibleFromMs(1 * HOUR_MS);
    setVisibleToMs(3 * HOUR_MS);

    slbCenterViewport(stub.chart);
    stub.fireDataLoaded();

    // First assertion fires synchronously; more arrive across the hold window.
    expect(stub.setRangeCalls.length).toBeGreaterThanOrEqual(1);
    jest.advanceTimersByTime(1000);
    expect(stub.setRangeCalls.length).toBeGreaterThan(1);

    // The historical-frame path must NOT pass percentRightMargin (it would
    // re-anchor the viewport to the latest candle).
    stub.setRangeCalls.forEach((call) => {
      expect(call.options).toBeUndefined();
    });

    // The framed range covers the trade window (1h..3h in seconds), not "today".
    const first = stub.setRangeCalls[0].range;
    expect(first.from).toBeLessThan(1 * 60 * 60);
    expect(first.to).toBeGreaterThanOrEqual(3 * 60 * 60);
    expect(first.to).toBeLessThan(LAST_BAR_MS / 1000);
  });

  it('historical frame: the hold loop stops re-asserting after the hold window', () => {
    const stub = makeStubChart();
    installWidget(stub.chart);
    setVisibleFromMs(1 * HOUR_MS);
    setVisibleToMs(3 * HOUR_MS);

    slbCenterViewport(stub.chart);
    stub.fireDataLoaded();
    jest.advanceTimersByTime(2000);
    const settled = stub.setRangeCalls.length;
    jest.advanceTimersByTime(2000);
    expect(stub.setRangeCalls.length).toBe(settled);
  });

  it('historical frame: a stale data generation cancels the hold', () => {
    const stub = makeStubChart();
    installWidget(stub.chart);
    setVisibleFromMs(1 * HOUR_MS);
    setVisibleToMs(3 * HOUR_MS);

    slbCenterViewport(stub.chart);
    stub.fireDataLoaded();
    const before = stub.setRangeCalls.length;

    // A fresh series arrives mid-hold → the in-flight hold must stop.
    bumpOhlcvGeneration();
    jest.advanceTimersByTime(1000);
    expect(stub.setRangeCalls.length).toBe(before);
  });

  it('drops the framing when the data generation changed before the load event', () => {
    const stub = makeStubChart();
    installWidget(stub.chart);
    setVisibleFromMs(1 * HOUR_MS);
    setVisibleToMs(3 * HOUR_MS);

    slbCenterViewport(stub.chart);
    bumpOhlcvGeneration(); // superseded before onDataLoaded fires
    stub.fireDataLoaded();
    jest.advanceTimersByTime(1000);
    expect(stub.setRangeCalls).toHaveLength(0);
  });

  it('clears the centering-pending flag after framing', () => {
    const stub = makeStubChart();
    installWidget(stub.chart);
    setVisibleFromMs(8 * HOUR_MS);
    setVisibleToMs(LAST_BAR_MS);

    slbCenterViewport(stub.chart);
    stub.fireDataLoaded();

    // A second invocation should now no-op (pending was cleared).
    stub.setRangeCalls.length = 0;
    slbCenterViewport(stub.chart);
    stub.fireDataLoaded();
    jest.advanceTimersByTime(1000);
    expect(stub.setRangeCalls).toHaveLength(0);
  });
});

describe('slbScheduleInitialCentering', () => {
  beforeEach(() => {
    __resetStateForTests();
    __resetSocialLeaderboardForTests();
    setOhlcvData(bars);
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('no-ops when slbMode is off', () => {
    setSlbMode(false);
    expect(() => slbScheduleInitialCentering()).not.toThrow();
  });

  it('no-ops when the widget is not ready', () => {
    setSlbMode(true);
    setSlbCenteringPending(true);
    expect(() => slbScheduleInitialCentering()).not.toThrow();
  });
});

describe('slbHandleGetBars', () => {
  beforeEach(() => {
    __resetStateForTests();
  });

  it('returns false and does not respond when slbMode is off', () => {
    setSlbMode(false);
    const onResult = jest.fn();
    expect(slbHandleGetBars(onResult)).toBe(false);
    expect(onResult).not.toHaveBeenCalled();
  });

  it('signals noData and returns true when slbMode is on', () => {
    setSlbMode(true);
    const onResult = jest.fn();
    expect(slbHandleGetBars(onResult)).toBe(true);
    expect(onResult).toHaveBeenCalledWith([], { noData: true });
  });
});
