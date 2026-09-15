import { colors } from '../../../../styles/common';
import {
  getPerpsProChooserIconColors,
  getPerpsProPillGradientColors,
  getPerpsProPillShimmerColors,
  PERPS_PRO_CANDLESTICK_DARK,
  PERPS_PRO_CANDLESTICK_LIGHT,
  PERPS_PRO_GOLD,
  PERPS_PRO_ICON_TILE_DARK,
  PERPS_PRO_ICON_TILE_LIGHT,
} from './perpsModeColors';

const GOLD_DEEP = colors.perpsProGoldDeep;
const GOLD_BRIGHT = colors.perpsProGoldBright;
const GOLD_PALE = colors.perpsProGoldPale;

describe('Perps Pro golds', () => {
  it('keeps the Figma hex values in the shared color map', () => {
    /* eslint-disable @metamask/design-tokens/color-no-hex */
    expect(GOLD_DEEP).toBe('#946500');
    expect(GOLD_BRIGHT).toBe('#CF8D00');
    expect(GOLD_PALE).toBe('#DDC598');
    /* eslint-enable @metamask/design-tokens/color-no-hex */
  });
});

describe('getPerpsProPillGradientColors', () => {
  it('alternates the light-theme label gradient between deep and bright gold', () => {
    expect(getPerpsProPillGradientColors(false)).toEqual([
      GOLD_DEEP,
      GOLD_BRIGHT,
      GOLD_DEEP,
      GOLD_BRIGHT,
      GOLD_DEEP,
    ]);
  });

  it('alternates the dark-theme label gradient between bright and pale gold', () => {
    expect(getPerpsProPillGradientColors(true)).toEqual([
      GOLD_BRIGHT,
      GOLD_PALE,
      GOLD_BRIGHT,
      GOLD_PALE,
      GOLD_BRIGHT,
    ]);
  });
});

describe('getPerpsProPillShimmerColors', () => {
  it.each([
    ['light', false, GOLD_DEEP, GOLD_BRIGHT],
    ['dark', true, GOLD_BRIGHT, GOLD_PALE],
  ])(
    'fades the %s-theme sweep from transparent through both golds',
    (_name, isDark, darker, lighter) => {
      expect(getPerpsProPillShimmerColors(isDark as boolean)).toEqual([
        'transparent',
        darker,
        lighter,
        'transparent',
      ]);
    },
  );
});

describe('PERPS_PRO_GOLD', () => {
  it('outlines the Pro pill in bright gold', () => {
    expect(PERPS_PRO_GOLD).toBe(GOLD_BRIGHT);
  });
});

describe('getPerpsProChooserIconColors', () => {
  it('returns the light-theme candlestick and 16% gold tile', () => {
    expect(getPerpsProChooserIconColors(false)).toEqual({
      candlestick: PERPS_PRO_CANDLESTICK_LIGHT,
      tile: PERPS_PRO_ICON_TILE_LIGHT,
    });
  });

  it('returns the dark-theme candlestick and 12% gold tile', () => {
    expect(getPerpsProChooserIconColors(true)).toEqual({
      candlestick: PERPS_PRO_CANDLESTICK_DARK,
      tile: PERPS_PRO_ICON_TILE_DARK,
    });
  });
});
