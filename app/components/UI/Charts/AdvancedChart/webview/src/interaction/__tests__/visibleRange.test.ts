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
  setWidget,
} from '../../core/state';
import type { TVActiveChart, TVChartingLibraryWidget } from '../../core/types';

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
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('debounces zoom and emits CHART_INTERACTED with type=zoom', () => {
    const bridge = installRNBridge();
    const { chart, emitZoom } = makeChart();
    attachVisibleRangeListeners(chart);
    emitZoom();
    emitZoom();
    emitZoom();
    expect(bridge.postMessage).not.toHaveBeenCalled();
    jest.advanceTimersByTime(450);
    expect(bridge.postMessage).toHaveBeenCalledTimes(1);
    const last = bridge.postMessage.mock.calls[0][0];
    expect(last).toContain('"interaction_type":"zoom"');
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
