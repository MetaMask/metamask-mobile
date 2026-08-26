/**
 * @jest-environment jsdom
 */
import {
  generatePaletteShades,
  createChartWidget,
  scheduleChartLayoutSettledNotify,
  ensureLibraryLoaded,
  type CreateChartWidgetOptions,
} from '../initChart';
import {
  __resetStateForTests,
  getWidget,
  setWidget,
  getCurrentSymbol,
  getCurrentResolution,
} from '../../core/state';
import { initThemeFromConfig } from '../theme';
import type {
  ChartConfig,
  ChartTheme,
  TVChartingLibraryWidget,
} from '../../core/types';

jest.mock('../../core/bridge', () => ({
  postToRN: jest.fn(),
  reportErrorToRN: jest.fn(),
}));

jest.mock('../../core/loadLibrary', () => ({
  loadTradingViewLibrary: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../externalLinkBridge', () => ({
  installTradingViewExternalOpenBridge: jest.fn(),
}));

const { postToRN, reportErrorToRN } = jest.requireMock('../../core/bridge') as {
  postToRN: jest.Mock;
  reportErrorToRN: jest.Mock;
};

const { loadTradingViewLibrary } = jest.requireMock(
  '../../core/loadLibrary',
) as { loadTradingViewLibrary: jest.Mock };

const { installTradingViewExternalOpenBridge } = jest.requireMock(
  '../externalLinkBridge',
) as { installTradingViewExternalOpenBridge: jest.Mock };

const baseTheme: ChartTheme = {
  backgroundColor: 'rgb(0, 0, 0)',
  borderColor: 'rgb(17, 17, 17)',
  textColor: 'rgb(255, 255, 255)',
  textDefaultColor: 'rgb(255, 255, 255)',
  sectionBackgroundColor: 'rgb(34, 34, 34)',
  crosshairBackgroundColor: 'rgb(51, 51, 51)',
  crosshairTextColor: 'rgb(238, 238, 238)',
  legendTextColor: 'rgb(170, 170, 170)',
  textAlternativeColor: 'rgb(187, 187, 187)',
  successColor: 'rgb(0, 255, 0)',
  lineColor: 'rgb(171, 205, 239)',
  errorColor: 'rgb(255, 0, 0)',
  primaryColor: 'rgb(0, 51, 255)',
  currentPriceColor: 'rgb(34, 34, 0)',
};

const baseConfig: ChartConfig = {
  libraryUrl: '/charting_library/',
  theme: baseTheme,
  features: {},
};

function makeMockWidget(): TVChartingLibraryWidget & {
  _onChartReadyCb: (() => void) | null;
} {
  const mock = {
    _onChartReadyCb: null as (() => void) | null,
    onChartReady(cb: () => void) {
      mock._onChartReadyCb = cb;
    },
    activeChart: jest.fn(),
    applyOverrides: jest.fn(),
    subscribe: jest.fn(),
    resize: jest.fn(),
    remove: jest.fn(),
  };
  return mock;
}

function installTradingViewGlobal(): jest.Mock {
  const mockWidget = makeMockWidget();
  const ctor = jest.fn().mockReturnValue(mockWidget);
  (window as unknown as Record<string, unknown>).TradingView = { widget: ctor };
  return ctor;
}

