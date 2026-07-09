/**
 * @jest-environment jsdom
 */
import { handlePulseTradeMarker } from '../animation';
import { __resetTradeMarkerStateForTests, getShapesByMarkerId } from '../state';
import {
  __resetStateForTests,
  setChartReady,
  setWidget,
} from '../../../core/state';
import type {
  TVActiveChart,
  TVChartingLibraryWidget,
  TVShape,
} from '../../../core/types';

interface RecordedShape {
  id: string;
  properties: Record<string, unknown>[];
}

function makeShape(id: string): { shape: TVShape; record: RecordedShape } {
  const record: RecordedShape = { id, properties: [] };
  const shape = {
    setProperties: (props: Record<string, unknown>) => {
      record.properties.push(props);
    },
  } as unknown as TVShape;
  return { shape, record };
}

function makeWidgetWithShapes(shapes: Record<string, TVShape | null>): {
  widget: TVChartingLibraryWidget;
  chart: TVActiveChart;
} {
  const chart = {
    getShapeById: (id: string) => shapes[id] ?? null,
  } as unknown as TVActiveChart;
  const widget = {
    activeChart: () => chart,
  } as unknown as TVChartingLibraryWidget;
  return { widget, chart };
}

describe('handlePulseTradeMarker', () => {
  beforeEach(() => {
    __resetStateForTests();
    __resetTradeMarkerStateForTests();
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
    expect(() => handlePulseTradeMarker({ id: 'missing' })).not.toThrow();
  });

  it('no-ops when no shape record exists for the id', () => {
    const { widget } = makeWidgetWithShapes({});
    setWidget(widget);
    setChartReady(true);
    expect(() => handlePulseTradeMarker({ id: 'missing' })).not.toThrow();
  });

  it('animates size on both fill and ring shapes', () => {
    const { shape: fill, record: fillRec } = makeShape('fill-a');
    const { shape: ring, record: ringRec } = makeShape('ring-a');
    const { widget } = makeWidgetWithShapes({
      'fill-a': fill,
      'ring-a': ring,
    });
    setWidget(widget);
    setChartReady(true);
    getShapesByMarkerId().set('a', { fill: 'fill-a', ring: 'ring-a' });

    handlePulseTradeMarker({ id: 'a' });
    // Advance beyond the ~1.1s pulse to run every step.
    jest.advanceTimersByTime(1500);

    // At least one setProperties call each on fill and ring — the pulse
    // envelope varies size across frames.
    expect(fillRec.properties.length).toBeGreaterThan(0);
    expect(ringRec.properties.length).toBeGreaterThan(0);
    // Ring must always be larger than fill (ringRatio = 14/10).
    for (let i = 0; i < ringRec.properties.length; i++) {
      const fillSize = fillRec.properties[i]?.size as number | undefined;
      const ringSize = ringRec.properties[i]?.size as number | undefined;
      if (fillSize != null && ringSize != null) {
        expect(ringSize).toBeGreaterThanOrEqual(fillSize);
      }
    }
  });

  it('cancels prior pulse when a newer pulse starts', () => {
    const { shape: fill, record: fillRec } = makeShape('fill-a');
    const { widget } = makeWidgetWithShapes({ 'fill-a': fill });
    setWidget(widget);
    setChartReady(true);
    getShapesByMarkerId().set('a', { fill: 'fill-a', ring: null });

    handlePulseTradeMarker({ id: 'a' });
    const countAfterFirst = fillRec.properties.length;
    handlePulseTradeMarker({ id: 'a' }); // supersedes
    jest.advanceTimersByTime(1500);
    // Property calls continued after the second pulse — first's loop was cancelled.
    expect(fillRec.properties.length).toBeGreaterThan(countAfterFirst);
  });

  it('no-ops when payload id is null', () => {
    const { widget } = makeWidgetWithShapes({});
    setWidget(widget);
    setChartReady(true);
    expect(() =>
      handlePulseTradeMarker({ id: null as unknown as string }),
    ).not.toThrow();
  });

  it('no-ops when both fill and ring are null', () => {
    const { widget } = makeWidgetWithShapes({});
    setWidget(widget);
    setChartReady(true);
    getShapesByMarkerId().set('a', { fill: null, ring: null });
    expect(() => handlePulseTradeMarker({ id: 'a' })).not.toThrow();
  });

  it('no-ops when shape lookup returns null for both', () => {
    const { widget } = makeWidgetWithShapes({
      'fill-a': null,
      'ring-a': null,
    });
    setWidget(widget);
    setChartReady(true);
    getShapesByMarkerId().set('a', { fill: 'fill-a', ring: 'ring-a' });
    expect(() => handlePulseTradeMarker({ id: 'a' })).not.toThrow();
  });

  it('reports error when widget.activeChart() throws', () => {
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
    getShapesByMarkerId().set('a', { fill: 'f', ring: 'r' });

    handlePulseTradeMarker({ id: 'a' });
    expect(bridge.postMessage).toHaveBeenCalledWith(
      expect.stringContaining('"type":"ERROR"'),
    );
  });

  it('falls back to setTimeout when rAF throws during animation', () => {
    const { shape: fill, record: fillRec } = makeShape('fill-a');
    const { widget } = makeWidgetWithShapes({ 'fill-a': fill });
    setWidget(widget);
    setChartReady(true);
    getShapesByMarkerId().set('a', { fill: 'fill-a', ring: null });

    jest.restoreAllMocks();
    jest.useFakeTimers();
    let count = 0;
    jest
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((cb: FrameRequestCallback) => {
        count += 1;
        if (count > 2) throw new Error('rAF unavailable');
        setTimeout(() => cb(Date.now()), 16);
        return 0;
      });

    handlePulseTradeMarker({ id: 'a' });
    jest.advanceTimersByTime(1500);
    expect(fillRec.properties.length).toBeGreaterThan(0);
  });

  it('falls back to applySize when initial rAF throws', () => {
    const { shape: fill, record: fillRec } = makeShape('fill-a');
    const { widget } = makeWidgetWithShapes({ 'fill-a': fill });
    setWidget(widget);
    setChartReady(true);
    getShapesByMarkerId().set('a', { fill: 'fill-a', ring: null });

    jest.restoreAllMocks();
    jest.useFakeTimers();
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation(() => {
      throw new Error('rAF unavailable');
    });

    handlePulseTradeMarker({ id: 'a' });
    // Fallback resets to base size
    expect(fillRec.properties.length).toBeGreaterThan(0);
    expect(fillRec.properties[0].size).toBe(10);
  });
});
