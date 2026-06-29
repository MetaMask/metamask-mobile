/**
 * @jest-environment jsdom
 */
import { attachCrosshairListener } from '../crosshair';
import { __resetStateForTests, setOhlcvData } from '../../core/state';
import type { TVActiveChart, TVCrosshairParams } from '../../core/types';

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

describe('attachCrosshairListener', () => {
  beforeEach(() => {
    __resetStateForTests();
    delete (window as unknown as { ReactNativeWebView?: unknown })
      .ReactNativeWebView;
  });

  it('posts CROSSHAIR_MOVE with the nearest bar', () => {
    const bridge = installRNBridge();
    setOhlcvData([
      { time: 0, open: 1, high: 1, low: 1, close: 1 },
      { time: 60_000, open: 2, high: 2, low: 2, close: 2 },
      { time: 120_000, open: 3, high: 3, low: 3, close: 3 },
    ]);
    const { chart, emit } = makeChart();
    attachCrosshairListener(chart);
    emit({ time: 65, price: 1.5, offsetX: 10, offsetY: 20 }); // 65s = 65_000ms → nearest is 60_000
    const last = bridge.postMessage.mock.calls.at(-1)?.[0];
    expect(last).toContain('"type":"CROSSHAIR_MOVE"');
    expect(last).toContain('"time":60000');
  });

  it('posts CROSSHAIR_MOVE with bar=null on dismiss', () => {
    const bridge = installRNBridge();
    setOhlcvData([{ time: 0, open: 1, high: 1, low: 1, close: 1 }]);
    const { chart, emit } = makeChart();
    attachCrosshairListener(chart);
    emit({ time: undefined, price: undefined });
    const last = bridge.postMessage.mock.calls.at(-1)?.[0];
    expect(last).toContain('"bar":null');
  });

  it('posts bar=null when ohlcvData is empty', () => {
    const bridge = installRNBridge();
    const { chart, emit } = makeChart();
    attachCrosshairListener(chart);
    emit({ time: 1, price: 1 });
    expect(bridge.postMessage).toHaveBeenCalledWith(
      expect.stringContaining('"bar":null'),
    );
  });
});
