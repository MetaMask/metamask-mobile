/**
 * @jest-environment jsdom
 */
import {
  __resetCrosshairForTests,
  attachCrosshairListener,
  attachTapDismiss,
} from '../crosshair';
import { __resetStateForTests, setOhlcvData } from '../../core/state';
import type {
  TVActiveChart,
  TVChartingLibraryWidget,
  TVCrosshairParams,
  TVWidgetEvent,
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

const makeChart = (): {
  chart: TVActiveChart;
  emit: (params: TVCrosshairParams) => void;
} => {
  let subscriber: ((p: TVCrosshairParams) => void) | null = null;
  const chart = {
    crossHairMoved: () => ({
      subscribe: (_scope: unknown, cb: (p: TVCrosshairParams) => void) => {
        subscriber = cb;
      },
      unsubscribe: () => undefined,
    }),
  } as unknown as TVActiveChart;
  return {
    chart,
    emit(params: TVCrosshairParams) {
      subscriber?.(params);
    },
  };
};

const makeWidget = (): {
  widget: TVChartingLibraryWidget;
  fire: (event: TVWidgetEvent) => void;
} => {
  const subscribers: Record<string, () => void> = {};
  const widget = {
    subscribe: (event: TVWidgetEvent, handler: () => void) => {
      subscribers[event] = handler;
    },
  } as unknown as TVChartingLibraryWidget;
  return {
    widget,
    fire(event: TVWidgetEvent) {
      subscribers[event]?.();
    },
  };
};

describe('attachCrosshairListener', () => {
  beforeEach(() => {
    __resetStateForTests();
    __resetCrosshairForTests();
    delete (window as unknown as { ReactNativeWebView?: unknown })
      .ReactNativeWebView;
  });

  it('posts CROSSHAIR_MOVE with the nearest bar as payload.data', () => {
    const bridge = installRNBridge();
    setOhlcvData([
      { time: 0, open: 1, high: 1, low: 1, close: 1 },
      { time: 60_000, open: 2, high: 2, low: 2, close: 2 },
      { time: 120_000, open: 3, high: 3, low: 3, close: 3 },
    ]);
    const { chart, emit } = makeChart();
    attachCrosshairListener(chart);
    emit({ time: 65, price: 1.5, offsetX: 10, offsetY: 20 });
    const calls = bridge.postMessage.mock.calls;
    const crosshair = calls.find((c) => c[0].includes('CROSSHAIR_MOVE'));
    expect(crosshair).toBeDefined();
    expect(crosshair?.[0]).toContain('"time":60000');
  });

  it('posts CROSSHAIR_MOVE with data=null on dismiss params', () => {
    const bridge = installRNBridge();
    setOhlcvData([{ time: 0, open: 1, high: 1, low: 1, close: 1 }]);
    const { chart, emit } = makeChart();
    attachCrosshairListener(chart);
    emit({ time: undefined, price: undefined });
    const last = bridge.postMessage.mock.calls.at(-1)?.[0];
    expect(last).toContain('"data":null');
  });

  it('emits CHART_INTERACTED tooltip exactly once per crosshair session', () => {
    const bridge = installRNBridge();
    setOhlcvData([{ time: 0, open: 1, high: 1, low: 1, close: 1 }]);
    const { chart, emit } = makeChart();
    attachCrosshairListener(chart);
    emit({ time: 0, price: 1 });
    emit({ time: 0, price: 1 });
    emit({ time: 0, price: 1 });
    const tooltipCalls = bridge.postMessage.mock.calls.filter((c) =>
      c[0].includes('"interaction_type":"tooltip"'),
    );
    expect(tooltipCalls).toHaveLength(1);
  });
});

describe('attachTapDismiss', () => {
  beforeEach(() => {
    __resetStateForTests();
    __resetCrosshairForTests();
    delete (window as unknown as { ReactNativeWebView?: unknown })
      .ReactNativeWebView;
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does nothing when no crosshair has been shown', () => {
    const bridge = installRNBridge();
    const { widget, fire } = makeWidget();
    attachTapDismiss(widget);
    fire('mouse_down');
    fire('mouse_up');
    jest.runAllTimers();
    expect(bridge.postMessage).not.toHaveBeenCalled();
  });

  it('dismisses with data=null on a short tap after the synthetic-click guard', () => {
    const bridge = installRNBridge();
    setOhlcvData([{ time: 0, open: 1, high: 1, low: 1, close: 1 }]);
    const { chart, emit } = makeChart();
    const { widget, fire } = makeWidget();
    attachCrosshairListener(chart);
    attachTapDismiss(widget);

    // Long-press shows the crosshair.
    emit({ time: 0, price: 1 });
    bridge.postMessage.mockClear();

    // Wait past the synthetic-click guard.
    jest.advanceTimersByTime(600);

    // Short tap.
    fire('mouse_down');
    jest.advanceTimersByTime(50);
    fire('mouse_up');
    jest.advanceTimersByTime(60);

    expect(bridge.postMessage).toHaveBeenCalledWith(
      expect.stringContaining('"data":null'),
    );
  });

  it('ignores long presses (release after >= 400ms)', () => {
    const bridge = installRNBridge();
    setOhlcvData([{ time: 0, open: 1, high: 1, low: 1, close: 1 }]);
    const { chart, emit } = makeChart();
    const { widget, fire } = makeWidget();
    attachCrosshairListener(chart);
    attachTapDismiss(widget);

    emit({ time: 0, price: 1 });
    bridge.postMessage.mockClear();
    jest.advanceTimersByTime(600);

    fire('mouse_down');
    jest.advanceTimersByTime(500); // long press
    fire('mouse_up');
    jest.advanceTimersByTime(100);

    expect(bridge.postMessage).not.toHaveBeenCalledWith(
      expect.stringContaining('"data":null'),
    );
  });

  it('suppresses subsequent crosshair moves during the 800ms dismiss window', () => {
    const bridge = installRNBridge();
    setOhlcvData([{ time: 0, open: 1, high: 1, low: 1, close: 1 }]);
    const { chart, emit } = makeChart();
    const { widget, fire } = makeWidget();
    attachCrosshairListener(chart);
    attachTapDismiss(widget);

    // Show + tap-dismiss.
    emit({ time: 0, price: 1 });
    jest.advanceTimersByTime(600);
    fire('mouse_down');
    fire('mouse_up');
    jest.advanceTimersByTime(60);
    bridge.postMessage.mockClear();

    // Any crosshair-move during the dismiss window emits data:null.
    emit({ time: 0, price: 1 });
    const last = bridge.postMessage.mock.calls.at(-1)?.[0];
    expect(last).toContain('"data":null');
  });
});
