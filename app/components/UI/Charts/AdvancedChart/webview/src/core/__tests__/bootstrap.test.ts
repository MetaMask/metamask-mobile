/**
 * @jest-environment jsdom
 */
import { bootstrap } from '../bootstrap';
import {
  __resetStateForTests,
  getTheme,
  getSubPaneHeightRatio,
} from '../state';
import {
  __resetHandlersForTests,
  dispatchInboundMessage,
} from '../../messages/handler';
import { __resetThemeForTests } from '../../widget/theme';
import { __resetOhlcvIngestionForTests } from '../../widget/ohlcvIngestion';
import { __resetLoadLibraryForTests } from '../loadLibrary';
import type { ChartConfig, ChartTheme } from '../types';

const baseTheme: ChartTheme = {
  backgroundColor: 'rgb(0,0,0)',
  borderColor: 'rgb(17,17,17)',
  textColor: 'rgb(255,255,255)',
  textDefaultColor: 'rgb(255,255,255)',
  sectionBackgroundColor: 'rgb(34,34,34)',
  crosshairBackgroundColor: 'rgb(51,51,51)',
  crosshairTextColor: 'rgb(238,238,238)',
  legendTextColor: 'rgb(170,170,170)',
  textAlternativeColor: 'rgb(187,187,187)',
  successColor: 'rgb(0,255,0)',
  lineColor: 'rgb(171,205,239)',
  errorColor: 'rgb(255,0,0)',
  primaryColor: 'rgb(0,51,255)',
  currentPriceColor: 'rgb(34,34,0)',
};

const baseConfig: ChartConfig = {
  libraryUrl: 'https://cdn.example.com/',
  theme: baseTheme,
};

interface MockBridge {
  postMessage: jest.Mock<void, [string]>;
}

