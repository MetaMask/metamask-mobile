/**
 * @jest-environment jsdom
 */
import {
  __resetThemeForTests,
  applyThemeColors,
  flushPendingTheme,
  getCandleStyleOverrides,
  getCurrentPriceVisualColor,
  getSeriesColorOverrides,
  getBuiltInScaleLabelOverrides,
  getThemeLastPriceLineColor,
  getThemeLineColor,
  getVolumeErrorColor,
  getVolumeSuccessColor,
  initThemeFromConfig,
  subscribeTheme,
} from '../theme';
import {
  __resetStateForTests,
  getTheme,
  setChartReady,
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

/**
 * Creates a mock TVChartingLibraryWidget with a full activeChart → getSeries
 * chain so applySeriesStyleProperties can be exercised.
 */
function createMockWidget(overrides?: {
  applyOverrides?: jest.Mock;
  setChartStyleProperties?: jest.Mock;
}) {
  const setChartStyleProperties =
    overrides?.setChartStyleProperties ?? jest.fn();
  const applyOverridesFn = overrides?.applyOverrides ?? jest.fn();
  return {
    widget: {
      applyOverrides: applyOverridesFn,
      activeChart: () => ({
        getSeries: () => ({ setChartStyleProperties }),
      }),
    } as unknown as TVChartingLibraryWidget,
    applyOverrides: applyOverridesFn,
    setChartStyleProperties,
  };
}

describe('widget/theme color helpers', () => {
  it('getThemeLineColor returns lineColor when set, else successColor', () => {
    expect(getThemeLineColor(baseTheme)).toBe('rgb(171,205,239)');
    expect(getThemeLineColor({ ...baseTheme, lineColor: '' })).toBe(
      'rgb(0,255,0)',
    );
  });

  it('getThemeLastPriceLineColor returns currentPriceColor when set', () => {
    expect(getThemeLastPriceLineColor(baseTheme)).toBe('rgb(34,34,0)');
    expect(
      getThemeLastPriceLineColor({ ...baseTheme, currentPriceColor: '' }),
    ).toBe('rgb(171,205,239)');
  });

  it('getSeriesColorOverrides applies the line color to every series style', () => {
    const overrides = getSeriesColorOverrides(
      'rgb(170,187,204)',
      'rgb(221,238,255)',
    );
    expect(overrides['mainSeriesProperties.lineStyle.color']).toBe(
      'rgb(170,187,204)',
    );
    expect(overrides['mainSeriesProperties.areaStyle.linecolor']).toBe(
      'rgb(170,187,204)',
    );
    expect(overrides['mainSeriesProperties.priceLineColor']).toBe(
      'rgb(221,238,255)',
    );
  });

  it('getBuiltInScaleLabelOverrides uses crosshairBackgroundColor first', () => {
    const overrides = getBuiltInScaleLabelOverrides(baseTheme);
    expect(overrides['scalesProperties.textColor']).toBe('rgb(255,255,255)');
    expect(overrides['scalesProperties.crosshairLabelBgColorDark']).toBe(
      'rgb(51,51,51)',
    );
  });

  it('getCandleStyleOverrides maps success/error to up/down', () => {
    const overrides = getCandleStyleOverrides(baseTheme);
    expect(overrides['mainSeriesProperties.candleStyle.upColor']).toBe(
      'rgb(0,255,0)',
    );
    expect(overrides['mainSeriesProperties.candleStyle.downColor']).toBe(
      'rgb(255,0,0)',
    );
  });
});

describe('volume + current-price color helpers', () => {
  it('getCurrentPriceVisualColor falls through currentPriceColor → lineColor → successColor', () => {
    expect(getCurrentPriceVisualColor(baseTheme)).toBe('rgb(34,34,0)');
    expect(
      getCurrentPriceVisualColor({ ...baseTheme, currentPriceColor: '' }),
    ).toBe('rgb(171,205,239)');
    expect(
      getCurrentPriceVisualColor({
        ...baseTheme,
        currentPriceColor: '',
        lineColor: '',
      }),
    ).toBe('rgb(0,255,0)');
  });

  it('getVolumeSuccessColor falls back to successColor', () => {
    expect(getVolumeSuccessColor(baseTheme)).toBe('rgb(0,255,0)');
    expect(
      getVolumeSuccessColor({ ...baseTheme, volumeSuccessColor: 'rgb(1,2,3)' }),
    ).toBe('rgb(1,2,3)');
  });

  it('getVolumeErrorColor falls back to errorColor', () => {
    expect(getVolumeErrorColor(baseTheme)).toBe('rgb(255,0,0)');
    expect(
      getVolumeErrorColor({ ...baseTheme, volumeErrorColor: 'rgb(4,5,6)' }),
    ).toBe('rgb(4,5,6)');
  });
});

describe('initThemeFromConfig + applyThemeColors', () => {
  beforeEach(() => {
    __resetStateForTests();
    __resetThemeForTests();
    delete (window as unknown as { ReactNativeWebView?: unknown })
      .ReactNativeWebView;
  });

  it('seeds state.theme', () => {
    initThemeFromConfig(baseTheme);
    expect(getTheme()).toEqual(baseTheme);
  });

  it('merges payload fields into the existing theme', () => {
    initThemeFromConfig(baseTheme);
    applyThemeColors({ lineColor: 'rgb(1,2,3)' });
    expect(getTheme()?.lineColor).toBe('rgb(1,2,3)');
    expect(getTheme()?.successColor).toBe('rgb(0,255,0)');
  });

  it('notifies subscribers with the updated theme', () => {
    initThemeFromConfig(baseTheme);
    const subscriber = jest.fn();
    subscribeTheme(subscriber);
    applyThemeColors({ successColor: 'rgb(170,187,204)' });
    expect(subscriber).toHaveBeenCalledTimes(1);
    expect(subscriber.mock.calls[0][0].successColor).toBe('rgb(170,187,204)');
  });

  it('applies overrides on the widget when the chart is ready', () => {
    initThemeFromConfig(baseTheme);
    const applyOverrides = jest.fn();
    setWidget({ applyOverrides } as unknown as TVChartingLibraryWidget);
    setChartReady(true);

    applyThemeColors({ lineColor: 'rgb(1,2,3)' });

    expect(applyOverrides).toHaveBeenCalledTimes(1);
    const overrides = applyOverrides.mock.calls[0][0];
    expect(overrides['mainSeriesProperties.lineStyle.color']).toBe(
      'rgb(1,2,3)',
    );
  });

  it('skips applyOverrides when no widget exists yet', () => {
    initThemeFromConfig(baseTheme);
    expect(() => applyThemeColors({ lineColor: 'rgb(1,2,3)' })).not.toThrow();
  });

  it('is a no-op when state.theme is not initialised', () => {
    expect(() => applyThemeColors({ lineColor: 'rgb(1,2,3)' })).not.toThrow();
  });

  it('merges volumeSuccessColor and volumeErrorColor into theme state', () => {
    initThemeFromConfig(baseTheme);
    applyThemeColors({
      volumeSuccessColor: 'rgb(10,20,30)',
      volumeErrorColor: 'rgb(40,50,60)',
    });
    expect(getTheme()?.volumeSuccessColor).toBe('rgb(10,20,30)');
    expect(getTheme()?.volumeErrorColor).toBe('rgb(40,50,60)');
  });

  it('reports subscriber errors to RN without stopping other subscribers', () => {
    initThemeFromConfig(baseTheme);
    const bridge = { postMessage: jest.fn() };
    (
      window as unknown as { ReactNativeWebView: typeof bridge }
    ).ReactNativeWebView = bridge;

    const bad = jest.fn(() => {
      throw new Error('subscriber fail');
    });
    const good = jest.fn();
    subscribeTheme(bad);
    subscribeTheme(good);

    applyThemeColors({ lineColor: 'rgb(9,9,9)' });

    expect(good).toHaveBeenCalledTimes(1);
    expect(bridge.postMessage).toHaveBeenCalledWith(
      expect.stringContaining('"message":"subscriber fail"'),
    );
  });

  it('unsubscribe returned by subscribeTheme removes the listener', () => {
    initThemeFromConfig(baseTheme);
    const listener = jest.fn();
    const unsub = subscribeTheme(listener);
    unsub();
    applyThemeColors({ lineColor: 'rgb(7,7,7)' });
    expect(listener).not.toHaveBeenCalled();
  });

  it('reports widget.applyOverrides errors to RN', () => {
    initThemeFromConfig(baseTheme);
    const bridge = { postMessage: jest.fn() };
    (
      window as unknown as { ReactNativeWebView: typeof bridge }
    ).ReactNativeWebView = bridge;
    setWidget({
      applyOverrides: () => {
        throw new Error('override fail');
      },
    } as unknown as TVChartingLibraryWidget);
    setChartReady(true);

    applyThemeColors({ lineColor: 'rgb(1,2,3)' });

    expect(bridge.postMessage).toHaveBeenCalledWith(
      expect.stringContaining('"message":"override fail"'),
    );
  });

  it('calls setChartStyleProperties for line (2) and baseline (10) styles', () => {
    initThemeFromConfig(baseTheme);
    const { widget, setChartStyleProperties } = createMockWidget();
    setWidget(widget);
    setChartReady(true);

    applyThemeColors({ lineColor: 'rgb(99,88,77)' });

    expect(setChartStyleProperties).toHaveBeenCalledTimes(2);
    expect(setChartStyleProperties).toHaveBeenCalledWith(2, {
      color: 'rgb(99,88,77)',
      colorType: 'solid',
      linewidth: 2,
    });
    expect(setChartStyleProperties).toHaveBeenCalledWith(10, {
      topLineColor: 'rgb(99,88,77)',
      bottomLineColor: 'rgb(99,88,77)',
      topLineWidth: 2,
      bottomLineWidth: 2,
    });
  });

  it('reports setChartStyleProperties errors to RN without throwing', () => {
    initThemeFromConfig(baseTheme);
    const bridge = { postMessage: jest.fn() };
    (
      window as unknown as { ReactNativeWebView: typeof bridge }
    ).ReactNativeWebView = bridge;

    const { widget } = createMockWidget({
      setChartStyleProperties: jest.fn(() => {
        throw new Error('series style fail');
      }),
    });
    setWidget(widget);
    setChartReady(true);

    expect(() => applyThemeColors({ lineColor: 'rgb(1,2,3)' })).not.toThrow();
    expect(bridge.postMessage).toHaveBeenCalledWith(
      expect.stringContaining('"message":"series style fail"'),
    );
  });

  it('uses successColor as lineColor fallback for series style properties', () => {
    initThemeFromConfig({ ...baseTheme, lineColor: '' });
    const { widget, setChartStyleProperties } = createMockWidget();
    setWidget(widget);
    setChartReady(true);

    applyThemeColors({ successColor: 'rgb(0,200,100)' });

    expect(setChartStyleProperties).toHaveBeenCalledWith(
      2,
      expect.objectContaining({ color: 'rgb(0,200,100)' }),
    );
  });
});

describe('flushPendingTheme', () => {
  beforeEach(() => {
    __resetStateForTests();
    __resetThemeForTests();
    delete (window as unknown as { ReactNativeWebView?: unknown })
      .ReactNativeWebView;
  });

  it('is a no-op when state.theme is null', () => {
    expect(() => flushPendingTheme()).not.toThrow();
  });

  it('is a no-op when widget is null', () => {
    initThemeFromConfig(baseTheme);
    expect(() => flushPendingTheme()).not.toThrow();
  });

  it('is a no-op when chart is not ready', () => {
    initThemeFromConfig(baseTheme);
    const { widget, applyOverrides } = createMockWidget();
    setWidget(widget);

    flushPendingTheme();

    expect(applyOverrides).not.toHaveBeenCalled();
  });

  it('applies full overrides and series style properties when chart is ready', () => {
    initThemeFromConfig(baseTheme);
    const { widget, applyOverrides, setChartStyleProperties } =
      createMockWidget();
    setWidget(widget);
    setChartReady(true);

    flushPendingTheme();

    expect(applyOverrides).toHaveBeenCalledTimes(1);
    const overrides = applyOverrides.mock.calls[0][0];
    expect(overrides['mainSeriesProperties.lineStyle.color']).toBe(
      'rgb(171,205,239)',
    );
    expect(overrides['mainSeriesProperties.candleStyle.upColor']).toBe(
      'rgb(0,255,0)',
    );
    expect(overrides['scalesProperties.textColor']).toBe('rgb(255,255,255)');

    expect(setChartStyleProperties).toHaveBeenCalledTimes(2);
    expect(setChartStyleProperties).toHaveBeenCalledWith(2, {
      color: 'rgb(171,205,239)',
      colorType: 'solid',
      linewidth: 2,
    });
    expect(setChartStyleProperties).toHaveBeenCalledWith(10, {
      topLineColor: 'rgb(171,205,239)',
      bottomLineColor: 'rgb(171,205,239)',
      topLineWidth: 2,
      bottomLineWidth: 2,
    });
  });

  it('uses successColor when lineColor is empty', () => {
    initThemeFromConfig({ ...baseTheme, lineColor: '' });
    const { widget, applyOverrides, setChartStyleProperties } =
      createMockWidget();
    setWidget(widget);
    setChartReady(true);

    flushPendingTheme();

    const overrides = applyOverrides.mock.calls[0][0];
    expect(overrides['mainSeriesProperties.lineStyle.color']).toBe(
      'rgb(0,255,0)',
    );
    expect(setChartStyleProperties).toHaveBeenCalledWith(
      2,
      expect.objectContaining({ color: 'rgb(0,255,0)' }),
    );
  });

  it('flushes the latest theme after applyThemeColors updated it', () => {
    initThemeFromConfig(baseTheme);
    applyThemeColors({ lineColor: 'rgb(222,111,0)' });

    const { widget, applyOverrides, setChartStyleProperties } =
      createMockWidget();
    setWidget(widget);
    setChartReady(true);

    flushPendingTheme();

    const overrides = applyOverrides.mock.calls[0][0];
    expect(overrides['mainSeriesProperties.lineStyle.color']).toBe(
      'rgb(222,111,0)',
    );
    expect(setChartStyleProperties).toHaveBeenCalledWith(
      2,
      expect.objectContaining({ color: 'rgb(222,111,0)' }),
    );
  });

  it('reports applyOverrides errors to RN without throwing', () => {
    initThemeFromConfig(baseTheme);
    const bridge = { postMessage: jest.fn() };
    (
      window as unknown as { ReactNativeWebView: typeof bridge }
    ).ReactNativeWebView = bridge;

    const { widget } = createMockWidget({
      applyOverrides: jest.fn(() => {
        throw new Error('flush override fail');
      }),
    });
    setWidget(widget);
    setChartReady(true);

    expect(() => flushPendingTheme()).not.toThrow();
    expect(bridge.postMessage).toHaveBeenCalledWith(
      expect.stringContaining('"message":"flush override fail"'),
    );
  });

  it('reports setChartStyleProperties errors to RN without throwing', () => {
    initThemeFromConfig(baseTheme);
    const bridge = { postMessage: jest.fn() };
    (
      window as unknown as { ReactNativeWebView: typeof bridge }
    ).ReactNativeWebView = bridge;

    const { widget } = createMockWidget({
      setChartStyleProperties: jest.fn(() => {
        throw new Error('flush series fail');
      }),
    });
    setWidget(widget);
    setChartReady(true);

    expect(() => flushPendingTheme()).not.toThrow();
    expect(bridge.postMessage).toHaveBeenCalledWith(
      expect.stringContaining('"message":"flush series fail"'),
    );
  });
});

describe('getBuiltInScaleLabelOverrides fallback chain', () => {
  it('falls back to sectionBackgroundColor when crosshairBackgroundColor is empty', () => {
    const theme = { ...baseTheme, crosshairBackgroundColor: '' };
    const overrides = getBuiltInScaleLabelOverrides(theme);
    expect(overrides['scalesProperties.crosshairLabelBgColorDark']).toBe(
      'rgb(34,34,34)',
    );
  });

  it('falls back to backgroundColor when both crosshair and section are empty', () => {
    const theme = {
      ...baseTheme,
      crosshairBackgroundColor: '',
      sectionBackgroundColor: '',
    };
    const overrides = getBuiltInScaleLabelOverrides(theme);
    expect(overrides['scalesProperties.crosshairLabelBgColorDark']).toBe(
      'rgb(0,0,0)',
    );
  });

  it('sets priceLineColor from currentPriceColor when available', () => {
    const overrides = getBuiltInScaleLabelOverrides(baseTheme);
    expect(overrides['mainSeriesProperties.priceLineColor']).toBe(
      'rgb(34,34,0)',
    );
  });

  it('falls back priceLineColor through lineColor when no currentPriceColor', () => {
    const theme = { ...baseTheme, currentPriceColor: '' };
    const overrides = getBuiltInScaleLabelOverrides(theme);
    expect(overrides['mainSeriesProperties.priceLineColor']).toBe(
      'rgb(171,205,239)',
    );
  });
});
