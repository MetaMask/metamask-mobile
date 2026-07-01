/**
 * @jest-environment jsdom
 */
import { __resetFocusTimeForTests, handleFocusTime } from '../index';
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
} from '../../../core/types';

const sampleBars: OHLCVBar[] = [
  { time: 1_000, open: 1, high: 1, low: 1, close: 10 },
  { time: 2_000, open: 1, high: 1, low: 1, close: 20 },
  { time: 3_000, open: 1, high: 1, low: 1, close: 30 },
];

interface StubChart {
  chart: TVActiveChart;
  visibleRange: { from: number; to: number } | null;
  setRangeCalls: { from: number; to: number }[];
}

function makeStubChart(
  visibleRange: { from: number; to: number } | null,
): StubChart {
  const setRangeCalls: { from: number; to: number }[] = [];
  const chart = {
    getVisibleRange: () => visibleRange,
    setVisibleRange: (range: { from: number; to: number }) => {
      setRangeCalls.push({ ...range });
    },
  } as unknown as TVActiveChart;
  return { chart, visibleRange, setRangeCalls };
}

function installWidget(chart: TVActiveChart): TVChartingLibraryWidget {
  const widget = {
    activeChart: () => chart,
  } as unknown as TVChartingLibraryWidget;
  setWidget(widget);
  setChartReady(true);
  return widget;
}

describe('handleFocusTime', () => {
  beforeEach(() => {
    __resetStateForTests();
    __resetFocusTimeForTests();
    setOhlcvData(sampleBars);
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

  it('no-ops when widget is not ready', () => {
    expect(() => handleFocusTime({ timeMs: 2_000 })).not.toThrow();
  });

  it('no-ops when timeMs is not finite', () => {
    const stub = makeStubChart({ from: 0, to: 10 });
    installWidget(stub.chart);
    handleFocusTime({ timeMs: NaN });
    expect(stub.setRangeCalls).toHaveLength(0);
  });

  it('does not move when the target is already comfortably visible', () => {
    // Current from 0 to 10 (span 10). Inset = 10 * 0.08 = 0.8. Target 5
    // is inside [0.8, 9.2] → return without setting a range.
    const stub = makeStubChart({ from: 0, to: 10 });
    installWidget(stub.chart);
    handleFocusTime({ timeMs: 5_000 });
    expect(stub.setRangeCalls).toHaveLength(0);
  });

  it('jumps immediately when animate=false', () => {
    const stub = makeStubChart({ from: 0, to: 10 });
    installWidget(stub.chart);
    handleFocusTime({ timeMs: 100_000, animate: false, spanMs: 10_000 });
    expect(stub.setRangeCalls).toHaveLength(1);
    expect(stub.setRangeCalls[0]).toEqual({ from: 95, to: 105 });
  });

  it('jumps immediately when no current visible range is available', () => {
    // getVisibleRange returns null → cannot lerp → immediate jump.
    const stub = makeStubChart(null);
    installWidget(stub.chart);
    handleFocusTime({ timeMs: 100_000, spanMs: 10_000 });
    expect(stub.setRangeCalls).toHaveLength(1);
    expect(stub.setRangeCalls[0]).toEqual({ from: 95, to: 105 });
  });

  it('animates over ~600ms toward target range', () => {
    const stub = makeStubChart({ from: 0, to: 10 });
    installWidget(stub.chart);
    handleFocusTime({ timeMs: 100_000, spanMs: 10_000 });
    // Advance the requestAnimationFrame-driven loop past ANIM_MS.
    jest.advanceTimersByTime(1000);
    expect(stub.setRangeCalls.length).toBeGreaterThan(0);
    const last = stub.setRangeCalls[stub.setRangeCalls.length - 1];
    // Final frame lands close to the target [95, 105].
    expect(last.from).toBeCloseTo(95, 0);
    expect(last.to).toBeCloseTo(105, 0);
  });
});
