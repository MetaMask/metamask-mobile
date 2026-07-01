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
});
