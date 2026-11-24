/**
 * @jest-environment jsdom
 */
import {
  __resetAvatarMarkerRefreshForTests,
  attachAvatarMarkerSync,
} from '../index';
import type {
  TVActiveChart,
  TVChartingLibraryWidget,
  TVWidgetEvent,
} from '../../../core/types';

type Callback = () => void;

interface Harness {
  widget: TVChartingLibraryWidget;
  chart: TVActiveChart;
  widgetHandlers: Partial<Record<TVWidgetEvent, Callback>>;
  fire: {
    visibleRange: () => void;
    barSpacing: () => void;
  };
}

function makeHarness(): Harness {
  const widgetHandlers: Partial<Record<TVWidgetEvent, Callback>> = {};
  let visibleRangeCb: Callback = () => undefined;
  let barSpacingCb: Callback = () => undefined;

  const subscription = (assign: (cb: Callback) => void) => ({
    subscribe: (_scope: unknown, cb: Callback) => assign(cb),
    unsubscribe: () => undefined,
  });

  const timeScale = {
    setRightOffset: () => undefined,
    barSpacingChanged: () =>
      subscription((cb) => {
        barSpacingCb = cb;
      }),
  };

  const chart = {
    onVisibleRangeChanged: () =>
      subscription((cb) => {
        visibleRangeCb = cb;
      }),
    getTimeScale: () => timeScale,
  } as unknown as TVActiveChart;

  const widget = {
    activeChart: () => chart,
    subscribe: (event: TVWidgetEvent, cb: Callback) => {
      widgetHandlers[event] = cb;
    },
  } as unknown as TVChartingLibraryWidget;

  return {
    widget,
    chart,
    widgetHandlers,
    fire: {
      visibleRange: () => visibleRangeCb(),
      barSpacing: () => barSpacingCb(),
    },
  };
}

describe('attachAvatarMarkerSync', () => {
  let rafSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    rafSpy = jest
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation(() => 1);
    __resetAvatarMarkerRefreshForTests();
  });

  afterEach(() => {
    __resetAvatarMarkerRefreshForTests();
    rafSpy.mockRestore();
    jest.useRealTimers();
  });

  it('subscribes mouse_down and mouse_up on the widget', () => {
    const h = makeHarness();

    attachAvatarMarkerSync(h.widget, h.chart);

    expect(h.widgetHandlers.mouse_down).toBeInstanceOf(Function);
    expect(h.widgetHandlers.mouse_up).toBeInstanceOf(Function);
  });

  it.each([
    ['barSpacingChanged (zoom)', 'barSpacing'],
    ['onVisibleRangeChanged', 'visibleRange'],
  ] as const)('starts the reposition loop on %s', (_label, signal) => {
    const h = makeHarness();
    attachAvatarMarkerSync(h.widget, h.chart);

    h.fire[signal]();

    expect(rafSpy).toHaveBeenCalledTimes(1);
  });

  it('does not start a second loop while one is already scheduled', () => {
    const h = makeHarness();
    attachAvatarMarkerSync(h.widget, h.chart);

    h.fire.visibleRange();
    h.fire.visibleRange();
    h.fire.barSpacing();

    expect(rafSpy).toHaveBeenCalledTimes(1);
  });

  it('keeps the widget subscriptions when getTimeScale throws', () => {
    const h = makeHarness();
    const chart = {
      onVisibleRangeChanged: h.chart.onVisibleRangeChanged,
      getTimeScale: () => {
        throw new Error('boom');
      },
    } as unknown as TVActiveChart;

    expect(() => attachAvatarMarkerSync(h.widget, chart)).not.toThrow();
    expect(h.widgetHandlers.mouse_down).toBeInstanceOf(Function);
  });
});
