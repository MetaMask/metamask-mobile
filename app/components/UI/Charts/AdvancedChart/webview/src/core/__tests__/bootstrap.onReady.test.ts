/**
 * @jest-environment jsdom
 */
import { bootstrap } from '../bootstrap';
import { __resetStateForTests } from '../state';
import { loadTradingViewLibrary } from '../loadLibrary';
import {
  __resetHandlersForTests,
  dispatchInboundMessage,
} from '../../messages/handler';
import { __resetThemeForTests } from '../../widget/theme';
import { __resetOhlcvIngestionForTests } from '../../widget/ohlcvIngestion';
import { createChartWidget } from '../../widget/initChart';
import { attachNativeTradingViewBridge } from '../../features/nativeTradingView';
import type {
  ChartConfig,
  ChartTheme,
  TVActiveChart,
  TVChartingLibraryWidget,
} from '../types';

jest.mock('../loadLibrary', () => ({
  loadTradingViewLibrary: jest.fn(() => Promise.resolve()),
}));
jest.mock('../../widget/initChart', () => ({
  createChartWidget: jest.fn(),
  scheduleChartLayoutSettledNotify: jest.fn(),
}));
jest.mock('../../features/nativeTradingView', () => ({
  attachNativeTradingViewBridge: jest.fn(),
}));
jest.mock('../../interaction/crosshair', () => ({
  attachCrosshairListener: jest.fn(),
  attachTapDismiss: jest.fn(),
}));
jest.mock('../../interaction/visibleRange', () => ({
  attachVisibleRangeListeners: jest.fn(),
}));
jest.mock('../../overlays/tradeMarkers/markerHitTest', () => ({
  attachMarkerHitTest: jest.fn(),
}));
jest.mock('../../widget/scaleLayout', () => ({
  applyScaleLayout: jest.fn(),
}));
jest.mock('../../widget/visualOverrides', () => ({
  applyVisualOverrides: jest.fn(),
}));
jest.mock('../../features/indicators/legend', () => ({
  ...jest.requireActual('../../features/indicators/legend'),
  setupLegendOverlay: jest.fn(),
  attachLegendResizeListener: jest.fn(),
}));
jest.mock('../../overlays/socialLeaderboard', () => ({
  ...jest.requireActual('../../overlays/socialLeaderboard'),
  slbScheduleInitialCentering: jest.fn(),
}));

const theme: ChartTheme = {
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

interface MockBridge {
  postMessage: jest.Mock<void, [string]>;
}

const createChart = () => {
  const onSelectionChanged = jest.fn();
  const clearSelection = jest.fn();
  const setRightOffset = jest.fn();
  const chart = {
    getTimeScale: () => ({ setRightOffset }),
    selection: () => ({
      onChanged: () => ({ subscribe: onSelectionChanged }),
      clear: clearSelection,
    }),
  } as unknown as TVActiveChart;
  return { chart, onSelectionChanged, clearSelection, setRightOffset };
};

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

const bootUntilWidgetReady = async (
  features: ChartConfig['features'],
  chart: TVActiveChart,
) => {
  (window as unknown as { CONFIG?: ChartConfig }).CONFIG = {
    libraryUrl: 'https://cdn.example.com/',
    theme,
    features,
  };
  bootstrap();
  dispatchInboundMessage({
    type: 'SET_OHLCV_DATA',
    payload: {
      data: [{ time: 1_000_000, open: 1, high: 2, low: 0.5, close: 1.5 }],
    },
  });
  await flushPromises();
  const options = jest.mocked(createChartWidget).mock.calls[0][1];
  const widget = {
    activeChart: () => chart,
  } as unknown as TVChartingLibraryWidget;
  options.onReady?.(widget);
  return widget;
};

const errorMessages = (bridge: MockBridge) =>
  bridge.postMessage.mock.calls
    .map(([raw]) => JSON.parse(raw))
    .filter((message) => message.type === 'ERROR');

describe('core/bootstrap onChartReady wiring', () => {
  let bridge: MockBridge;

  beforeEach(() => {
    jest.clearAllMocks();
    __resetStateForTests();
    __resetHandlersForTests();
    __resetThemeForTests();
    __resetOhlcvIngestionForTests();
    bridge = { postMessage: jest.fn() };
    (
      window as unknown as { ReactNativeWebView: MockBridge }
    ).ReactNativeWebView = bridge;
    jest.spyOn(window, 'addEventListener').mockImplementation();
    jest.spyOn(document, 'addEventListener').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete (window as unknown as { CONFIG?: ChartConfig }).CONFIG;
    delete (window as unknown as { ReactNativeWebView?: unknown })
      .ReactNativeWebView;
  });

  it('clears every chart selection when native TradingView mode is off', async () => {
    const { chart, onSelectionChanged, clearSelection } = createChart();

    await bootUntilWidgetReady({}, chart);
    const [, onChanged] = onSelectionChanged.mock.calls[0];
    onChanged();

    expect(clearSelection).toHaveBeenCalledTimes(1);
    expect(attachNativeTradingViewBridge).not.toHaveBeenCalled();
  });

  it('keeps selection and attaches the native event bridge in native mode', async () => {
    const { chart, onSelectionChanged } = createChart();

    const widget = await bootUntilWidgetReady(
      { nativeTradingView: true },
      chart,
    );

    expect(attachNativeTradingViewBridge).toHaveBeenCalledWith(widget, chart);
    expect(onSelectionChanged).not.toHaveBeenCalled();
  });

  it('pins a right offset of two bars when no visible range was requested', async () => {
    const { chart, setRightOffset } = createChart();

    await bootUntilWidgetReady({}, chart);

    expect(setRightOffset).toHaveBeenCalledWith(2);
  });

  it('reports a right-offset failure and still wires the chart', async () => {
    const { chart, setRightOffset } = createChart();
    setRightOffset.mockImplementation(() => {
      throw new Error('time scale unavailable');
    });

    await bootUntilWidgetReady({ nativeTradingView: true }, chart);

    expect(errorMessages(bridge)).toEqual([
      { type: 'ERROR', payload: { message: 'time scale unavailable' } },
    ]);
    expect(attachNativeTradingViewBridge).toHaveBeenCalled();
  });

  it('reports an ERROR when the library fails to load for the first data', async () => {
    jest
      .mocked(loadTradingViewLibrary)
      .mockRejectedValue(new Error('library offline'));
    (window as unknown as { CONFIG?: ChartConfig }).CONFIG = {
      libraryUrl: 'https://cdn.example.com/',
      theme,
    };

    bootstrap();
    dispatchInboundMessage({
      type: 'SET_OHLCV_DATA',
      payload: {
        data: [{ time: 1_000_000, open: 1, high: 2, low: 0.5, close: 1.5 }],
      },
    });
    await flushPromises();

    expect(createChartWidget).not.toHaveBeenCalled();
    expect(errorMessages(bridge)).toContainEqual({
      type: 'ERROR',
      payload: { message: 'library offline' },
    });
  });
});
