/**
 * @jest-environment jsdom
 */
import { applyScaleLayout } from '../scaleLayout';
import { __resetThemeForTests, initThemeFromConfig } from '../theme';
import {
  __resetStateForTests,
  setChartReady,
  setHasExplicitCurrentPriceLine,
  setWidget,
} from '../../core/state';
import type { ChartTheme, TVChartingLibraryWidget } from '../../core/types';

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

interface ChartMock {
  getSeries: jest.Mock;
  detachToRight: jest.Mock;
}

interface WidgetMock {
  widget: TVChartingLibraryWidget;
  chart: ChartMock;
  applyOverrides: jest.Mock;
}

const makeWidget = (chartImpl: Partial<ChartMock> = {}): WidgetMock => {
  const chart: ChartMock = {
    detachToRight: chartImpl.detachToRight ?? jest.fn(),
    getSeries: jest.fn(),
  };
  chart.getSeries.mockReturnValue({ detachToRight: chart.detachToRight });
  const applyOverrides = jest.fn();
  const widget = {
    activeChart: () => chart as unknown,
    applyOverrides,
  } as unknown as TVChartingLibraryWidget;
  return { widget, chart, applyOverrides };
};

describe('applyScaleLayout', () => {
  beforeEach(() => {
    __resetStateForTests();
    __resetThemeForTests();
    delete (window as unknown as { ReactNativeWebView?: unknown })
      .ReactNativeWebView;
    delete (window as unknown as { CONFIG?: unknown }).CONFIG;
  });

  // -- early-return guards ---------------------------------------------------

  it('is a no-op when no widget exists', () => {
    setChartReady(true);
    expect(() => applyScaleLayout()).not.toThrow();
  });

  it('is a no-op when chart is not ready', () => {
    const { widget, applyOverrides } = makeWidget();
    setWidget(widget);
    // chartReady defaults to false
    applyScaleLayout();
    expect(applyOverrides).not.toHaveBeenCalled();
  });

  // -- no theme → empty overrides --------------------------------------------

  it('applies empty overrides when no theme is set', () => {
    const { widget, applyOverrides } = makeWidget();
    setWidget(widget);
    setChartReady(true);
    applyScaleLayout();
    expect(applyOverrides).toHaveBeenCalledWith({});
  });

  // -- normal path -----------------------------------------------------------

  it('calls applyOverrides and then syncMainSeriesToRightScale', () => {
    initThemeFromConfig(baseTheme);
    const { widget, applyOverrides, chart } = makeWidget();
    setWidget(widget);
    setChartReady(true);
    applyScaleLayout();
    expect(applyOverrides).toHaveBeenCalledTimes(1);
    expect(chart.detachToRight).toHaveBeenCalledTimes(1);
  });

  it('includes correct static scale properties', () => {
    initThemeFromConfig(baseTheme);
    const { widget, applyOverrides } = makeWidget();
    setWidget(widget);
    setChartReady(true);
    applyScaleLayout();
    const overrides = applyOverrides.mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(overrides['scalesProperties.showRightScale']).toBe(true);
    expect(overrides['scalesProperties.showLeftScale']).toBe(false);
    expect(overrides['scalesProperties.showSeriesLastValue']).toBe(true);
    expect(overrides['scalesProperties.showStudyLastValue']).toBe(false);
    expect(overrides['scalesProperties.showSymbolLabels']).toBe(false);
    expect(overrides['scalesProperties.showPriceScaleCrosshairLabel']).toBe(
      true,
    );
    expect(overrides['scalesProperties.showTimeScaleCrosshairLabel']).toBe(
      true,
    );
    expect(overrides['paneProperties.topMargin']).toBe(12);
    expect(overrides['paneProperties.bottomMargin']).toBe(8);
  });

  // -- gridLineColor ---------------------------------------------------------

  it('uses theme.gridLineColor when set', () => {
    initThemeFromConfig({ ...baseTheme, gridLineColor: 'rgb(50,50,50)' });
    const { widget, applyOverrides } = makeWidget();
    setWidget(widget);
    setChartReady(true);
    applyScaleLayout();
    const overrides = applyOverrides.mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(overrides['paneProperties.vertGridProperties.color']).toBe(
      'rgb(50,50,50)',
    );
    expect(overrides['paneProperties.horzGridProperties.color']).toBe(
      'rgb(50,50,50)',
    );
  });

  it('falls back to transparent when gridLineColor is not set', () => {
    initThemeFromConfig(baseTheme);
    const { widget, applyOverrides } = makeWidget();
    setWidget(widget);
    setChartReady(true);
    applyScaleLayout();
    const overrides = applyOverrides.mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(overrides['paneProperties.vertGridProperties.color']).toBe(
      'transparent',
    );
    expect(overrides['paneProperties.horzGridProperties.color']).toBe(
      'transparent',
    );
  });

  // -- hidePaneSeparator condition -------------------------------------------

  it('uses borderColor as separatorColor by default (hidePaneSeparator=false)', () => {
    initThemeFromConfig(baseTheme);
    const { widget, applyOverrides } = makeWidget();
    setWidget(widget);
    setChartReady(true);
    applyScaleLayout();
    const overrides = applyOverrides.mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(overrides['paneProperties.separatorColor']).toBe('rgb(17,17,17)');
  });

  it('uses backgroundColor as separatorColor when hidePaneSeparator=true', () => {
    (
      window as unknown as {
        CONFIG: { features: { hidePaneSeparator: boolean } };
      }
    ).CONFIG = {
      features: { hidePaneSeparator: true },
    };
    initThemeFromConfig(baseTheme);
    const { widget, applyOverrides } = makeWidget();
    setWidget(widget);
    setChartReady(true);
    applyScaleLayout();
    const overrides = applyOverrides.mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(overrides['paneProperties.separatorColor']).toBe('rgb(0,0,0)');
  });

  // -- showPriceLine respects hasExplicitCurrentPriceLine --------------------

  it('sets showPriceLine=true when hasExplicitCurrentPriceLine is false', () => {
    initThemeFromConfig(baseTheme);
    const { widget, applyOverrides } = makeWidget();
    setWidget(widget);
    setChartReady(true);
    applyScaleLayout();
    const overrides = applyOverrides.mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(overrides['mainSeriesProperties.showPriceLine']).toBe(true);
  });

  it('sets showPriceLine=false when hasExplicitCurrentPriceLine is true', () => {
    initThemeFromConfig(baseTheme);
    setHasExplicitCurrentPriceLine(true);
    const { widget, applyOverrides } = makeWidget();
    setWidget(widget);
    setChartReady(true);
    applyScaleLayout();
    const overrides = applyOverrides.mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(overrides['mainSeriesProperties.showPriceLine']).toBe(false);
  });

  // -- backgroundColor-derived overrides -------------------------------------

  it('sets timeScale.borderColor and scalesProperties.lineColor from backgroundColor', () => {
    initThemeFromConfig(baseTheme);
    const { widget, applyOverrides } = makeWidget();
    setWidget(widget);
    setChartReady(true);
    applyScaleLayout();
    const overrides = applyOverrides.mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(overrides['timeScale.borderColor']).toBe('rgb(0,0,0)');
    expect(overrides['scalesProperties.lineColor']).toBe('rgb(0,0,0)');
  });

  // -- priceLineColor uses getThemeLastPriceLineColor -----------------------

  it('sets priceLineColor from currentPriceColor when set', () => {
    initThemeFromConfig(baseTheme);
    const { widget, applyOverrides } = makeWidget();
    setWidget(widget);
    setChartReady(true);
    applyScaleLayout();
    const overrides = applyOverrides.mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(overrides['mainSeriesProperties.priceLineColor']).toBe(
      'rgb(34,34,0)',
    );
  });

  it('falls back priceLineColor to lineColor when currentPriceColor is empty', () => {
    initThemeFromConfig({ ...baseTheme, currentPriceColor: '' });
    const { widget, applyOverrides } = makeWidget();
    setWidget(widget);
    setChartReady(true);
    applyScaleLayout();
    const overrides = applyOverrides.mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(overrides['mainSeriesProperties.priceLineColor']).toBe(
      'rgb(171,205,239)',
    );
  });

  // -- error path: applyOverrides throws ------------------------------------

  it('reports applyOverrides errors to RN and skips detachToRight', () => {
    const bridge = { postMessage: jest.fn() };
    (
      window as unknown as { ReactNativeWebView: typeof bridge }
    ).ReactNativeWebView = bridge;
    initThemeFromConfig(baseTheme);
    const { widget, chart } = makeWidget();
    (widget as unknown as { applyOverrides: () => void }).applyOverrides =
      () => {
        throw new Error('override boom');
      };
    setWidget(widget);
    setChartReady(true);
    applyScaleLayout();
    expect(bridge.postMessage).toHaveBeenCalledWith(
      expect.stringContaining('"message":"override boom"'),
    );
    expect(chart.detachToRight).not.toHaveBeenCalled();
  });

  // -- detachToRight failure is silently caught ------------------------------

  it('swallows detachToRight failures silently', () => {
    initThemeFromConfig(baseTheme);
    const { widget } = makeWidget({
      detachToRight: jest.fn(() => {
        throw new Error('teardown');
      }),
    });
    setWidget(widget);
    setChartReady(true);
    expect(() => applyScaleLayout()).not.toThrow();
  });

  // -- accepts optional ChartType argument -----------------------------------

  it('accepts a chart type argument without error', () => {
    initThemeFromConfig(baseTheme);
    const { widget, applyOverrides } = makeWidget();
    setWidget(widget);
    setChartReady(true);
    applyScaleLayout(1);
    expect(applyOverrides).toHaveBeenCalledTimes(1);
  });
});
