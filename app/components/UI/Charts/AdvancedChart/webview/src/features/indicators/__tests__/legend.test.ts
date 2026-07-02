/**
 * @jest-environment jsdom
 */
import {
  __resetLegendForTests,
  attachLegendResizeListener,
  refreshStudyLegendFromExport,
  scheduleLegendRefresh,
  setupLegendOverlay,
  subscribeStudyDataLoaded,
  updateLegendOverlayLayout,
} from '../legend';
import {
  __resetStateForTests,
  registerStudy,
  setChartReady,
  setTheme,
  setVolumeStudyId,
  setWidget,
} from '../../../core/state';
import type {
  ChartTheme,
  IndicatorColors,
  StudyId,
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
): { chart: TVActiveChart; exportData: jest.Mock } => {
  const exportData =
    exportDataResult instanceof Error
      ? jest.fn().mockRejectedValue(exportDataResult)
      : jest.fn().mockResolvedValue(exportDataResult ?? makeExportData([], []));
  const chart = {
    exportData,
    getStudyById: jest.fn().mockReturnValue(null),
  } as unknown as TVActiveChart;
  return { chart, exportData };
};

const setupReadyWidget = (chart: TVActiveChart): void => {
  setWidget({
    activeChart: () => chart,
  } as unknown as TVChartingLibraryWidget);
  setChartReady(true);
};

