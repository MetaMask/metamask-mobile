import { AppThemeKey } from '../../../../../util/theme/models';
import {
  BOL_PARAMS,
  MACD_PARAMS,
  MA_INDICATOR_COLORS_DARK,
  MA_INDICATOR_COLORS_LIGHT,
  MA_LENGTHS,
  RSI_PARAMS,
  SUB_PANE_INDICATORS,
  TOKEN_DETAILS_TOGGLE_INDICATORS,
  buildIndicatorDefinitions,
  getMALabel,
  getMAOptions,
  isMovingAverage,
  mergeIndicatorDefinitions,
} from '../indicatorRegistry';

describe('indicatorRegistry', () => {
  describe('buildIndicatorDefinitions', () => {
    it.each([AppThemeKey.dark, AppThemeKey.light] as const)(
      'defines every built-in indicator for the %s theme',
      (theme) => {
        const definitions = buildIndicatorDefinitions(theme);

        expect(Object.keys(definitions)).toEqual([
          'MACD',
          'RSI',
          'BOL',
          'Volume',
          'MA5',
          'MA10',
          'MA20',
          'MA50',
          'MA200',
        ]);
        expect(definitions.MACD.study).toMatchObject({
          name: 'MACD',
          pane: 'sub',
        });
        expect(definitions.RSI.study).toMatchObject({
          name: 'Relative Strength Index',
          pane: 'sub',
        });
        expect(definitions.BOL.study.name).toBe('Bollinger Bands');
        expect(definitions.BOL.study.pane).toBeUndefined();
        expect(definitions.MA5.group).toBe('MA');
      },
    );

    it('matches the TradingView v30.1.0 plot titles', () => {
      const definitions = buildIndicatorDefinitions(AppThemeKey.dark);
      const titles = (name: string) =>
        definitions[name].legend?.plots.map((plot) => plot.tvTitle);

      expect(titles('MACD')).toEqual(['MACD', 'Signal', 'Histogram']);
      expect(titles('RSI')).toEqual(['Plot']);
      expect(titles('BOL')).toEqual(['Upper', 'Median', 'Lower']);
      expect(titles('Volume')).toEqual(['Volume']);
      expect(definitions.BOL.study.overrides).toHaveProperty(['Median.color']);
    });

    it('uses different palettes for dark and light themes', () => {
      expect(buildIndicatorDefinitions(AppThemeKey.dark)).not.toEqual(
        buildIndicatorDefinitions(AppThemeKey.light),
      );
    });

    it('defaults to the dark theme', () => {
      expect(buildIndicatorDefinitions()).toEqual(
        buildIndicatorDefinitions(AppThemeKey.dark),
      );
    });

    it('generates legend labels from the indicator params', () => {
      const definitions = buildIndicatorDefinitions(AppThemeKey.dark);

      expect(definitions.MACD.legend?.plots[0].label).toBe(
        `MACD(${MACD_PARAMS.fast},${MACD_PARAMS.slow})`,
      );
      expect(definitions.RSI.legend?.plots[0].label).toBe(
        `RSI(${RSI_PARAMS.length})`,
      );
      expect(definitions.BOL.legend?.title).toBe(
        `BB(${BOL_PARAMS.length},${BOL_PARAMS.mult})`,
      );
      Object.entries(MA_LENGTHS).forEach(([key, length]) => {
        expect(definitions[key].legend?.plots[0].label).toBe(`MA(${length})`);
      });
    });

    it('passes the same params as study inputs', () => {
      const definitions = buildIndicatorDefinitions(AppThemeKey.dark);

      expect(definitions.MACD.study.inputs).toEqual({
        in_0: MACD_PARAMS.fast,
        in_1: MACD_PARAMS.slow,
        in_2: MACD_PARAMS.signal,
      });
      expect(definitions.RSI.study.inputs).toEqual({
        length: RSI_PARAMS.length,
      });
      expect(definitions.MA200.study.inputs).toEqual({ length: 200 });
    });

    it('uses the theme palette for MA study overrides and legend colors', () => {
      const dark = buildIndicatorDefinitions(AppThemeKey.dark);
      const light = buildIndicatorDefinitions(AppThemeKey.light);

      expect(dark.MA20.study.overrides).toEqual({
        'Plot.color': MA_INDICATOR_COLORS_DARK.MA20,
      });
      expect(light.MA20.legend?.plots[0].color).toBe(
        MA_INDICATOR_COLORS_LIGHT.MA20,
      );
    });

    it('fills all four MACD histogram colorer slots', () => {
      const overrides = buildIndicatorDefinitions(AppThemeKey.dark).MACD.study
        .overrides as Record<string, unknown>;

      expect(Object.keys(overrides)).toEqual(
        expect.arrayContaining([
          'Histogram.color.0',
          'Histogram.color.1',
          'Histogram.color.2',
          'Histogram.color.3',
        ]),
      );
    });
  });

  describe('mergeIndicatorDefinitions', () => {
    it('adds new consumer indicators alongside the built-ins', () => {
      const merged = mergeIndicatorDefinitions(AppThemeKey.dark, {
        EMA21: {
          study: { name: 'Moving Average Exponential', inputs: { length: 21 } },
        },
      });

      expect(merged.EMA21.study.name).toBe('Moving Average Exponential');
      expect(merged.MACD).toEqual(
        buildIndicatorDefinitions(AppThemeKey.dark).MACD,
      );
    });

    it('lets consumer entries replace built-ins by name', () => {
      const custom = { study: { name: 'Relative Strength Index' } };

      const merged = mergeIndicatorDefinitions(AppThemeKey.dark, {
        RSI: custom,
      });

      expect(merged.RSI).toBe(custom);
    });

    it('returns the built-ins when no overrides are given', () => {
      expect(mergeIndicatorDefinitions(AppThemeKey.light)).toEqual(
        buildIndicatorDefinitions(AppThemeKey.light),
      );
    });
  });

  describe('isMovingAverage', () => {
    it.each(Object.keys(MA_LENGTHS))('returns true for %s', (name) => {
      expect(isMovingAverage(name)).toBe(true);
    });

    it.each(['MACD', 'RSI', 'BOL', 'Volume', 'MA7', 'toString', ''])(
      'returns false for %s',
      (name) => {
        expect(isMovingAverage(name)).toBe(false);
      },
    );
  });

  describe('getMALabel', () => {
    it('returns MA when no moving averages are active', () => {
      expect(getMALabel(['RSI'])).toBe('MA');
    });

    it('returns the MA name when exactly one is active', () => {
      expect(getMALabel(new Set(['RSI', 'MA20']))).toBe('MA20');
    });

    it('returns a count when several are active', () => {
      expect(getMALabel(['MA5', 'MACD', 'MA200'])).toBe('MA x2');
    });
  });

  describe('getMAOptions', () => {
    it('lists every MA in length order with theme colors', () => {
      expect(getMAOptions(AppThemeKey.light)).toEqual(
        Object.keys(MA_LENGTHS).map((key) => ({
          label: key,
          color:
            MA_INDICATOR_COLORS_LIGHT[
              key as keyof typeof MA_INDICATOR_COLORS_LIGHT
            ],
        })),
      );
    });
  });

  it('derives SUB_PANE_INDICATORS from study.pane', () => {
    expect([...SUB_PANE_INDICATORS].sort()).toEqual(['MACD', 'RSI']);
  });

  it('only lists registered indicators in TOKEN_DETAILS_TOGGLE_INDICATORS', () => {
    const definitions = buildIndicatorDefinitions(AppThemeKey.dark);

    TOKEN_DETAILS_TOGGLE_INDICATORS.forEach(({ name }) => {
      expect(definitions[name]).toBeDefined();
    });
  });
});
