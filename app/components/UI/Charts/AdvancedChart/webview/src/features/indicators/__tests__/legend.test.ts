/**
 * @jest-environment jsdom
 */
import {
  __resetLegendForTests,
  attachLegendResizeListener,
  isLegendOverlayEnabled,
  onLegendCrosshairDismissed,
  refreshStudyLegendFromExport,
  renderLegendFromEntityValues,
  requestLegendRealtimeRefresh,
  scheduleLegendRefresh,
  setupLegendOverlay,
  subscribeStudyDataLoaded,
  updateLegendOverlayLayout,
} from '../legend';
import {
  __resetStateForTests,
  doesLegendOwnLayoutSettle,
  registerStudy,
  setChartReady,
  setLegendOwnsLayoutSettle,
  setOhlcvData,
  setTheme,
  setVolumeStudyId,
  setWidget,
} from '../../../core/state';
import type {
  ChartTheme,
  IndicatorColors,
  LegendIndicatorCfg,
  TVActiveChart,
  TVChartingLibraryWidget,
  TVExportData,
} from '../../../core/types';

jest.mock('../../../core/bridge', () => ({
  postToRN: jest.fn(),
}));

jest.mock('../../../widget/tvDomHelpers', () => ({
  eachChartDocument: jest.fn((fn: (doc: Document) => void) => {
    fn(globalThis.document);
  }),
}));

const { postToRN } = jest.requireMock<{
  postToRN: jest.Mock;
}>('../../../core/bridge');

const OVERLAY_ID = 'study-legend-overlay';

const installContainer = (): HTMLElement => {
  document.body.innerHTML = '<div id="tv_chart_container"></div>';
  return document.getElementById('tv_chart_container') as HTMLElement;
};

const makeTheme = (overrides?: Partial<ChartTheme>): ChartTheme => ({
  backgroundColor: 'rgb(0,0,0)',
  borderColor: 'rgb(1,1,1)',
  textColor: 'rgb(200,200,200)',
  textDefaultColor: 'rgb(150,150,150)',
  sectionBackgroundColor: 'rgb(20,20,20)',
  crosshairBackgroundColor: 'rgb(30,30,30)',
  crosshairTextColor: 'rgb(255,255,255)',
  legendTextColor: 'rgb(100,100,100)',
  textAlternativeColor: 'rgb(120,120,120)',
  successColor: 'rgb(38,166,154)',
  lineColor: 'rgb(50,50,50)',
  errorColor: 'rgb(255,0,0)',
  primaryColor: 'rgb(0,100,255)',
  currentPriceColor: 'rgb(200,200,0)',
  ...overrides,
});

const makeExportData = (
  schema: TVExportData['schema'],
  data: TVExportData['data'],
  displayedData?: TVExportData['displayedData'],
): TVExportData => ({ schema, data, displayedData });

const makeChart = (
  exportDataResult?: TVExportData | Error,
  paneHeights: number[] = [300],
  studyPaneMap: Record<string, number> = {},
): { chart: TVActiveChart; exportData: jest.Mock } => {
  const exportData =
    exportDataResult instanceof Error
      ? jest.fn().mockRejectedValue(exportDataResult)
      : jest.fn().mockResolvedValue(exportDataResult ?? makeExportData([], []));
  const getStudyById = jest.fn().mockImplementation((id: string) => {
    const paneIdx = studyPaneMap[id];
    if (paneIdx !== undefined) {
      return {
        paneIndex: () => paneIdx,
        onDataLoaded: () => ({ subscribe: jest.fn() }),
      };
    }
    return null;
  });
  const chart = {
    exportData,
    getStudyById,
    getAllPanesHeight: jest.fn().mockReturnValue(paneHeights),
  } as unknown as TVActiveChart;
  return { chart, exportData };
};

const setupReadyWidget = (chart: TVActiveChart): void => {
  setWidget({
    activeChart: () => chart,
  } as unknown as TVChartingLibraryWidget);
  setChartReady(true);
};

const defaultTestConfig: Record<string, LegendIndicatorCfg> = {
  MACD: {
    subPaneLegend: true,
    plots: [
      { tvTitle: 'MACD', label: 'MACD(12,26)', color: null },
      { tvTitle: 'Signal', label: 'Signal', color: null },
      { tvTitle: 'Histogram', label: 'Hist', color: null },
    ],
  },
  RSI: {
    subPaneLegend: true,
    plots: [{ tvTitle: 'Plot', label: 'RSI(14)', color: null }],
  },
  BOL: {
    combineInOnePill: true,
    title: 'BB(20,2)',
    plots: [
      { tvTitle: 'Upper', label: 'U:', color: null },
      { tvTitle: 'Median', label: 'M:', color: null },
      { tvTitle: 'Lower', label: 'L:', color: null },
    ],
  },
  Volume: {
    valueFormat: 'compact',
    plots: [{ tvTitle: 'Volume', label: 'Vol', color: null }],
  },
  MA5: {
    isMA: true,
    plots: [{ tvTitle: 'Plot', label: 'MA(5)', color: null }],
  },
  MA10: {
    isMA: true,
    plots: [{ tvTitle: 'Plot', label: 'MA(10)', color: null }],
  },
  MA20: {
    isMA: true,
    plots: [{ tvTitle: 'Plot', label: 'MA(20)', color: null }],
  },
  MA50: {
    isMA: true,
    plots: [{ tvTitle: 'Plot', label: 'MA(50)', color: null }],
  },
  MA200: {
    isMA: true,
    plots: [{ tvTitle: 'Plot', label: 'MA(200)', color: null }],
  },
};

const buildTestConfig = (
  colors?: IndicatorColors,
): Record<string, LegendIndicatorCfg> => {
  if (!colors) return defaultTestConfig;
  const macd = colors.MACD ?? {};
  const rsi = colors.RSI ?? {};
  return {
    ...defaultTestConfig,
    MACD: {
      ...defaultTestConfig.MACD,
      plots: [
        {
          tvTitle: 'MACD',
          label: 'MACD(12,26)',
          color: macd.macd ?? null,
        },
        {
          tvTitle: 'Signal',
          label: 'Signal',
          color: macd.signal ?? null,
        },
        {
          tvTitle: 'Histogram',
          label: 'Hist',
          color: macd.histogramPositive ?? null,
        },
      ],
    },
    RSI: {
      ...defaultTestConfig.RSI,
      plots: [
        {
          tvTitle: 'Plot',
          label: 'RSI(14)',
          color: rsi.plot ?? null,
        },
      ],
    },
  };
};

const enableOverlayWithStudies = (
  chart: TVActiveChart,
  colors?: IndicatorColors,
): void => {
  installContainer();
  setupLegendOverlay({ enabled: true, config: buildTestConfig(colors) });
  setupReadyWidget(chart);
};