const enableOverlayWithStudies = (
  chart: TVActiveChart,
  colors?: IndicatorColors,
): void => {
  installContainer();
  setupLegendOverlay({ enabled: true }, colors);
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
      setupLegendOverlay(undefined, undefined);
      expect(document.getElementById(OVERLAY_ID)).toBeNull();
    });

    it('is a no-op when enabled is false', () => {
      installContainer();
      setupLegendOverlay({ enabled: false }, undefined);
      expect(document.getElementById(OVERLAY_ID)).toBeNull();
    });

    it('creates the overlay element inside tv_chart_container', () => {
      const container = installContainer();
      setupLegendOverlay({ enabled: true }, undefined);
      const overlay = document.getElementById(OVERLAY_ID);
      expect(overlay).not.toBeNull();
      expect(overlay?.parentElement).toBe(container);
    });

    it('sets container position to relative', () => {
      const container = installContainer();
      setupLegendOverlay({ enabled: true }, undefined);
      expect(container.style.position).toBe('relative');
    });

    it('replaces an existing overlay if called twice', () => {
      installContainer();
      setupLegendOverlay({ enabled: true }, undefined);
      setupLegendOverlay({ enabled: true }, undefined);
      expect(document.querySelectorAll(`#${OVERLAY_ID}`).length).toBe(1);
    });

    it('does nothing when tv_chart_container is missing', () => {
      document.body.innerHTML = '';
      setupLegendOverlay({ enabled: true }, undefined);
      expect(document.getElementById(OVERLAY_ID)).toBeNull();
    });

    it('injects a style element to hide TV legend buttons', () => {
      installContainer();
      setupLegendOverlay({ enabled: true }, undefined);
      const style = document.getElementById('mm-hide-legend-buttons');
      expect(style).not.toBeNull();
      expect(style?.textContent).toContain('display:none!important');
    });

    it('does not duplicate the CSS style on second setup call', () => {
      installContainer();
      setupLegendOverlay({ enabled: true }, undefined);
      setupLegendOverlay({ enabled: true }, undefined);
      expect(document.querySelectorAll('#mm-hide-legend-buttons').length).toBe(
        1,
      );
    });
  });

  describe('attachLegendResizeListener', () => {
    it('subscribes to panes_height_changed and triggers layout update', () => {
      installContainer();
      setupLegendOverlay({ enabled: true }, undefined);
      let handler: (() => void) | undefined;
      const widget = {
        subscribe: jest.fn((_event: string, cb: () => void) => {
          handler = cb;
        }),
      };
      attachLegendResizeListener(widget);
      expect(widget.subscribe).toHaveBeenCalledWith(
        'panes_height_changed',
        expect.any(Function),
      );
      handler?.();
      const overlay = document.getElementById(OVERLAY_ID);
      expect(overlay?.style.maxWidth).toBe('calc(100% - 56px)');
    });

    it('does not throw when subscribe throws', () => {
      const widget = {
        subscribe: jest.fn(() => {
          throw new Error('not ready');
        }),
      };
      expect(() => attachLegendResizeListener(widget)).not.toThrow();
    });

    it('does not update layout when overlay element is missing', () => {
      let handler: (() => void) | undefined;
      const widget = {
        subscribe: jest.fn((_event: string, cb: () => void) => {
          handler = cb;
        }),
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
      setupLegendOverlay({ enabled: true }, undefined);
      expect(() => refreshStudyLegendFromExport()).not.toThrow();
    });

    it('is a no-op when chart is not ready', () => {
      installContainer();
      setupLegendOverlay({ enabled: true }, undefined);
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
      registerStudy('active', 'MACD', 'sid-macd' as StudyId);
      refreshStudyLegendFromExport();
      expect(exportData).toHaveBeenCalledWith({
        includeSeries: false,
        includedStudies: ['sid-macd'],
      });
    });

    it('includes MA studies in the export request', () => {
      const { chart, exportData } = makeChart();
      enableOverlayWithStudies(chart);
      registerStudy('ma', 'MA5', 'sid-ma5' as StudyId);
      refreshStudyLegendFromExport();
      expect(exportData).toHaveBeenCalledWith({
        includeSeries: false,
        includedStudies: ['sid-ma5'],
      });
    });

    it('includes volume study in the export request', () => {
      const { chart, exportData } = makeChart();
      enableOverlayWithStudies(chart);
      setVolumeStudyId('sid-vol' as StudyId);
      refreshStudyLegendFromExport();
      expect(exportData).toHaveBeenCalledWith({
        includeSeries: false,
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
      registerStudy('active', 'MACD', 'sid-macd' as StudyId);
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
      registerStudy('active', 'RSI', 'sid-rsi' as StudyId);
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
      registerStudy('active', 'BOL', 'sid-bol' as StudyId);
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
      registerStudy('ma', 'MA10', 'sid-ma10' as StudyId);
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
      registerStudy('ma', 'MA5', 'sid-ma5' as StudyId);
      refreshStudyLegendFromExport();
      await Promise.resolve();
      const overlay = document.getElementById(OVERLAY_ID) as HTMLElement;
      expect(overlay.querySelectorAll('.legend-pill').length).toBe(0);
    });

    it('renders Volume pill from export data', async () => {
      const data = makeExportData(
        [
          { type: 'time' },
          { type: 'number', sourceId: 'sid-vol', plotTitle: 'Vol' },
        ],
        [[1000, 5000000]],
      );
      const { chart } = makeChart(data);
      enableOverlayWithStudies(chart);
      setVolumeStudyId('sid-vol' as StudyId);
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
      registerStudy('active', 'RSI', 'sid-rsi' as StudyId);
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
      registerStudy('active', 'RSI', 'sid-rsi' as StudyId);
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
      registerStudy('active', 'RSI', 'sid-rsi' as StudyId);
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
      registerStudy('active', 'RSI', 'sid-rsi' as StudyId);
      refreshStudyLegendFromExport();
      await Promise.resolve();
      const overlay = document.getElementById(OVERLAY_ID) as HTMLElement;
      expect(overlay.innerHTML).toContain('rgb(0,255,0)');
    });

    it('retries when exportData rejects', async () => {
      const { chart, exportData } = makeChart(new Error('fail'));
      enableOverlayWithStudies(chart);
      registerStudy('active', 'MACD', 'sid-macd' as StudyId);
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
      registerStudy('active', 'MACD', 'sid-macd' as StudyId);
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
      registerStudy('active', 'RSI', 'sid-rsi' as StudyId);
      refreshStudyLegendFromExport();
      await Promise.resolve();
      jest.advanceTimersByTime(100);
      expect(exportData).toHaveBeenCalledTimes(2);
    });

    it('stops retrying after MAX_RETRIES and sends LEGEND_RENDERED', async () => {
      const { chart } = makeChart(new Error('fail'));
      enableOverlayWithStudies(chart);
      registerStudy('active', 'MACD', 'sid-macd' as StudyId);

      for (let i = 0; i <= 11; i++) {
        refreshStudyLegendFromExport();
        await Promise.resolve();
        await Promise.resolve();
        jest.advanceTimersByTime(100);
      }

      expect(postToRN).toHaveBeenCalledWith('LEGEND_RENDERED', {});
    });

    it('sends LEGEND_RENDERED after render timeout when retries keep failing', async () => {
      const { chart } = makeChart(new Error('fail'));
      enableOverlayWithStudies(chart);
      registerStudy('active', 'MACD', 'sid-macd' as StudyId);
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
      registerStudy('active', 'RSI', 'sid-rsi' as StudyId);
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
      registerStudy('active', 'RSI', 'sid-rsi' as StudyId);
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
      registerStudy('active', 'RSI', 'sid-rsi' as StudyId);
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
      registerStudy(
        'active',
        'UnknownStudy' as 'MACD',
        'sid-unknown' as StudyId,
      );
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
        [[1000, 50.0]],
        [['', 'n/a']],
      );
      const { chart } = makeChart(data);
      enableOverlayWithStudies(chart);
      registerStudy('active', 'RSI', 'sid-rsi' as StudyId);
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
      registerStudy('active', 'BOL', 'sid-bol' as StudyId);
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
      registerStudy('active', 'RSI', 'sid-rsi' as StudyId);
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
      registerStudy('active', 'RSI', 'sid-rsi' as StudyId);
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

    it('sets fallback max-width when no price-axis is found', () => {
      installContainer();
      setupLegendOverlay({ enabled: true }, undefined);
      updateLegendOverlayLayout();
      const overlay = document.getElementById(OVERLAY_ID);
      expect(overlay?.style.maxWidth).toBe('calc(100% - 56px)');
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
      registerStudy('active', 'MACD', 'sid-macd' as StudyId);
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
      registerStudy('active', 'RSI', 'sid-rsi' as StudyId);
      subscribeStudyDataLoaded(chart, 'sid-rsi' as StudyId);
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
      registerStudy('active', 'RSI', 'sid-rsi' as StudyId);
      subscribeStudyDataLoaded(chart, 'sid-rsi' as StudyId);
      expect(exportData).toHaveBeenCalled();
    });

    it('falls back to direct refresh when study has no onDataLoaded', () => {
      const { chart, exportData } = makeChart();
      (chart.getStudyById as jest.Mock).mockReturnValue({});
      enableOverlayWithStudies(chart);
      registerStudy('active', 'RSI', 'sid-rsi' as StudyId);
      subscribeStudyDataLoaded(chart, 'sid-rsi' as StudyId);
      expect(exportData).toHaveBeenCalled();
    });

    it('falls back to direct refresh when study is null', () => {
      const { chart, exportData } = makeChart();
      (chart.getStudyById as jest.Mock).mockReturnValue(null);
      enableOverlayWithStudies(chart);
      registerStudy('active', 'RSI', 'sid-rsi' as StudyId);
      subscribeStudyDataLoaded(chart, 'sid-rsi' as StudyId);
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
      registerStudy('active', 'RSI', 'sid-rsi' as StudyId);
      registerStudy('active', 'MACD', 'sid-macd' as StudyId);
      refreshStudyLegendFromExport();
      await Promise.resolve();
      const overlay = document.getElementById(OVERLAY_ID) as HTMLElement;
      expect(overlay.querySelectorAll('.legend-pill').length).toBe(4);
      const html = overlay.innerHTML;
      expect(html.indexOf('RSI(14)')).toBeLessThan(html.indexOf('MACD(12,26)'));
    });
  });

  describe('__resetLegendForTests', () => {
    it('resets state so overlay can be re-enabled', () => {
      installContainer();
      setupLegendOverlay({ enabled: true }, undefined);
      expect(document.getElementById(OVERLAY_ID)).not.toBeNull();
      __resetLegendForTests();
      refreshStudyLegendFromExport();
    });
  });
});
