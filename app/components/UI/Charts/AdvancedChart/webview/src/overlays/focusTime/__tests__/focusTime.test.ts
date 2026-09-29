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

  it('cancels a running animation when a newer FOCUS_TIME arrives', () => {
    const stub = makeStubChart({ from: 0, to: 10 });
    installWidget(stub.chart);
    handleFocusTime({ timeMs: 100_000, spanMs: 10_000 });
    jest.advanceTimersByTime(100);

    // Second call bumps generation → first animation stops
    handleFocusTime({ timeMs: 200_000, spanMs: 10_000 });
    jest.advanceTimersByTime(1000);

    // Final frame should land at the second target (195-205), not the first (95-105)
    const last = stub.setRangeCalls[stub.setRangeCalls.length - 1];
    expect(last.from).toBeCloseTo(195, 0);
    expect(last.to).toBeCloseTo(205, 0);
  });

  it('no-ops when widget.activeChart() throws', () => {
    const widget = {
      activeChart: () => {
        throw new Error('disposed');
      },
    } as unknown as TVChartingLibraryWidget;
    const bridge = { postMessage: jest.fn() };
    (
      window as unknown as { ReactNativeWebView: typeof bridge }
    ).ReactNativeWebView = bridge;
    setWidget(widget);
    setChartReady(true);

    expect(() => handleFocusTime({ timeMs: 2_000 })).not.toThrow();
    expect(bridge.postMessage).toHaveBeenCalledWith(
      expect.stringContaining('"type":"ERROR"'),
    );
  });

  it('no-ops when chart.setVisibleRange is not a function', () => {
    const chart = {
      getVisibleRange: () => ({ from: 0, to: 10 }),
    } as unknown as TVActiveChart;
    installWidget(chart);
    expect(() =>
      handleFocusTime({ timeMs: 100_000, spanMs: 10_000 }),
    ).not.toThrow();
  });

  it('returns null from readVisibleRangeSec when getVisibleRange is not a function', () => {
    const chart = {
      setVisibleRange: jest.fn(),
    } as unknown as TVActiveChart;
    installWidget(chart);
    // Without getVisibleRange, readVisibleRangeSec returns null → immediate jump
    handleFocusTime({ timeMs: 100_000, spanMs: 10_000 });
    expect((chart.setVisibleRange as jest.Mock).mock.calls).toHaveLength(1);
  });

  it('handles readVisibleRangeSec returning null for invalid range (to <= from)', () => {
    const chart = {
      getVisibleRange: () => ({ from: 10, to: 5 }),
      setVisibleRange: jest.fn(),
    } as unknown as TVActiveChart;
    installWidget(chart);
    handleFocusTime({ timeMs: 100_000, spanMs: 10_000 });
    expect(chart.setVisibleRange as jest.Mock).toHaveBeenCalled();
  });

  it('uses spanMs from payload when provided', () => {
    const stub = makeStubChart({ from: 0, to: 10 });
    installWidget(stub.chart);
    handleFocusTime({ timeMs: 50_000, spanMs: 20_000, animate: false });
    expect(stub.setRangeCalls).toHaveLength(1);
    // spanSec = 20, center = 50 → from = 40, to = 60
    expect(stub.setRangeCalls[0]).toEqual({ from: 40, to: 60 });
  });

  it('uses current visible span when spanMs is not provided', () => {
    const stub = makeStubChart({ from: 0, to: 20 });
    installWidget(stub.chart);
    handleFocusTime({ timeMs: 100_000, animate: false });
    // Keeps span of 20 (from current), centers on 100
    expect(stub.setRangeCalls[0]).toEqual({ from: 90, to: 110 });
  });

  it('swallows setVisibleRange errors during animation', () => {
    let callCount = 0;
    const chart = {
      getVisibleRange: () => ({ from: 0, to: 10 }),
      setVisibleRange: () => {
        callCount += 1;
        if (callCount > 2) throw new Error('chart teardown');
      },
    } as unknown as TVActiveChart;
    installWidget(chart);

    expect(() => {
      handleFocusTime({ timeMs: 100_000, spanMs: 10_000 });
      jest.advanceTimersByTime(1000);
    }).not.toThrow();
  });

  it('falls back to setTimeout when requestAnimationFrame throws during animation loop', () => {
    const stub = makeStubChart({ from: 0, to: 10 });
    installWidget(stub.chart);

    jest.restoreAllMocks();
    let frameCount = 0;
    jest
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((cb: FrameRequestCallback) => {
        frameCount += 1;
        if (frameCount > 2) throw new Error('rAF unavailable');
        setTimeout(() => cb(Date.now()), 16);
        return 0;
      });

    handleFocusTime({ timeMs: 100_000, spanMs: 10_000 });
    jest.advanceTimersByTime(1000);

    // Animation still progressed via setTimeout fallback
    expect(stub.setRangeCalls.length).toBeGreaterThan(0);
  });

  it('falls back to immediate jump when initial requestAnimationFrame throws', () => {
    const stub = makeStubChart({ from: 0, to: 10 });
    installWidget(stub.chart);

    jest.restoreAllMocks();
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation(() => {
      throw new Error('rAF unavailable');
    });

    handleFocusTime({ timeMs: 100_000, spanMs: 10_000 });
    expect(stub.setRangeCalls).toHaveLength(1);
    expect(stub.setRangeCalls[0].from).toBeCloseTo(95, 0);
    expect(stub.setRangeCalls[0].to).toBeCloseTo(105, 0);
  });
});