describe('legend', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((cb: FrameRequestCallback) => {
        cb(0);
        return 0;
      });
    __resetStateForTests();
    __resetLegendForTests();
    document.body.innerHTML = '';
    postToRN.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  describe('setupLegendOverlay', () => {
    it('is a no-op when config is undefined', () => {
      installContainer();
      setupLegendOverlay(undefined);
      expect(document.getElementById(OVERLAY_ID)).toBeNull();
    });

    it('is a no-op when enabled is false', () => {
      installContainer();
      setupLegendOverlay({ enabled: false });
      expect(document.getElementById(OVERLAY_ID)).toBeNull();
    });

    it('creates the overlay element inside tv_chart_container', () => {
      const container = installContainer();
      setupLegendOverlay({ enabled: true });
      const overlay = document.getElementById(OVERLAY_ID);
      expect(overlay).not.toBeNull();
      expect(overlay?.parentElement).toBe(container);
    });

    it('sets container position to relative', () => {
      const container = installContainer();
      setupLegendOverlay({ enabled: true });
      expect(container.style.position).toBe('relative');
    });

    it('replaces an existing overlay if called twice', () => {
      installContainer();
      setupLegendOverlay({ enabled: true });
      setupLegendOverlay({ enabled: true });
      expect(document.querySelectorAll(`#${OVERLAY_ID}`).length).toBe(1);
    });

    it('does nothing when tv_chart_container is missing', () => {
      document.body.innerHTML = '';
      setupLegendOverlay({ enabled: true });
      expect(document.getElementById(OVERLAY_ID)).toBeNull();
    });

    it('injects a style element to hide TV legend buttons', () => {
      installContainer();
      setupLegendOverlay({ enabled: true });
      const style = document.getElementById('mm-hide-legend-buttons');
      expect(style).not.toBeNull();
      expect(style?.textContent).toContain('display:none!important');
    });

    it('does not duplicate the CSS style on second setup call', () => {
      installContainer();
      setupLegendOverlay({ enabled: true });
      setupLegendOverlay({ enabled: true });
      expect(document.querySelectorAll('#mm-hide-legend-buttons').length).toBe(
        1,
      );
    });
  });

  describe('attachLegendResizeListener', () => {
    const mockActiveChart = () =>
      ({
        getAllPanesHeight: jest.fn().mockReturnValue([300]),
      }) as unknown as TVActiveChart;

    it('subscribes to panes_height_changed and triggers layout update', () => {
      const container = installContainer();
      setupLegendOverlay({ enabled: true });
      Object.defineProperty(container, 'clientWidth', {
        value: 400,
        configurable: true,
      });
      let handler: (() => void) | undefined;
      const widget = {
        subscribe: jest.fn((_event: string, cb: () => void) => {
          handler = cb;
        }),
        activeChart: mockActiveChart,
      };
      attachLegendResizeListener(widget);
      expect(widget.subscribe).toHaveBeenCalledWith(
        'panes_height_changed',
        expect.any(Function),
      );
      handler?.();
      const overlay = document.getElementById(OVERLAY_ID);
      // 400 - 8 - 48 (fallback, no widget set) - 4 = 340
      expect(overlay?.style.maxWidth).toBe('340px');
    });

    it('does not throw when subscribe throws', () => {
      const widget = {
        subscribe: jest.fn(() => {
          throw new Error('not ready');
        }),
        activeChart: mockActiveChart,
      };
      expect(() => attachLegendResizeListener(widget)).not.toThrow();
    });

    it('does not update layout when overlay element is missing', () => {
      let handler: (() => void) | undefined;
      const widget = {
        subscribe: jest.fn((_event: string, cb: () => void) => {
          handler = cb;
        }),
        activeChart: mockActiveChart,
      };
      attachLegendResizeListener(widget);
      expect(() => handler?.()).not.toThrow();
    });
  });

  describe('refreshStudyLegendFromExport', () => {
    it('is a no-op when overlay is disabled', () => {
      expect(() => refreshStudyLegendFromExport()).not.toThrow();
    });

    it('is a no-op when widget is null', () => {
      installContainer();
      setupLegendOverlay({ enabled: true });
      expect(() => refreshStudyLegendFromExport()).not.toThrow();
    });

    it('is a no-op when chart is not ready', () => {
      installContainer();
      setupLegendOverlay({ enabled: true });
      const { chart } = makeChart();
      setWidget({
        activeChart: () => chart,
      } as unknown as TVChartingLibraryWidget);
      refreshStudyLegendFromExport();
      expect(chart.exportData).not.toHaveBeenCalled();
    });

    it('clears overlay HTML when no studies are registered', () => {
      const { chart } = makeChart();
      enableOverlayWithStudies(chart);
      const overlay = document.getElementById(OVERLAY_ID) as HTMLElement;
      overlay.innerHTML = '<span class="legend-pill">stale</span>';
      refreshStudyLegendFromExport();
      expect(overlay.innerHTML).toBe('');
    });

    it('calls exportData with registered active study IDs', () => {
      const { chart, exportData } = makeChart();
      enableOverlayWithStudies(chart);
      registerStudy('active', 'MACD', 'sid-macd');
      refreshStudyLegendFromExport();
      expect(exportData).toHaveBeenCalledWith({
        includeSeries: false,
        includeDisplayedValues: true,
        includeOffsetStudyValues: false,
        includedStudies: ['sid-macd'],
      });
    });

    it('includes MA studies in the export request', () => {
      const { chart, exportData } = makeChart();
      enableOverlayWithStudies(chart);
      registerStudy('ma', 'MA5', 'sid-ma5');
      refreshStudyLegendFromExport();
      expect(exportData).toHaveBeenCalledWith({
        includeSeries: false,
        includeDisplayedValues: true,
        includeOffsetStudyValues: false,
        includedStudies: ['sid-ma5'],
      });
    });

    it('includes volume study in the export request', () => {
      const { chart, exportData } = makeChart();
      enableOverlayWithStudies(chart);
      setVolumeStudyId('sid-vol');
      refreshStudyLegendFromExport();
      expect(exportData).toHaveBeenCalledWith({
        includeSeries: false,
        includeDisplayedValues: true,
        includeOffsetStudyValues: false,
        includedStudies: ['sid-vol'],
      });
    });

    it('renders MACD legend pills from export data', async () => {
      const colors: IndicatorColors = {
        MACD: {
          macd: 'rgb(255, 0, 0)',
          signal: 'rgb(0, 255, 0)',
          histogramPositive: 'rgb(0, 0, 255)',
        },
      };
      const data = makeExportData(
        [
          { type: 'time' },
          { type: 'number', sourceId: 'sid-macd', plotTitle: 'MACD' },
          { type: 'number', sourceId: 'sid-macd', plotTitle: 'Signal' },
          { type: 'number', sourceId: 'sid-macd', plotTitle: 'Histogram' },
        ],
        [[1000, 12.5, 11.3, 1.2]],
      );
      const { chart } = makeChart(data);
      enableOverlayWithStudies(chart, colors);
      registerStudy('active', 'MACD', 'sid-macd');
      refreshStudyLegendFromExport();
      await Promise.resolve();
      const overlay = document.getElementById(OVERLAY_ID) as HTMLElement;
      expect(overlay.querySelectorAll('.legend-pill').length).toBe(3);
      expect(overlay.innerHTML).toContain('MACD(12,26)');
      expect(overlay.innerHTML).toContain('Signal');
      expect(overlay.innerHTML).toContain('Hist');
    });

    it('renders RSI legend pill from export data', async () => {
      const colors: IndicatorColors = {
        RSI: { plot: 'rgb(170, 187, 0)' },
      };
      const data = makeExportData(
        [
          { type: 'time' },
          { type: 'number', sourceId: 'sid-rsi', plotTitle: 'Plot' },
        ],
        [[1000, 65.42]],
      );
      const { chart } = makeChart(data);
      enableOverlayWithStudies(chart, colors);
      registerStudy('active', 'RSI', 'sid-rsi');
      refreshStudyLegendFromExport();
      await Promise.resolve();
      const overlay = document.getElementById(OVERLAY_ID) as HTMLElement;
      expect(overlay.querySelectorAll('.legend-pill').length).toBe(1);
      expect(overlay.innerHTML).toContain('RSI(14)');
      expect(overlay.innerHTML).toContain('65.42');
    });

    it('renders Bollinger Bands in a single combined pill', async () => {
      const colors: IndicatorColors = {
        BOL: {
          upper: 'rgb(170, 0, 0)',
          basis: 'rgb(0, 170, 0)',
          lower: 'rgb(0, 0, 170)',
        },
      };
      const data = makeExportData(
        [
          { type: 'time' },
          { type: 'number', sourceId: 'sid-bol', plotTitle: 'Upper' },
          { type: 'number', sourceId: 'sid-bol', plotTitle: 'Median' },
          { type: 'number', sourceId: 'sid-bol', plotTitle: 'Lower' },
        ],
        [[1000, 105.5, 100.0, 94.5]],
      );
      const { chart } = makeChart(data);
      enableOverlayWithStudies(chart, colors);
      registerStudy('active', 'BOL', 'sid-bol');
      refreshStudyLegendFromExport();
      await Promise.resolve();
      const overlay = document.getElementById(OVERLAY_ID) as HTMLElement;
      expect(overlay.querySelectorAll('.legend-pill').length).toBe(1);
      expect(overlay.innerHTML).toContain('BB(20,2)');
      expect(overlay.innerHTML).toContain('U:');
      expect(overlay.innerHTML).toContain('M:');
      expect(overlay.innerHTML).toContain('L:');
    });

    it('renders MA pill from export data', async () => {
      const colors: IndicatorColors = {
        MA: { MA10: 'rgb(17, 34, 51)' },
      };
      const data = makeExportData(
        [
          { type: 'time' },
          { type: 'number', sourceId: 'sid-ma10', plotTitle: 'Plot' },
        ],
        [[1000, 42.56]],
      );
      const { chart } = makeChart(data);
      enableOverlayWithStudies(chart, colors);
      registerStudy('ma', 'MA10', 'sid-ma10');
      refreshStudyLegendFromExport();
      await Promise.resolve();
      const overlay = document.getElementById(OVERLAY_ID) as HTMLElement;
      expect(overlay.querySelectorAll('.legend-pill').length).toBe(1);
      expect(overlay.innerHTML).toContain('MA(10)');
      expect(overlay.innerHTML).toContain('42.56');
    });

    it('skips MA pill when value is empty', async () => {
      const data = makeExportData(
        [
          { type: 'time' },
          { type: 'number', sourceId: 'sid-ma5', plotTitle: 'Plot' },
        ],
        [[1000, NaN]],
      );
      const { chart } = makeChart(data);
      enableOverlayWithStudies(chart);
      registerStudy('ma', 'MA5', 'sid-ma5');
      refreshStudyLegendFromExport();
      await Promise.resolve();
      const overlay = document.getElementById(OVERLAY_ID) as HTMLElement;
      expect(overlay.querySelectorAll('.legend-pill').length).toBe(0);
    });

    it('renders Volume pill from export data', async () => {
      const data = makeExportData(
        [
          { type: 'time' },
          { type: 'number', sourceId: 'sid-vol', plotTitle: 'Volume' },
        ],
        [[1000, 5000000]],
      );
      const { chart } = makeChart(data);
      enableOverlayWithStudies(chart);
      setVolumeStudyId('sid-vol');
      refreshStudyLegendFromExport();
      await Promise.resolve();
      const overlay = document.getElementById(OVERLAY_ID) as HTMLElement;
      expect(overlay.innerHTML).toContain('Vol');
      expect(overlay.innerHTML).toContain('5.00M');
    });

    it('uses theme legendTextColor for alt color', async () => {
      setTheme(makeTheme({ legendTextColor: 'rgb(77,88,99)' }));
      const data = makeExportData(
        [
          { type: 'time' },
          { type: 'number', sourceId: 'sid-rsi', plotTitle: 'Plot' },
        ],
        [[1000, 50.0]],
      );
      const { chart } = makeChart(data);
      enableOverlayWithStudies(chart);
      registerStudy('active', 'RSI', 'sid-rsi');
      refreshStudyLegendFromExport();
      await Promise.resolve();
      const overlay = document.getElementById(OVERLAY_ID) as HTMLElement;
      expect(overlay.innerHTML).toContain('rgb(77,88,99)');
    });

    it('falls back to textAlternativeColor when legendTextColor is absent', async () => {
      setTheme(
        makeTheme({
          legendTextColor: undefined as unknown as string,
          textAlternativeColor: 'rgb(11,22,33)',
        }),
      );
      const data = makeExportData(
        [
          { type: 'time' },
          { type: 'number', sourceId: 'sid-rsi', plotTitle: 'Plot' },
        ],
        [[1000, 50.0]],
      );
      const { chart } = makeChart(data);
      enableOverlayWithStudies(chart);
      registerStudy('active', 'RSI', 'sid-rsi');
      refreshStudyLegendFromExport();
      await Promise.resolve();
      const overlay = document.getElementById(OVERLAY_ID) as HTMLElement;
      expect(overlay.innerHTML).toContain('rgb(11,22,33)');
    });

    it('falls back to default alt color when theme is null', async () => {
      const data = makeExportData(
        [
          { type: 'time' },
          { type: 'number', sourceId: 'sid-rsi', plotTitle: 'Plot' },
        ],
        [[1000, 50.0]],
      );
      const { chart } = makeChart(data);
      enableOverlayWithStudies(chart);
      registerStudy('active', 'RSI', 'sid-rsi');
      refreshStudyLegendFromExport();
      await Promise.resolve();
      const overlay = document.getElementById(OVERLAY_ID) as HTMLElement;
      expect(overlay.innerHTML).toContain('rgb(133,136,152)');
    });

    it('uses successColor fallback for plot color when indicatorColors not set', async () => {
      setTheme(makeTheme({ successColor: 'rgb(0,255,0)' }));
      const data = makeExportData(
        [
          { type: 'time' },
          { type: 'number', sourceId: 'sid-rsi', plotTitle: 'Plot' },
        ],
        [[1000, 50.0]],
      );
      const { chart } = makeChart(data);
      enableOverlayWithStudies(chart);
      registerStudy('active', 'RSI', 'sid-rsi');
      refreshStudyLegendFromExport();
      await Promise.resolve();
      const overlay = document.getElementById(OVERLAY_ID) as HTMLElement;
      expect(overlay.innerHTML).toContain('rgb(0,255,0)');
    });

    it('retries when exportData rejects', async () => {
      const { chart, exportData } = makeChart(new Error('fail'));
      enableOverlayWithStudies(chart);
      registerStudy('active', 'MACD', 'sid-macd');
      refreshStudyLegendFromExport();
      await Promise.resolve();
      await Promise.resolve();
      exportData.mockResolvedValueOnce(
        makeExportData(
          [
            { type: 'time' },
            { type: 'number', sourceId: 'sid-macd', plotTitle: 'MACD' },
          ],
          [[1000, 12.5]],
        ),
      );
      jest.advanceTimersByTime(100);
      expect(exportData).toHaveBeenCalledTimes(2);
    });

    it('retries when exportData returns invalid data', async () => {
      const invalidData = makeExportData([], []);
      const { chart, exportData } = makeChart(invalidData);
      enableOverlayWithStudies(chart);
      registerStudy('active', 'MACD', 'sid-macd');
      refreshStudyLegendFromExport();
      await Promise.resolve();
      jest.advanceTimersByTime(100);
      expect(exportData).toHaveBeenCalledTimes(2);
    });

    it('retries when data has empty values and retries remain', async () => {
      const data = makeExportData(
        [
          { type: 'time' },
          { type: 'number', sourceId: 'sid-rsi', plotTitle: 'Plot' },
        ],
        [[1000, NaN]],
      );
      const { chart, exportData } = makeChart(data);
      enableOverlayWithStudies(chart);
      registerStudy('active', 'RSI', 'sid-rsi');
      refreshStudyLegendFromExport();
      await Promise.resolve();
      jest.advanceTimersByTime(100);
      expect(exportData).toHaveBeenCalledTimes(2);
    });

    it('stops retrying after MAX_RETRIES and sends LEGEND_RENDERED', async () => {
      const { chart } = makeChart(new Error('fail'));
      enableOverlayWithStudies(chart);
      registerStudy('active', 'MACD', 'sid-macd');

      refreshStudyLegendFromExport();
      for (let i = 0; i <= 11; i++) {
        await Promise.resolve();
        await Promise.resolve();
        jest.advanceTimersByTime(100);
      }

      expect(chart.exportData).toHaveBeenCalledTimes(11);
      expect(postToRN).toHaveBeenCalledWith('LEGEND_RENDERED', {});
    });

    it('sends LEGEND_RENDERED after render timeout when retries keep failing', async () => {
      const { chart } = makeChart(new Error('fail'));
      enableOverlayWithStudies(chart);
      registerStudy('active', 'MACD', 'sid-macd');
      refreshStudyLegendFromExport();
      jest.advanceTimersByTime(3000);
      expect(postToRN).toHaveBeenCalledWith('LEGEND_RENDERED', {});
    });

    it('posts LEGEND_RENDERED after successful render', async () => {
      const data = makeExportData(
        [
          { type: 'time' },
          { type: 'number', sourceId: 'sid-rsi', plotTitle: 'Plot' },
        ],
        [[1000, 50.0]],
      );
      const { chart } = makeChart(data);
      enableOverlayWithStudies(chart);
      registerStudy('active', 'RSI', 'sid-rsi');
      refreshStudyLegendFromExport();
      await Promise.resolve();
      expect(postToRN).toHaveBeenCalledWith('LEGEND_RENDERED', {});
    });

    it('prefers displayedData over raw values when available', async () => {
      const data = makeExportData(
        [
          { type: 'time' },
          { type: 'number', sourceId: 'sid-rsi', plotTitle: 'Plot' },
        ],
        [[1000, 50.123456]],
        [['', '$50.12']],
      );
      const { chart } = makeChart(data);
      enableOverlayWithStudies(chart);
      registerStudy('active', 'RSI', 'sid-rsi');
      refreshStudyLegendFromExport();
      await Promise.resolve();
      const overlay = document.getElementById(OVERLAY_ID) as HTMLElement;
      expect(overlay.innerHTML).toContain('$50.12');
    });

    it('skips schema fields with no sourceId', async () => {
      const data = makeExportData(
        [
          { type: 'time' },
          { type: 'number', plotTitle: 'Orphan' },
          { type: 'number', sourceId: 'sid-rsi', plotTitle: 'Plot' },
        ],
        [[1000, 99.0, 50.0]],
      );
      const { chart } = makeChart(data);
      enableOverlayWithStudies(chart);
      registerStudy('active', 'RSI', 'sid-rsi');
      refreshStudyLegendFromExport();
      await Promise.resolve();
      const overlay = document.getElementById(OVERLAY_ID) as HTMLElement;
      expect(overlay.innerHTML).toContain('RSI(14)');
    });

    it('skips entries for unknown study names', async () => {
      const data = makeExportData(
        [
          { type: 'time' },
          { type: 'number', sourceId: 'sid-unknown', plotTitle: 'Plot' },
        ],
        [[1000, 50.0]],
      );
      const { chart } = makeChart(data);
      enableOverlayWithStudies(chart);
      registerStudy('active', 'UnknownStudy', 'sid-unknown');
      refreshStudyLegendFromExport();
      await Promise.resolve();
      const overlay = document.getElementById(OVERLAY_ID) as HTMLElement;
      expect(overlay.querySelectorAll('.legend-pill').length).toBe(0);
    });

    it('skips plots with n/a values', async () => {
      const data = makeExportData(
        [
          { type: 'time' },
          { type: 'number', sourceId: 'sid-rsi', plotTitle: 'Plot' },
        ],
        [[1000, NaN]],
        [['', 'n/a']],
      );
      const { chart } = makeChart(data);
      enableOverlayWithStudies(chart);
      registerStudy('active', 'RSI', 'sid-rsi');
      refreshStudyLegendFromExport();
      await Promise.resolve();
      const overlay = document.getElementById(OVERLAY_ID) as HTMLElement;
      expect(overlay.querySelectorAll('.legend-pill').length).toBe(0);
    });

    it('skips BOL pill when all values are empty', async () => {
      const data = makeExportData(
        [
          { type: 'time' },
          { type: 'number', sourceId: 'sid-bol', plotTitle: 'Upper' },
          { type: 'number', sourceId: 'sid-bol', plotTitle: 'Median' },
          { type: 'number', sourceId: 'sid-bol', plotTitle: 'Lower' },
        ],
        [[1000, NaN, NaN, NaN]],
      );
      const { chart } = makeChart(data);
      enableOverlayWithStudies(chart);
      registerStudy('active', 'BOL', 'sid-bol');
      refreshStudyLegendFromExport();
      await Promise.resolve();
      const overlay = document.getElementById(OVERLAY_ID) as HTMLElement;
      expect(overlay.querySelectorAll('.legend-pill').length).toBe(0);
    });

    it('handles missing overlay element gracefully during render', async () => {
      const data = makeExportData(
        [
          { type: 'time' },
          { type: 'number', sourceId: 'sid-rsi', plotTitle: 'Plot' },
        ],
        [[1000, 50.0]],
      );
      const { chart } = makeChart(data);
      enableOverlayWithStudies(chart);
      registerStudy('active', 'RSI', 'sid-rsi');
      document.getElementById(OVERLAY_ID)?.remove();
      expect(() => refreshStudyLegendFromExport()).not.toThrow();
    });
  });

  describe('formatLegendValue via rendered pills', () => {
    const renderSingleValue = async (value: number): Promise<string> => {
      const data = makeExportData(
        [
          { type: 'time' },
          { type: 'number', sourceId: 'sid-rsi', plotTitle: 'Plot' },
        ],
        [[1000, value]],
      );
      const { chart } = makeChart(data);
      __resetLegendForTests();
      __resetStateForTests();
      enableOverlayWithStudies(chart);
      registerStudy('active', 'RSI', 'sid-rsi');
      refreshStudyLegendFromExport();
      await Promise.resolve();
      const overlay = document.getElementById(OVERLAY_ID) as HTMLElement;
      return overlay.innerHTML;
    };

    it('formats billions', async () => {
      const html = await renderSingleValue(2500000000);
      expect(html).toContain('2.50B');
    });

    it('formats millions', async () => {
      const html = await renderSingleValue(5000000);
      expect(html).toContain('5.00M');
    });

    it('formats tens of thousands with K suffix', async () => {
      const html = await renderSingleValue(15000);
      expect(html).toContain('15.0K');
    });

    it('formats thousands with 2 decimal places', async () => {
      const html = await renderSingleValue(1500.123);
      expect(html).toContain('1500.12');
    });

    it('formats values >= 1 with 2 decimal places', async () => {
      const html = await renderSingleValue(42.567);
      expect(html).toContain('42.57');
    });

    it('formats small values >= 0.01 with 4 decimal places', async () => {
      const html = await renderSingleValue(0.05123);
      expect(html).toContain('0.0512');
    });

    it('formats very small values with toPrecision(4)', async () => {
      const html = await renderSingleValue(0.001234);
      expect(html).toContain('0.001234');
    });

    it('formats negative values', async () => {
      const html = await renderSingleValue(-1500000);
      expect(html).toContain('-1.50M');
    });

    it('produces empty string for Infinity', async () => {
      const html = await renderSingleValue(Infinity);
      expect(html).not.toContain('Infinity');
      expect(document.querySelectorAll('.legend-pill').length).toBe(0);
    });
  });

  describe('updateLegendOverlayLayout', () => {
    it('is a no-op when overlay element does not exist', () => {
      expect(() => updateLegendOverlayLayout()).not.toThrow();
    });

    it('uses fallback scale width when no widget and container has width', () => {
      const container = installContainer();
      setupLegendOverlay({ enabled: true });
      Object.defineProperty(container, 'clientWidth', {
        value: 400,
        configurable: true,
      });
      updateLegendOverlayLayout();
      const overlay = document.getElementById(OVERLAY_ID);
      // 400 - 8 - 48 (fallback) - 4 = 340
      expect(overlay?.style.maxWidth).toBe('340px');
    });

    it('is a no-op when container element is missing', () => {
      const div = document.createElement('div');
      div.id = OVERLAY_ID;
      document.body.appendChild(div);
      expect(() => updateLegendOverlayLayout()).not.toThrow();
    });
  });

  describe('scheduleLegendRefresh', () => {
    it('triggers refreshStudyLegendFromExport via double rAF', () => {
      const { chart, exportData } = makeChart();
      enableOverlayWithStudies(chart);
      registerStudy('active', 'MACD', 'sid-macd');
      scheduleLegendRefresh();
      expect(exportData).toHaveBeenCalled();
    });
  });

  describe('subscribeStudyDataLoaded', () => {
    it('subscribes to onDataLoaded and schedules legend refresh', () => {
      let dataLoadedCb: (() => void) | undefined;
      const study = {
        onDataLoaded: () => ({
          subscribe: (_scope: unknown, cb: () => void) => {
            dataLoadedCb = cb;
          },
        }),
      };
      const chart = {
        getStudyById: jest.fn().mockReturnValue(study),
        exportData: jest.fn().mockResolvedValue(makeExportData([], [])),
      } as unknown as TVActiveChart;
      enableOverlayWithStudies(chart);
      registerStudy('active', 'RSI', 'sid-rsi');
      subscribeStudyDataLoaded(chart, 'sid-rsi');
      expect(chart.getStudyById).toHaveBeenCalledWith('sid-rsi');
      dataLoadedCb?.();
      expect(chart.exportData).toHaveBeenCalled();
    });

    it('falls back to direct refresh when getStudyById throws', () => {
      const { chart, exportData } = makeChart();
      (chart.getStudyById as jest.Mock).mockImplementation(() => {
        throw new Error('not found');
      });
      enableOverlayWithStudies(chart);
      registerStudy('active', 'RSI', 'sid-rsi');
      subscribeStudyDataLoaded(chart, 'sid-rsi');
      expect(exportData).toHaveBeenCalled();
    });

    it('falls back to direct refresh when study has no onDataLoaded', () => {
      const { chart, exportData } = makeChart();
      (chart.getStudyById as jest.Mock).mockReturnValue({});
      enableOverlayWithStudies(chart);
      registerStudy('active', 'RSI', 'sid-rsi');
      subscribeStudyDataLoaded(chart, 'sid-rsi');
      expect(exportData).toHaveBeenCalled();
    });

    it('falls back to direct refresh when study is null', () => {
      const { chart, exportData } = makeChart();
      (chart.getStudyById as jest.Mock).mockReturnValue(null);
      enableOverlayWithStudies(chart);
      registerStudy('active', 'RSI', 'sid-rsi');
      subscribeStudyDataLoaded(chart, 'sid-rsi');
      expect(exportData).toHaveBeenCalled();
    });
  });

  describe('multiple indicators rendered together', () => {
    it('renders pills in legend study order', async () => {
      const colors: IndicatorColors = {
        RSI: { plot: 'rgb(170, 0, 0)' },
        MACD: {
          macd: 'rgb(0, 170, 0)',
          signal: 'rgb(0, 0, 170)',
          histogramPositive: 'rgb(170, 170, 170)',
        },
      };
      const data = makeExportData(
        [
          { type: 'time' },
          { type: 'number', sourceId: 'sid-rsi', plotTitle: 'Plot' },
          { type: 'number', sourceId: 'sid-macd', plotTitle: 'MACD' },
          { type: 'number', sourceId: 'sid-macd', plotTitle: 'Signal' },
          { type: 'number', sourceId: 'sid-macd', plotTitle: 'Histogram' },
        ],
        [[1000, 65.0, 12.5, 11.3, 1.2]],
      );
      const { chart } = makeChart(data);
      enableOverlayWithStudies(chart, colors);
      registerStudy('active', 'RSI', 'sid-rsi');
      registerStudy('active', 'MACD', 'sid-macd');
      refreshStudyLegendFromExport();
      await Promise.resolve();
      const overlay = document.getElementById(OVERLAY_ID) as HTMLElement;
      expect(overlay.querySelectorAll('.legend-pill').length).toBe(4);
      const html = overlay.innerHTML;
      expect(html.indexOf('RSI(14)')).toBeLessThan(html.indexOf('MACD(12,26)'));
    });
  });

  describe('notifyLegendRendered — legendOwnsLayoutSettle integration', () => {
    it('posts CHART_LAYOUT_SETTLED and clears the flag when legendOwnsLayoutSettle is true', async () => {
      const data = makeExportData(
        [
          { type: 'time' },
          { type: 'number', sourceId: 'sid-rsi', plotTitle: 'Plot' },
        ],
        [[1000, 50.0]],
      );
      const { chart } = makeChart(data);
      enableOverlayWithStudies(chart);
      registerStudy('active', 'RSI', 'sid-rsi');
      setLegendOwnsLayoutSettle(true);

      refreshStudyLegendFromExport();
      await Promise.resolve();

      expect(postToRN).toHaveBeenCalledWith('LEGEND_RENDERED', {});
      expect(postToRN).toHaveBeenCalledWith('CHART_LAYOUT_SETTLED', {});
      expect(doesLegendOwnLayoutSettle()).toBe(false);
    });

    it('does not post CHART_LAYOUT_SETTLED when legendOwnsLayoutSettle is false', async () => {
      const data = makeExportData(
        [
          { type: 'time' },
          { type: 'number', sourceId: 'sid-rsi', plotTitle: 'Plot' },
        ],
        [[1000, 50.0]],
      );
      const { chart } = makeChart(data);
      enableOverlayWithStudies(chart);
      registerStudy('active', 'RSI', 'sid-rsi');

      refreshStudyLegendFromExport();
      await Promise.resolve();

      expect(postToRN).toHaveBeenCalledWith('LEGEND_RENDERED', {});
      expect(postToRN).not.toHaveBeenCalledWith(
        'CHART_LAYOUT_SETTLED',
        expect.anything(),
      );
    });

    it('posts CHART_LAYOUT_SETTLED via timeout fallback when legendOwnsLayoutSettle is true', () => {
      const { chart } = makeChart(new Error('fail'));
      enableOverlayWithStudies(chart);
      registerStudy('active', 'MACD', 'sid-macd');
      setLegendOwnsLayoutSettle(true);

      refreshStudyLegendFromExport();
      jest.advanceTimersByTime(3000);

      expect(postToRN).toHaveBeenCalledWith('CHART_LAYOUT_SETTLED', {});
      expect(doesLegendOwnLayoutSettle()).toBe(false);
    });
  });

  describe('handleExportData edge cases', () => {
    it('retries when data has valid schema but empty data array last row', async () => {
      const data = makeExportData(
        [
          { type: 'time' },
          { type: 'number', sourceId: 'sid-rsi', plotTitle: 'Plot' },
        ],
        [],
      );
      (data as { data: unknown[] }).data = [undefined];
      const { chart, exportData } = makeChart(data);
      enableOverlayWithStudies(chart);
      registerStudy('active', 'RSI', 'sid-rsi');
      refreshStudyLegendFromExport();
      await Promise.resolve();
      jest.advanceTimersByTime(100);
      expect(exportData).toHaveBeenCalledTimes(2);
    });
  });

  describe('updateLegendOverlayLayout with price scale API', () => {
    it('computes pixel max-width from price scale width', () => {
      const container = installContainer();
      setupLegendOverlay({ enabled: true });

      Object.defineProperty(container, 'clientWidth', {
        value: 400,
        configurable: true,
      });

      // v30.1.0 IPriceScaleApi has no width(): price axis width is derived
      // from container width - timeScale.width().
      const chart = {
        exportData: jest.fn().mockResolvedValue({ schema: [], data: [] }),
        getStudyById: jest.fn().mockReturnValue(null),
        getAllPanesHeight: jest.fn().mockReturnValue([400]),
        getTimeScale: () => ({ width: () => 350 }),
      } as unknown as TVActiveChart;
      setWidget({
        activeChart: () => chart,
      } as unknown as TVChartingLibraryWidget);
      setChartReady(true);

      updateLegendOverlayLayout();
      const overlay = document.getElementById(OVERLAY_ID);
      // 400 (container) - 8 (left pad) - (400 - 350) (scale) - 4 (gap) = 338
      expect(overlay?.style.maxWidth).toBe('338px');
    });

    it('falls back to 48px when timeScale.width() is not usable', () => {
      const container = installContainer();
      setupLegendOverlay({ enabled: true });
      Object.defineProperty(container, 'clientWidth', {
        value: 400,
        configurable: true,
      });
      const chart = {
        getTimeScale: () => ({ width: () => 0 }),
      } as unknown as TVActiveChart;
      setWidget({
        activeChart: () => chart,
      } as unknown as TVChartingLibraryWidget);
      updateLegendOverlayLayout();
      expect(document.getElementById(OVERLAY_ID)?.style.maxWidth).toBe('340px');
    });

    it('uses fallback scale width when no widget is set', () => {
      const container = installContainer();
      setupLegendOverlay({ enabled: true });

      Object.defineProperty(container, 'clientWidth', {
        value: 400,
        configurable: true,
      });

      updateLegendOverlayLayout();
      const overlay = document.getElementById(OVERLAY_ID);
      // 400 - 8 - 48 (fallback) - 4 = 340
      expect(overlay?.style.maxWidth).toBe('340px');
    });

    it('does not set maxWidth when container clientWidth is 0', () => {
      const container = installContainer();
      setupLegendOverlay({ enabled: true });

      Object.defineProperty(container, 'clientWidth', {
        value: 0,
        configurable: true,
      });

      updateLegendOverlayLayout();
      const overlay = document.getElementById(OVERLAY_ID);
      expect(overlay?.style.maxWidth).toBe('');
    });

    it('applies maxWidth to sub-pane overlays too', async () => {
      const container = installContainer();
      const rsiData = makeExportData(
        [
          { type: 'time' },
          { type: 'number', sourceId: 'sid-rsi', plotTitle: 'Plot' },
        ],
        [[1000, 55.5]],
      );
      setupLegendOverlay({
        enabled: true,
        config: {
          RSI: {
            subPaneLegend: true,
            plots: [{ tvTitle: 'Plot', label: 'RSI(14)', color: null }],
          },
        },
      });

      Object.defineProperty(container, 'clientWidth', {
        value: 400,
        configurable: true,
      });

      const { chart } = makeChart(rsiData, [300, 100], { 'sid-rsi': 1 });
      (chart as unknown as Record<string, unknown>).getTimeScale = () => ({
        width: () => 350,
      });
      setWidget({
        activeChart: () => chart,
      } as unknown as TVChartingLibraryWidget);
      setChartReady(true);
      registerStudy('active', 'RSI', 'sid-rsi');
      refreshStudyLegendFromExport();
      await Promise.resolve();

      updateLegendOverlayLayout();
      const subOverlay = container.querySelector(
        '[id^="study-legend-overlay-pane-"]',
      );
      expect(subOverlay).not.toBeNull();
      expect((subOverlay as HTMLElement).style.maxWidth).toBe('338px');
    });
  });

  describe('per-pane sub-pane legends', () => {
    const subPaneColors: IndicatorColors = {
      RSI: { plot: 'rgb(170,0,0)' },
      MACD: {
        macd: 'rgb(0,170,0)',
        signal: 'rgb(0,0,170)',
        histogramPositive: 'rgb(170,170,170)',
      },
    };

    const rsiMacdData = makeExportData(
      [
        { type: 'time' },
        { type: 'number', sourceId: 'sid-rsi', plotTitle: 'Plot' },
        { type: 'number', sourceId: 'sid-macd', plotTitle: 'MACD' },
        { type: 'number', sourceId: 'sid-macd', plotTitle: 'Signal' },
        { type: 'number', sourceId: 'sid-macd', plotTitle: 'Histogram' },
      ],
      [[1000, 65.0, 12.5, 11.3, 1.2]],
    );

    const setupWithConfig = (
      chart: TVActiveChart,
      colors?: IndicatorColors,
    ) => {
      installContainer();
      setupLegendOverlay({
        enabled: true,
        config: {
          MACD: {
            subPaneLegend: true,
            plots: [
              {
                tvTitle: 'MACD',
                label: 'MACD(12,26)',
                color: colors?.MACD?.macd ?? null,
              },
              {
                tvTitle: 'Signal',
                label: 'Signal',
                color: colors?.MACD?.signal ?? null,
              },
              {
                tvTitle: 'Histogram',
                label: 'Hist',
                color: colors?.MACD?.histogramPositive ?? null,
              },
            ],
          },
          RSI: {
            subPaneLegend: true,
            plots: [
              {
                tvTitle: 'Plot',
                label: 'RSI(14)',
                color: colors?.RSI?.plot ?? null,
              },
            ],
          },
          MA5: {
            isMA: true,
            plots: [{ tvTitle: 'Plot', label: 'MA(5)', color: null }],
          },
        },
      });
      setupReadyWidget(chart);
    };

    it('routes sub-pane pills to a dedicated overlay when paneIndex() returns > 0', async () => {
      const { chart } = makeChart(rsiMacdData, [300, 100, 100], {
        'sid-rsi': 1,
        'sid-macd': 2,
      });
      setupWithConfig(chart, subPaneColors);
      registerStudy('active', 'RSI', 'sid-rsi');
      registerStudy('active', 'MACD', 'sid-macd');

      refreshStudyLegendFromExport();
      await Promise.resolve();

      const mainOverlay = document.getElementById(OVERLAY_ID) as HTMLElement;
      expect(mainOverlay.querySelectorAll('.legend-pill').length).toBe(0);

      const rsiOverlay = document.getElementById(`${OVERLAY_ID}-pane-RSI`);
      expect(rsiOverlay).not.toBeNull();
      expect(rsiOverlay?.innerHTML).toContain('RSI(14)');

      const macdOverlay = document.getElementById(`${OVERLAY_ID}-pane-MACD`);
      expect(macdOverlay).not.toBeNull();
      expect(macdOverlay?.innerHTML).toContain('MACD(12,26)');
    });

    it('falls back to main overlay when paneIndex() returns 0 (main pane)', async () => {
      const { chart } = makeChart(rsiMacdData, [300], { 'sid-rsi': 0 });
      setupWithConfig(chart, subPaneColors);
      registerStudy('active', 'RSI', 'sid-rsi');

      refreshStudyLegendFromExport();
      await Promise.resolve();

      const mainOverlay = document.getElementById(OVERLAY_ID) as HTMLElement;
      expect(mainOverlay.innerHTML).toContain('RSI(14)');
      expect(document.getElementById(`${OVERLAY_ID}-pane-RSI`)).toBeNull();
    });

    it('removes stale sub-pane overlays when their indicators are gone', async () => {
      const { chart } = makeChart(rsiMacdData, [300, 100, 100], {
        'sid-rsi': 1,
        'sid-macd': 2,
      });
      setupWithConfig(chart, subPaneColors);
      registerStudy('active', 'RSI', 'sid-rsi');
      registerStudy('active', 'MACD', 'sid-macd');

      refreshStudyLegendFromExport();
      await Promise.resolve();
      expect(document.getElementById(`${OVERLAY_ID}-pane-RSI`)).not.toBeNull();
      expect(document.getElementById(`${OVERLAY_ID}-pane-MACD`)).not.toBeNull();

      __resetStateForTests();
      registerStudy('active', 'RSI', 'sid-rsi');

      const rsiOnlyData = makeExportData(
        [
          { type: 'time' },
          { type: 'number', sourceId: 'sid-rsi', plotTitle: 'Plot' },
        ],
        [[1000, 65.0]],
      );
      const { chart: rsiChart } = makeChart(rsiOnlyData, [300, 100], {
        'sid-rsi': 1,
      });
      setupReadyWidget(rsiChart);

      refreshStudyLegendFromExport();
      await Promise.resolve();

      expect(document.getElementById(`${OVERLAY_ID}-pane-RSI`)).not.toBeNull();
      expect(document.getElementById(`${OVERLAY_ID}-pane-MACD`)).toBeNull();
    });

    it('uses RN-supplied config over fallback presets', async () => {
      const customConfig = {
        RSI: {
          subPaneLegend: true,
          plots: [
            {
              tvTitle: 'Plot',
              label: 'CustomRSI(21)',
              color: 'rgb(255,0,255)',
            },
          ],
        },
      };
      const data = makeExportData(
        [
          { type: 'time' },
          { type: 'number', sourceId: 'sid-rsi', plotTitle: 'Plot' },
        ],
        [[1000, 72.5]],
      );
      const { chart } = makeChart(data);
      installContainer();
      setupLegendOverlay({ enabled: true, config: customConfig });
      setupReadyWidget(chart);
      registerStudy('active', 'RSI', 'sid-rsi');

      refreshStudyLegendFromExport();
      await Promise.resolve();

      const overlay = document.getElementById(OVERLAY_ID) as HTMLElement;
      expect(overlay.innerHTML).toContain('CustomRSI(21)');
      expect(overlay.innerHTML).not.toContain('RSI(14)');
    });

    it('sub-pane overlay positions use absolute top from cumulative pane heights', async () => {
      const { chart } = makeChart(rsiMacdData, [300, 100, 100], {
        'sid-rsi': 1,
      });
      setupWithConfig(chart, subPaneColors);
      registerStudy('active', 'RSI', 'sid-rsi');

      refreshStudyLegendFromExport();
      await Promise.resolve();

      const rsiOverlay = document.getElementById(`${OVERLAY_ID}-pane-RSI`);
      expect(rsiOverlay).not.toBeNull();
      expect(rsiOverlay?.style.top).toBe('304px');
    });

    it('keeps main-pane indicators in main overlay when sub-pane indicators exist', async () => {
      const mixedData = makeExportData(
        [
          { type: 'time' },
          { type: 'number', sourceId: 'sid-ma5', plotTitle: 'Plot' },
          { type: 'number', sourceId: 'sid-rsi', plotTitle: 'Plot' },
        ],
        [[1000, 42.0, 65.0]],
      );
      const { chart } = makeChart(mixedData, [300, 100], { 'sid-rsi': 1 });
      setupWithConfig(chart, subPaneColors);
      registerStudy('ma', 'MA5', 'sid-ma5');
      registerStudy('active', 'RSI', 'sid-rsi');

      refreshStudyLegendFromExport();
      await Promise.resolve();

      const mainOverlay = document.getElementById(OVERLAY_ID) as HTMLElement;
      expect(mainOverlay.innerHTML).toContain('MA(5)');
      expect(mainOverlay.innerHTML).not.toContain('RSI(14)');

      const rsiOverlay = document.getElementById(`${OVERLAY_ID}-pane-RSI`);
      expect(rsiOverlay?.innerHTML).toContain('RSI(14)');
    });

    it('__resetLegendForTests clears sub-pane overlays', () => {
      const { chart } = makeChart(rsiMacdData, [300, 100], { 'sid-rsi': 1 });
      setupWithConfig(chart, subPaneColors);
      registerStudy('active', 'RSI', 'sid-rsi');

      refreshStudyLegendFromExport();

      __resetLegendForTests();

      expect(document.getElementById(`${OVERLAY_ID}-pane-RSI`)).toBeNull();
    });

    it('clears sub-pane overlays when all studies are removed', async () => {
      const { chart } = makeChart(rsiMacdData, [300, 100], { 'sid-macd': 1 });
      setupWithConfig(chart, subPaneColors);
      registerStudy('active', 'MACD', 'sid-macd');

      refreshStudyLegendFromExport();
      await Promise.resolve();
      expect(document.getElementById(`${OVERLAY_ID}-pane-MACD`)).not.toBeNull();

      __resetStateForTests();
      setupReadyWidget(chart);

      refreshStudyLegendFromExport();

      expect(document.getElementById(`${OVERLAY_ID}-pane-MACD`)).toBeNull();
      const mainOverlay = document.getElementById(OVERLAY_ID) as HTMLElement;
      expect(mainOverlay.innerHTML).toBe('');
    });
  });

  describe('__resetLegendForTests', () => {
    it('resets state so overlay can be re-enabled', () => {
      installContainer();
      setupLegendOverlay({ enabled: true });
      expect(document.getElementById(OVERLAY_ID)).not.toBeNull();
      __resetLegendForTests();
      refreshStudyLegendFromExport();
    });
  });

  // ---------------------------------------------------------------------
  // Fixes verified against real TradingView v30.1.0 shapes
  // ---------------------------------------------------------------------

  /** Real v30.1.0 export column order (captured on device). */
  const realMacdBbExport = (): TVExportData =>
    makeExportData(
      [
        { type: 'time' },
        { type: 'value', sourceId: 'sid-macd', plotTitle: 'Histogram' },
        { type: 'value', sourceId: 'sid-macd', plotTitle: 'MACD' },
        { type: 'value', sourceId: 'sid-macd', plotTitle: 'Signal' },
        { type: 'value', sourceId: 'sid-bol', plotTitle: 'Median' },
        { type: 'value', sourceId: 'sid-bol', plotTitle: 'Upper' },
        { type: 'value', sourceId: 'sid-bol', plotTitle: 'Lower' },
      ],
      [[1700000000, 4.21, -149.99, -154.19, 1826.71, 2148.47, 1504.95]],
      [
        [
          '',
          '4.21',
          '\u2212149.99',
          '\u2212154.19',
          '1,826.71',
          '2,148.47',
          '1,504.95',
        ],
      ],
    );

  const pillTexts = (el: HTMLElement | null): string[] =>
    Array.from(el?.querySelectorAll('.legend-pill') ?? []).map(
      (p) => p.textContent?.replace(/\u00a0/g, ' ') ?? '',
    );

  describe('H1: plots are matched by TV plot title, not column position', () => {
    it('shows each MACD value under its own label with real v30.1.0 order', async () => {
      const { chart } = makeChart(realMacdBbExport());
      enableOverlayWithStudies(chart);
      registerStudy('active', 'MACD', 'sid-macd');
      refreshStudyLegendFromExport();
      await Promise.resolve();
      const texts = pillTexts(document.getElementById(OVERLAY_ID));
      expect(texts).toEqual([
        'MACD(12,26) \u2212149.99',
        'Signal \u2212154.19',
        'Hist 4.21',
      ]);
    });

    it('shows each BB value under its own label with real v30.1.0 order', async () => {
      const { chart } = makeChart(realMacdBbExport());
      enableOverlayWithStudies(chart);
      registerStudy('active', 'BOL', 'sid-bol');
      refreshStudyLegendFromExport();
      await Promise.resolve();
      const texts = pillTexts(document.getElementById(OVERLAY_ID));
      expect(texts).toEqual(['BB(20,2) U: 2,148.47 M: 1,826.71 L: 1,504.95']);
    });

    it('ignores the hidden "Smoothed MA" column for RSI', async () => {
      const data = makeExportData(
        [
          { type: 'time' },
          { type: 'value', sourceId: 'sid-rsi', plotTitle: 'Plot' },
          { type: 'value', sourceId: 'sid-rsi', plotTitle: 'Smoothed MA' },
        ],
        [[1700000000, 61.5, NaN]],
        [['', '61.50', '']],
      );
      const { chart, exportData } = makeChart(data);
      enableOverlayWithStudies(chart);
      registerStudy('active', 'RSI', 'sid-rsi');
      refreshStudyLegendFromExport();
      await Promise.resolve();
      expect(pillTexts(document.getElementById(OVERLAY_ID))).toEqual([
        'RSI(14) 61.50',
      ]);
      // M4: the unused empty column must not trigger a retry.
      jest.advanceTimersByTime(500);
      expect(exportData).toHaveBeenCalledTimes(1);
    });
  });

  describe('L1: values use TradingView formatting', () => {
    it('uses displayedData instead of compact K formatting for prices', async () => {
      const data = makeExportData(
        [
          { type: 'time' },
          { type: 'value', sourceId: 'sid-ma20', plotTitle: 'Plot' },
        ],
        [[1700000000, 73512.4]],
        [['', '73,512.40']],
      );
      const { chart } = makeChart(data);
      enableOverlayWithStudies(chart);
      registerStudy('ma', 'MA20', 'sid-ma20');
      refreshStudyLegendFromExport();
      await Promise.resolve();
      const html = document.getElementById(OVERLAY_ID)?.innerHTML ?? '';
      expect(html).toContain('73,512.40');
      expect(html).not.toContain('73.5K');
    });

    it('keeps compact formatting for Volume', async () => {
      const data = makeExportData(
        [
          { type: 'time' },
          { type: 'value', sourceId: 'sid-vol', plotTitle: 'Volume' },
        ],
        [[1700000000, 5000000]],
        [['', '5,000,000']],
      );
      const { chart } = makeChart(data);
      enableOverlayWithStudies(chart);
      setVolumeStudyId('sid-vol');
      refreshStudyLegendFromExport();
      await Promise.resolve();
      expect(document.getElementById(OVERLAY_ID)?.innerHTML).toContain('5.00M');
    });
  });

  describe('M1: Hist pill is coloured by the sign of its value', () => {
    const configWithNegative = (): Record<string, LegendIndicatorCfg> => ({
      MACD: {
        plots: [
          { tvTitle: 'MACD', label: 'MACD(12,26)', color: 'rgb(1,1,1)' },
          { tvTitle: 'Signal', label: 'Signal', color: 'rgb(2,2,2)' },
          { tvTitle: 'Histogram', label: 'Hist', color: 'rgb(0,200,0)' },
        ],
        negativeColorPlot: 'Histogram',
        negativeColor: 'rgb(200,0,0)',
      },
    });

    const renderHist = async (raw: number, display: string) => {
      const data = makeExportData(
        [
          { type: 'time' },
          { type: 'value', sourceId: 'sid-macd', plotTitle: 'Histogram' },
          { type: 'value', sourceId: 'sid-macd', plotTitle: 'MACD' },
          { type: 'value', sourceId: 'sid-macd', plotTitle: 'Signal' },
        ],
        [[1700000000, raw, 1, 1]],
        [['', display, '1.00', '1.00']],
      );
      const { chart } = makeChart(data);
      installContainer();
      setupLegendOverlay({ enabled: true, config: configWithNegative() });
      setupReadyWidget(chart);
      registerStudy('active', 'MACD', 'sid-macd');
      refreshStudyLegendFromExport();
      await Promise.resolve();
      const pills = document.querySelectorAll('.legend-pill');
      return (pills[2] as HTMLElement).innerHTML;
    };

    it('uses the positive colour for a positive histogram', async () => {
      expect(await renderHist(4.21, '4.21')).toContain('rgb(0,200,0)');
    });

    it('uses the negative colour for a negative histogram (U+2212 minus)', async () => {
      expect(await renderHist(-3.5, '\u22123.50')).toContain('rgb(200,0,0)');
    });
  });

  describe('M3: export is narrowed to the last bar', () => {
    it('passes `from` = last bar time in seconds', () => {
      const { chart, exportData } = makeChart();
      enableOverlayWithStudies(chart);
      setOhlcvData([
        { time: 1_699_000_000_000, open: 1, high: 1, low: 1, close: 1 },
        { time: 1_700_000_000_000, open: 1, high: 1, low: 1, close: 1 },
      ]);
      registerStudy('active', 'RSI', 'sid-rsi');
      refreshStudyLegendFromExport();
      expect(exportData).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 1_700_000_000,
          includeDisplayedValues: true,
        }),
      );
    });

    it('retries once without `from` when the narrowed export is empty', async () => {
      const { chart, exportData } = makeChart();
      exportData.mockResolvedValueOnce(makeExportData([{ type: 'time' }], []));
      exportData.mockResolvedValueOnce(
        makeExportData(
          [
            { type: 'time' },
            { type: 'value', sourceId: 'sid-rsi', plotTitle: 'Plot' },
          ],
          [[1700000000, 55]],
          [['', '55.00']],
        ),
      );
      enableOverlayWithStudies(chart);
      setOhlcvData([
        { time: 1_700_000_000_000, open: 1, high: 1, low: 1, close: 1 },
      ]);
      registerStudy('active', 'RSI', 'sid-rsi');
      refreshStudyLegendFromExport();
      await Promise.resolve();
      await Promise.resolve();
      expect(exportData).toHaveBeenCalledTimes(2);
      expect(exportData.mock.calls[1][0]).not.toHaveProperty('from');
      expect(document.getElementById(OVERLAY_ID)?.innerHTML).toContain('55.00');
    });
  });

  describe('M4: retry budget', () => {
    it('resets the retry budget for every new refresh generation', async () => {
      const { chart, exportData } = makeChart(new Error('fail'));
      enableOverlayWithStudies(chart);
      registerStudy('active', 'MACD', 'sid-macd');
      refreshStudyLegendFromExport();
      for (let i = 0; i < 5; i++) {
        await Promise.resolve();
        await Promise.resolve();
        jest.advanceTimersByTime(100);
      }
      const callsBefore = exportData.mock.calls.length;
      refreshStudyLegendFromExport();
      for (let i = 0; i <= 11; i++) {
        await Promise.resolve();
        await Promise.resolve();
        jest.advanceTimersByTime(100);
      }
      // A full new budget (1 + 10 retries) is available to the new generation.
      expect(exportData.mock.calls.length - callsBefore).toBe(11);
    });
  });

  describe('H2: legend follows the crosshair', () => {
    const entityValues = {
      _seriesId: { isHovered: false, title: 'ETH', values: [] },
      'sid-macd': {
        isHovered: false,
        title: 'MACD 12 26 close 9',
        values: [
          { title: 'Histogram', value: '1.11' },
          { title: 'MACD', value: '2.22' },
          { title: 'Signal', value: '3.33' },
        ],
      },
    };

    it('renders the hovered values from entityValues', () => {
      const { chart } = makeChart();
      enableOverlayWithStudies(chart);
      registerStudy('active', 'MACD', 'sid-macd');
      renderLegendFromEntityValues(entityValues);
      expect(pillTexts(document.getElementById(OVERLAY_ID))).toEqual([
        'MACD(12,26) 2.22',
        'Signal 3.33',
        'Hist 1.11',
      ]);
    });

    it('drops an in-flight export so it cannot overwrite scrubbed values', async () => {
      const { chart } = makeChart(realMacdBbExport());
      enableOverlayWithStudies(chart);
      registerStudy('active', 'MACD', 'sid-macd');
      refreshStudyLegendFromExport();
      renderLegendFromEntityValues(entityValues);
      await Promise.resolve();
      expect(pillTexts(document.getElementById(OVERLAY_ID))).toContain(
        'MACD(12,26) 2.22',
      );
    });

    it('returns to last-bar values when the crosshair is dismissed', async () => {
      const { chart, exportData } = makeChart(realMacdBbExport());
      enableOverlayWithStudies(chart);
      registerStudy('active', 'MACD', 'sid-macd');
      renderLegendFromEntityValues(entityValues);
      onLegendCrosshairDismissed();
      expect(exportData).toHaveBeenCalled();
      await Promise.resolve();
      expect(pillTexts(document.getElementById(OVERLAY_ID))).toContain(
        'MACD(12,26) \u2212149.99',
      );
    });

    it('is a no-op when the overlay is disabled', () => {
      installContainer();
      expect(() => renderLegendFromEntityValues(entityValues)).not.toThrow();
    });
  });

  describe('M2: realtime refresh', () => {
    it('throttles refreshes to one per second', () => {
      const { chart, exportData } = makeChart();
      enableOverlayWithStudies(chart);
      registerStudy('active', 'RSI', 'sid-rsi');
      requestLegendRealtimeRefresh();
      requestLegendRealtimeRefresh();
      requestLegendRealtimeRefresh();
      expect(exportData).not.toHaveBeenCalled();
      jest.advanceTimersByTime(1000);
      expect(exportData).toHaveBeenCalledTimes(1);
    });

    it('is skipped while the crosshair is active', () => {
      const { chart, exportData } = makeChart();
      enableOverlayWithStudies(chart);
      registerStudy('active', 'RSI', 'sid-rsi');
      renderLegendFromEntityValues({
        'sid-rsi': {
          isHovered: false,
          title: 'RSI',
          values: [{ title: 'Plot', value: '40.00' }],
        },
      });
      requestLegendRealtimeRefresh();
      jest.advanceTimersByTime(1000);
      expect(exportData).not.toHaveBeenCalled();
    });

    it('does not post LEGEND_RENDERED (silent refresh)', async () => {
      const data = makeExportData(
        [
          { type: 'time' },
          { type: 'value', sourceId: 'sid-rsi', plotTitle: 'Plot' },
        ],
        [[1700000000, 50]],
        [['', '50.00']],
      );
      const { chart } = makeChart(data);
      enableOverlayWithStudies(chart);
      registerStudy('active', 'RSI', 'sid-rsi');
      requestLegendRealtimeRefresh();
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
      expect(postToRN).not.toHaveBeenCalledWith('LEGEND_RENDERED', {});
      expect(document.getElementById(OVERLAY_ID)?.innerHTML).toContain('50.00');
    });
  });

  describe('S11: no retry storm for permanently empty plots', () => {
    const ma200Empty = (): TVExportData =>
      makeExportData(
        [
          { type: 'time' },
          { type: 'value', sourceId: 'sid-ma200', plotTitle: 'Plot' },
        ],
        [[1700000000, NaN]],
        [['', '']],
      );
    const rsiEmpty = (): TVExportData =>
      makeExportData(
        [
          { type: 'time' },
          { type: 'value', sourceId: 'sid-rsi', plotTitle: 'Plot' },
        ],
        [[1700000000, NaN]],
        [['', '']],
      );
    const bars = (count: number) =>
      Array.from({ length: count }, (_, i) => ({
        time: i * 60_000,
        open: 1,
        high: 1,
        low: 1,
        close: 1,
      }));
    const flush = async (cycles: number) => {
      for (let i = 0; i < cycles; i++) {
        await Promise.resolve();
        await Promise.resolve();
        jest.advanceTimersByTime(100);
      }
    };

    it('does not retry for MA200 when fewer than 200 bars are loaded', async () => {
      const { chart, exportData } = makeChart(ma200Empty());
      enableOverlayWithStudies(chart);
      setOhlcvData(bars(150));
      registerStudy('ma', 'MA200', 'sid-ma200');
      refreshStudyLegendFromExport();
      await flush(12);
      expect(exportData).toHaveBeenCalledTimes(1);
      expect(postToRN).toHaveBeenCalledWith('LEGEND_RENDERED', {});
    });

    it('still retries for MA200 when enough bars are loaded (warm-up)', async () => {
      const { chart, exportData } = makeChart(ma200Empty());
      enableOverlayWithStudies(chart);
      setOhlcvData(bars(250));
      registerStudy('ma', 'MA200', 'sid-ma200');
      refreshStudyLegendFromExport();
      await flush(12);
      expect(exportData).toHaveBeenCalledTimes(11);
    });

    it('never retries on a silent realtime refresh', async () => {
      const { chart, exportData } = makeChart(rsiEmpty());
      enableOverlayWithStudies(chart);
      registerStudy('active', 'RSI', 'sid-rsi');
      requestLegendRealtimeRefresh();
      jest.advanceTimersByTime(1000);
      await flush(12);
      expect(exportData).toHaveBeenCalledTimes(1);
    });

    it('repeated realtime ticks cost one export each, not 11', async () => {
      const { chart, exportData } = makeChart(rsiEmpty());
      enableOverlayWithStudies(chart);
      registerStudy('active', 'RSI', 'sid-rsi');
      for (let tick = 0; tick < 5; tick++) {
        requestLegendRealtimeRefresh();
        jest.advanceTimersByTime(1000);
        await flush(2);
      }
      expect(exportData).toHaveBeenCalledTimes(5);
    });

    it('a silent refresh superseding a pending load refresh keeps retrying', async () => {
      const { chart, exportData } = makeChart(rsiEmpty());
      enableOverlayWithStudies(chart);
      registerStudy('active', 'RSI', 'sid-rsi');
      refreshStudyLegendFromExport();
      refreshStudyLegendFromExport({ silent: true });
      await flush(12);
      // Non-silent load still waiting to settle → retries allowed.
      expect(exportData.mock.calls.length).toBeGreaterThan(2);
      expect(postToRN).toHaveBeenCalledWith('LEGEND_RENDERED', {});
    });
  });

  describe('API hygiene: getStudyById throws in v30.1.0', () => {
    it('renders in the main overlay when getStudyById throws', async () => {
      const data = makeExportData(
        [
          { type: 'time' },
          { type: 'value', sourceId: 'sid-rsi', plotTitle: 'Plot' },
        ],
        [[1700000000, 50]],
        [['', '50.00']],
      );
      const { chart } = makeChart(data);
      (chart.getStudyById as jest.Mock).mockImplementation(() => {
        throw new Error('There is no such study');
      });
      enableOverlayWithStudies(chart);
      registerStudy('active', 'RSI', 'sid-rsi');
      refreshStudyLegendFromExport();
      await Promise.resolve();
      expect(document.getElementById(OVERLAY_ID)?.innerHTML).toContain(
        'RSI(14)',
      );
    });
  });

  describe('isLegendOverlayEnabled', () => {
    it('reflects setupLegendOverlay', () => {
      installContainer();
      expect(isLegendOverlayEnabled()).toBe(false);
      setupLegendOverlay({ enabled: true });
      expect(isLegendOverlayEnabled()).toBe(true);
    });
  });
});