/* eslint-disable @metamask/design-tokens/color-no-hex -- generatePaletteShades takes/returns hex */
describe('generatePaletteShades', () => {
  it('returns exactly 19 shades', () => {
    const shades = generatePaletteShades('#ff8800');
    expect(shades).toHaveLength(19);
  });

  it('first shade is lighter than base, last shade is darker', () => {
    const shades = generatePaletteShades('#808080');
    const parseR = (hex: string) => Number.parseInt(hex.slice(1, 3), 16);
    expect(parseR(shades[0])).toBeGreaterThan(parseR(shades[9]));
    expect(parseR(shades[18])).toBeLessThan(parseR(shades[9]));
  });

  it('middle shade (index 9) equals the base color', () => {
    const shades = generatePaletteShades('#abcdef');
    expect(shades[9].toLowerCase()).toBe('#abcdef');
  });

  it('all shades are valid hex strings', () => {
    const shades = generatePaletteShades('#123456');
    for (const shade of shades) {
      expect(shade).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('handles pure black', () => {
    const shades = generatePaletteShades('#000000');
    expect(shades[0]).toBe('#ffffff');
    expect(shades[18]).toBe('#000000');
  });

  it('handles pure white', () => {
    const shades = generatePaletteShades('#ffffff');
    expect(shades[0]).toBe('#ffffff');
    expect(shades[18]).toBe('#000000');
  });
});
/* eslint-enable @metamask/design-tokens/color-no-hex */

describe('createChartWidget', () => {
  let ctor: jest.Mock;

  beforeEach(() => {
    __resetStateForTests();
    postToRN.mockClear();
    reportErrorToRN.mockClear();
    installTradingViewExternalOpenBridge.mockClear();
    initThemeFromConfig(baseTheme);
    ctor = installTradingViewGlobal();
  });

  afterEach(() => {
    delete (window as unknown as Record<string, unknown>).TradingView;
  });

  const defaultOptions: CreateChartWidgetOptions = {
    datafeed: {},
  };

  it('throws when TradingView is not on window', () => {
    delete (window as unknown as Record<string, unknown>).TradingView;
    expect(() => createChartWidget(baseConfig, defaultOptions)).toThrow(
      'TradingView library not loaded',
    );
  });

  it('throws when theme is not initialised', () => {
    __resetStateForTests();
    expect(() => createChartWidget(baseConfig, defaultOptions)).toThrow(
      'Theme not initialised',
    );
  });

  it('calls TradingView.widget constructor with correct symbol and interval', () => {
    createChartWidget(baseConfig, defaultOptions);
    expect(ctor).toHaveBeenCalledTimes(1);
    const args = ctor.mock.calls[0][0] as Record<string, unknown>;
    expect(args.symbol).toBe(getCurrentSymbol());
    expect(args.interval).toBe(getCurrentResolution());
    expect(args.container).toBe('tv_chart_container');
    expect(args.theme).toBe('Dark');
    expect(args.autosize).toBe(true);
  });

  it('passes datafeed and library_path from config', () => {
    const datafeed = { onReady: jest.fn() };
    createChartWidget(baseConfig, { ...defaultOptions, datafeed });
    const args = ctor.mock.calls[0][0] as Record<string, unknown>;
    expect(args.datafeed).toBe(datafeed);
    expect(args.library_path).toBe('/charting_library/');
  });

  it('passes timeframe and customFormatters when provided', () => {
    const tf = { type: 'time-range' as const, from: 100, to: 200 };
    const fmt = { priceFormatter: jest.fn() };
    createChartWidget(baseConfig, {
      ...defaultOptions,
      timeframe: tf,
      customFormatters: fmt,
    });
    const args = ctor.mock.calls[0][0] as Record<string, unknown>;
    expect(args.timeframe).toBe(tf);
    expect(args.custom_formatters).toBe(fmt);
  });

  it('stores widget via setWidget', () => {
    const widget = createChartWidget(baseConfig, defaultOptions);
    expect(getWidget()).toBe(widget);
  });

  it('includes disabledFeatures with use_localstorage_for_settings always present', () => {
    createChartWidget(baseConfig, defaultOptions);
    const args = ctor.mock.calls[0][0] as Record<string, unknown>;
    expect(args.disabled_features).toContain('use_localstorage_for_settings');
  });

  it('disables drawing tools features when enableDrawingTools is false', () => {
    const config: ChartConfig = {
      ...baseConfig,
      features: { enableDrawingTools: false },
    };
    createChartWidget(config, defaultOptions);
    const args = ctor.mock.calls[0][0] as Record<string, unknown>;
    const disabled = args.disabled_features as string[];
    expect(disabled).toContain('left_toolbar');
    expect(disabled).toContain('context_menus');
  });

  it('does not disable drawing tools when enableDrawingTools is true', () => {
    const config: ChartConfig = {
      ...baseConfig,
      features: { enableDrawingTools: true },
    };
    createChartWidget(config, defaultOptions);
    const args = ctor.mock.calls[0][0] as Record<string, unknown>;
    const disabled = args.disabled_features as string[];
    expect(disabled).not.toContain('left_toolbar');
  });

  it('includes custom_themes with palette shades for success/error', () => {
    createChartWidget(baseConfig, defaultOptions);
    const args = ctor.mock.calls[0][0] as Record<string, unknown>;
    const customThemes = args.custom_themes as {
      dark: { color1: string[]; color3: string[] };
    };
    expect(customThemes.dark.color1).toHaveLength(19);
    expect(customThemes.dark.color3).toHaveLength(19);
  });

  it('sets loading_screen colors from theme', () => {
    createChartWidget(baseConfig, defaultOptions);
    const args = ctor.mock.calls[0][0] as Record<string, unknown>;
    const ls = args.loading_screen as Record<string, string>;
    expect(ls.backgroundColor).toBe(baseTheme.backgroundColor);
    expect(ls.foregroundColor).toBe(baseTheme.successColor);
  });

  it('uses provided timezone instead of resolving', () => {
    createChartWidget(baseConfig, {
      ...defaultOptions,
      timezone: 'America/New_York',
    });
    const args = ctor.mock.calls[0][0] as Record<string, unknown>;
    expect(args.timezone).toBe('America/New_York');
  });
});

describe('createChartWidget onChartReady', () => {
  let mockWidgetInstance: ReturnType<typeof makeMockWidget>;

  beforeEach(() => {
    __resetStateForTests();
    postToRN.mockClear();
    reportErrorToRN.mockClear();
    installTradingViewExternalOpenBridge.mockClear();
    initThemeFromConfig(baseTheme);

    mockWidgetInstance = makeMockWidget();
    const ctor = jest.fn().mockReturnValue(mockWidgetInstance);
    (window as unknown as Record<string, unknown>).TradingView = {
      widget: ctor,
    };
  });

  afterEach(() => {
    delete (window as unknown as Record<string, unknown>).TradingView;
  });

  it('posts CHART_READY when onChartReady fires', () => {
    createChartWidget(baseConfig, { datafeed: {} });
    mockWidgetInstance._onChartReadyCb?.();
    expect(postToRN).toHaveBeenCalledWith('CHART_READY', {});
  });

  it('installs external link bridge on chart ready', () => {
    createChartWidget(baseConfig, { datafeed: {} });
    mockWidgetInstance._onChartReadyCb?.();
    expect(installTradingViewExternalOpenBridge).toHaveBeenCalledTimes(1);
  });

  it('hides loading overlay element', () => {
    const overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    document.body.appendChild(overlay);

    createChartWidget(baseConfig, { datafeed: {} });
    mockWidgetInstance._onChartReadyCb?.();
    expect(overlay.classList.contains('hidden')).toBe(true);

    document.body.removeChild(overlay);
  });

  it('calls onReady callback with the widget', () => {
    const onReady = jest.fn();
    const widget = createChartWidget(baseConfig, { datafeed: {}, onReady });
    mockWidgetInstance._onChartReadyCb?.();
    expect(onReady).toHaveBeenCalledWith(widget);
  });

  it('reports onReady callback errors to RN', () => {
    const onReady = jest.fn(() => {
      throw new Error('callback boom');
    });
    createChartWidget(baseConfig, { datafeed: {}, onReady });
    mockWidgetInstance._onChartReadyCb?.();
    expect(reportErrorToRN).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('scheduleChartLayoutSettledNotify', () => {
  beforeEach(() => {
    __resetStateForTests();
    postToRN.mockClear();
  });

  it('posts CHART_LAYOUT_SETTLED after two rAF ticks when widget exists', () => {
    setWidget(makeMockWidget() as unknown as TVChartingLibraryWidget);
    const rafCallbacks: (() => void)[] = [];
    jest
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((cb: FrameRequestCallback) => {
        rafCallbacks.push(cb as unknown as () => void);
        return rafCallbacks.length;
      });

    scheduleChartLayoutSettledNotify();

    expect(postToRN).not.toHaveBeenCalled();
    rafCallbacks[0]();
    expect(postToRN).not.toHaveBeenCalled();
    rafCallbacks[1]();
    expect(postToRN).toHaveBeenCalledWith('CHART_LAYOUT_SETTLED', {});

    (window.requestAnimationFrame as jest.Mock).mockRestore();
  });

  it('does not post if widget is null', () => {
    const rafCallbacks: (() => void)[] = [];
    jest
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((cb: FrameRequestCallback) => {
        rafCallbacks.push(cb as unknown as () => void);
        return rafCallbacks.length;
      });

    scheduleChartLayoutSettledNotify();
    rafCallbacks[0]();
    rafCallbacks[1]();
    expect(postToRN).not.toHaveBeenCalledWith('CHART_LAYOUT_SETTLED', {});

    (window.requestAnimationFrame as jest.Mock).mockRestore();
  });

  it('falls back to setTimeout when requestAnimationFrame throws', () => {
    jest.useFakeTimers();
    setWidget(makeMockWidget() as unknown as TVChartingLibraryWidget);
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation(() => {
      throw new Error('rAF unavailable');
    });

    scheduleChartLayoutSettledNotify();
    jest.advanceTimersByTime(50);
    expect(postToRN).toHaveBeenCalledWith('CHART_LAYOUT_SETTLED', {});

    (window.requestAnimationFrame as jest.Mock).mockRestore();
    jest.useRealTimers();
  });
});

describe('ensureLibraryLoaded', () => {
  beforeEach(() => {
    loadTradingViewLibrary.mockClear();
  });

  it('delegates to loadTradingViewLibrary with the given URL', async () => {
    await ensureLibraryLoaded('/lib/tv/');
    expect(loadTradingViewLibrary).toHaveBeenCalledWith('/lib/tv/');
  });

  it('propagates rejections from loadTradingViewLibrary', async () => {
    loadTradingViewLibrary.mockRejectedValueOnce(new Error('load failed'));
    await expect(ensureLibraryLoaded('/lib/tv/')).rejects.toThrow(
      'load failed',
    );
  });
});