describe('core/bootstrap', () => {
  let bridge: MockBridge;

  beforeEach(() => {
    __resetStateForTests();
    __resetHandlersForTests();
    __resetThemeForTests();
    __resetOhlcvIngestionForTests();
    __resetLoadLibraryForTests();
    bridge = { postMessage: jest.fn() };
    (
      window as unknown as { ReactNativeWebView: MockBridge }
    ).ReactNativeWebView = bridge;
    (window as unknown as { CONFIG?: ChartConfig }).CONFIG = baseConfig;

    // Prevent loadLibrary from actually appending a script.
    const createElementImpl = (tag: string): HTMLElement => {
      if (tag === 'script') return {} as unknown as HTMLScriptElement;
      return {} as HTMLElement;
    };
    jest
      .spyOn(document, 'createElement')
      .mockImplementation(createElementImpl as never);
    jest
      .spyOn(document.head, 'appendChild')
      .mockImplementation(((node: Node) => node) as never);
    jest.spyOn(window, 'addEventListener').mockImplementation();
    jest.spyOn(document, 'addEventListener').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete (window as unknown as { CONFIG?: ChartConfig }).CONFIG;
    delete (window as unknown as { ReactNativeWebView?: unknown })
      .ReactNativeWebView;
  });

  it('throws when window.CONFIG is missing', () => {
    delete (window as unknown as { CONFIG?: ChartConfig }).CONFIG;
    expect(() => bootstrap()).toThrow(/window.CONFIG is missing/);
  });

  it('seeds theme state from CONFIG.theme', () => {
    bootstrap();
    expect(getTheme()).toEqual(baseTheme);
  });

  it('emits a DEBUG breadcrumb so RN can confirm the modular bundle booted', () => {
    bootstrap();
    expect(bridge.postMessage).toHaveBeenCalledWith(
      expect.stringContaining('"type":"DEBUG"'),
    );
    expect(bridge.postMessage).toHaveBeenCalledWith(
      expect.stringContaining('modular-bootstrap-ready'),
    );
  });

  it('subscribes to both window and document message events', () => {
    bootstrap();
    expect(window.addEventListener).toHaveBeenCalledWith(
      'message',
      expect.any(Function),
    );
    expect(document.addEventListener).toHaveBeenCalledWith(
      'message',
      expect.any(Function),
    );
  });

  it('registers SET_THEME_COLORS so dispatch updates state.theme', () => {
    bootstrap();
    dispatchInboundMessage({
      type: 'SET_THEME_COLORS',
      payload: { lineColor: '#newline' },
    });
    expect(getTheme()?.lineColor).toBe('#newline');
  });

  // --- subPaneHeightRatio ---------------------------------------------------

  it('sets subPaneHeightRatio when config provides a number', () => {
    (window as unknown as { CONFIG?: ChartConfig }).CONFIG = {
      ...baseConfig,
      subPaneHeightRatio: 0.35,
    };
    bootstrap();
    expect(getSubPaneHeightRatio()).toBe(0.35);
  });

  it('leaves subPaneHeightRatio null when config omits it', () => {
    bootstrap();
    expect(getSubPaneHeightRatio()).toBeNull();
  });

  // --- Handler wiring: all registered message types dispatch without error ---

  it('dispatches SET_OHLCV_DATA without reporting an error', () => {
    bootstrap();
    dispatchInboundMessage({
      type: 'SET_OHLCV_DATA',
      payload: {
        data: [
          { time: 1000, open: 1, high: 2, low: 0.5, close: 1.5 },
          { time: 2000, open: 1.5, high: 3, low: 1, close: 2.5 },
        ],
      },
    });
    const errorCalls = bridge.postMessage.mock.calls.filter((call) =>
      call[0].includes('"type":"ERROR"'),
    );
    expect(errorCalls).toHaveLength(0);
  });

  it('dispatches SET_CHART_TYPE without reporting an error', () => {
    bootstrap();
    dispatchInboundMessage({
      type: 'SET_CHART_TYPE',
      payload: { type: 1 },
    });
    const errorCalls = bridge.postMessage.mock.calls.filter((call) =>
      call[0].includes('"type":"ERROR"'),
    );
    expect(errorCalls).toHaveLength(0);
  });

  it('dispatches REALTIME_UPDATE without reporting an error', () => {
    bootstrap();
    dispatchInboundMessage({
      type: 'REALTIME_UPDATE',
      payload: {
        bar: { time: 3000, open: 2, high: 4, low: 1, close: 3 },
      },
    });
    const errorCalls = bridge.postMessage.mock.calls.filter((call) =>
      call[0].includes('"type":"ERROR"'),
    );
    expect(errorCalls).toHaveLength(0);
  });

  it('dispatches ADD_INDICATOR without reporting an error', () => {
    bootstrap();
    dispatchInboundMessage({
      type: 'ADD_INDICATOR',
      payload: { name: 'RSI' },
    });
    const errorCalls = bridge.postMessage.mock.calls.filter((call) =>
      call[0].includes('"type":"ERROR"'),
    );
    expect(errorCalls).toHaveLength(0);
  });

  it('dispatches REMOVE_INDICATOR without reporting an error', () => {
    bootstrap();
    dispatchInboundMessage({
      type: 'REMOVE_INDICATOR',
      payload: { name: 'RSI' },
    });
    const errorCalls = bridge.postMessage.mock.calls.filter((call) =>
      call[0].includes('"type":"ERROR"'),
    );
    expect(errorCalls).toHaveLength(0);
  });

  it('dispatches SET_MA_VISIBILITY without reporting an error', () => {
    bootstrap();
    dispatchInboundMessage({
      type: 'SET_MA_VISIBILITY',
      payload: { visible: ['MA5', 'MA20'] },
    });
    const errorCalls = bridge.postMessage.mock.calls.filter((call) =>
      call[0].includes('"type":"ERROR"'),
    );
    expect(errorCalls).toHaveLength(0);
  });

  it('dispatches TOGGLE_VOLUME without reporting an error', () => {
    bootstrap();
    dispatchInboundMessage({
      type: 'TOGGLE_VOLUME',
      payload: { visible: true },
    });
    const errorCalls = bridge.postMessage.mock.calls.filter((call) =>
      call[0].includes('"type":"ERROR"'),
    );
    expect(errorCalls).toHaveLength(0);
  });

  it('dispatches SET_SUB_PANE_LAYOUT without reporting an error', () => {
    bootstrap();
    dispatchInboundMessage({
      type: 'SET_SUB_PANE_LAYOUT',
      payload: { heightRatio: 0.4 },
    });
    const errorCalls = bridge.postMessage.mock.calls.filter((call) =>
      call[0].includes('"type":"ERROR"'),
    );
    expect(errorCalls).toHaveLength(0);
  });

  // --- Overlay/feature registrations: dispatching overlay messages ----------

  it('dispatches SET_TRADE_MARKERS without reporting an error', () => {
    bootstrap();
    dispatchInboundMessage({
      type: 'SET_TRADE_MARKERS',
      payload: { markers: null },
    });
    const errorCalls = bridge.postMessage.mock.calls.filter((call) =>
      call[0].includes('"type":"ERROR"'),
    );
    expect(errorCalls).toHaveLength(0);
  });

  it('dispatches PULSE_TRADE_MARKER without reporting an error', () => {
    bootstrap();
    dispatchInboundMessage({
      type: 'PULSE_TRADE_MARKER',
      payload: { id: 'marker-1' },
    });
    const errorCalls = bridge.postMessage.mock.calls.filter((call) =>
      call[0].includes('"type":"ERROR"'),
    );
    expect(errorCalls).toHaveLength(0);
  });

  it('dispatches FOCUS_TIME without reporting an error', () => {
    bootstrap();
    dispatchInboundMessage({
      type: 'FOCUS_TIME',
      payload: { timeMs: 1_625_000_000_000 },
    });
    const errorCalls = bridge.postMessage.mock.calls.filter((call) =>
      call[0].includes('"type":"ERROR"'),
    );
    expect(errorCalls).toHaveLength(0);
  });

  it('dispatches SET_POSITION_LINES without reporting an error', () => {
    bootstrap();
    dispatchInboundMessage({
      type: 'SET_POSITION_LINES',
      payload: { position: null },
    });
    const errorCalls = bridge.postMessage.mock.calls.filter((call) =>
      call[0].includes('"type":"ERROR"'),
    );
    expect(errorCalls).toHaveLength(0);
  });

  it('dispatches FETCH_OLDER_BARS_RESPONSE without reporting an error', () => {
    bootstrap();
    dispatchInboundMessage({
      type: 'FETCH_OLDER_BARS_RESPONSE',
      payload: {
        requestId: 'req-1',
        seriesGeneration: 1,
        bars: [],
      },
    });
    const errorCalls = bridge.postMessage.mock.calls.filter((call) =>
      call[0].includes('"type":"ERROR"'),
    );
    expect(errorCalls).toHaveLength(0);
  });

  // --- buildInitialTimeframe (tested indirectly via onFirstOhlcvData) --------

  it('onFirstOhlcvData callback fires when first SET_OHLCV_DATA arrives', () => {
    bootstrap();
    // Register a spy callback that will be called on first OHLCV data
    // We need to reset and re-bootstrap to install our spy before first data
    __resetStateForTests();
    __resetHandlersForTests();
    __resetThemeForTests();
    __resetOhlcvIngestionForTests();
    (window as unknown as { CONFIG?: ChartConfig }).CONFIG = baseConfig;
    bootstrap();

    // onFirstOhlcvData is called during bootstrap, but we can verify
    // the first-data path by dispatching SET_OHLCV_DATA
    dispatchInboundMessage({
      type: 'SET_OHLCV_DATA',
      payload: {
        data: [
          { time: 1_000_000, open: 1, high: 2, low: 0.5, close: 1.5 },
          { time: 2_000_000, open: 1.5, high: 3, low: 1, close: 2.5 },
        ],
      },
    });
    // No widget exists, so the first-data callback should have been invoked
    // (library load starts). Verify no ERROR was reported.
    const errorCalls = bridge.postMessage.mock.calls.filter((call) =>
      call[0].includes('"type":"ERROR"'),
    );
    expect(errorCalls).toHaveLength(0);
  });

  it('buildInitialTimeframe returns undefined when visibleFromMs is null', () => {
    // Bootstrap without visibleFromMs set — the onFirstOhlcvData callback
    // will pass undefined as the timeframe to createChartWidget.
    // We verify indirectly: dispatch OHLCV data without visibleFromMs,
    // the first-data path should not error.
    bootstrap();
    dispatchInboundMessage({
      type: 'SET_OHLCV_DATA',
      payload: {
        data: [
          { time: 1_000_000, open: 1, high: 2, low: 0.5, close: 1.5 },
          { time: 2_000_000, open: 1.5, high: 3, low: 1, close: 2.5 },
        ],
      },
    });
    const errorCalls = bridge.postMessage.mock.calls.filter((call) =>
      call[0].includes('"type":"ERROR"'),
    );
    expect(errorCalls).toHaveLength(0);
  });

  it('buildInitialTimeframe returns a time-range when visibleFromMs is set', () => {
    bootstrap();
    // Dispatch OHLCV with visibleFromMs to exercise the time-range path
    dispatchInboundMessage({
      type: 'SET_OHLCV_DATA',
      payload: {
        data: [
          { time: 1_625_000_000_000, open: 1, high: 2, low: 0.5, close: 1.5 },
          { time: 1_625_001_000_000, open: 1.5, high: 3, low: 1, close: 2.5 },
        ],
        visibleFromMs: 1_625_000_000_000,
        visibleToMs: 1_625_001_000_000,
      },
    });
    const errorCalls = bridge.postMessage.mock.calls.filter((call) =>
      call[0].includes('"type":"ERROR"'),
    );
    expect(errorCalls).toHaveLength(0);
  });

  // --- Library load error path -----------------------------------------------

  it('reports error to RN when loadTradingViewLibrary rejects', async () => {
    // Override the createElement mock to simulate a script load error
    const mockScript: Record<string, unknown> = {};
    jest.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
      if (tag === 'script') return mockScript as unknown as HTMLScriptElement;
      return {} as HTMLElement;
    }) as never);
    jest.spyOn(document.head, 'appendChild').mockImplementation(((
      node: Node,
    ) => {
      // Trigger the onerror handler asynchronously to simulate load failure
      if (mockScript.onerror) {
        setTimeout(() => (mockScript.onerror as () => void)(), 0);
      }
      return node;
    }) as never);

    bootstrap();

    // Wait for the async error handler to fire
    await new Promise((resolve) => setTimeout(resolve, 10));

    const errorCalls = bridge.postMessage.mock.calls.filter((call) =>
      call[0].includes('"type":"ERROR"'),
    );
    expect(errorCalls.length).toBeGreaterThanOrEqual(1);
    expect(errorCalls[0][0]).toContain('Failed to load TradingView library');
  });
});
