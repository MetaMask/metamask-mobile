/**
 * @jest-environment jsdom
 */
import {
  __resetThemeForTests,
  applyThemeColors,
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
});
