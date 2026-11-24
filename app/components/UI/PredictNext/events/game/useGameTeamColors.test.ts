import React from 'react';
import { renderHook } from '@testing-library/react-native';
import { brandColor, darkTheme, lightTheme } from '@metamask/design-tokens';
import { ThemeContext } from '../../../../../util/theme';
import { AppThemeKey } from '../../../../../util/theme/models';
import type {
  PredictGame,
  PredictHexColor,
  PredictTimestamp,
} from '../../types';
import {
  getContrastRatio,
  getReadableQuoteColors,
  MIN_LABEL_CONTRAST,
  MIN_TEAM_COLOR_CONTRAST,
  useGameTeamColors,
} from './useGameTeamColors';

// Team colors come from the Venue, not design tokens.
const CAROLINA = `#${'0085CA'}`;
const GREEN_BAY = `#${'203731'}`;
const RAVENS = `#${'241773'}`;
const GIANTS = `#${'0B2265'}`;
const DOLPHINS = `#${'008E97'}`;
const WHITE = `#${'FFFFFF'}`;
const BLACK = `#${'000000'}`;
const PALE_YELLOW = `#${'FFF7CC'}`;
// Mid tone: below 4.5:1 with both white and the dark ink.
const MID_ORANGE = `#${'D2492A'}`;
const INKS = { light: WHITE, dark: brandColor.grey1000 };

const darkThemeWrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(
    ThemeContext.Provider,
    {
      value: {
        colors: darkTheme.colors,
        themeAppearance: AppThemeKey.dark,
        typography: darkTheme.typography,
        shadows: darkTheme.shadows,
        brandColors: brandColor,
      },
    },
    children,
  );

const game = (colors: { away?: string; home?: string } = {}): PredictGame => ({
  status: 'scheduled',
  awayTeam: {
    name: 'Carolina Panthers',
    primaryColor: colors.away as PredictHexColor | undefined,
  },
  homeTeam: {
    name: 'Green Bay Packers',
    primaryColor: colors.home as PredictHexColor | undefined,
  },
  observedAt: '2026-10-29T12:00:00Z' as PredictTimestamp,
});

describe('useGameTeamColors', () => {
  it('uses each Team primary color', () => {
    const { result } = renderHook(() =>
      useGameTeamColors(game({ away: CAROLINA, home: GREEN_BAY })),
    );

    expect(result.current).toEqual({ away: CAROLINA, home: GREEN_BAY });
  });

  it('uses the theme fallbacks without a Game', () => {
    const { result } = renderHook(() => useGameTeamColors(undefined));

    expect(result.current).toEqual({
      away: lightTheme.colors.info.default,
      home: lightTheme.colors.success.default,
    });
  });

  it('falls back to the theme info color for away and success for home', () => {
    const { result } = renderHook(() => useGameTeamColors(game()));

    expect(result.current).toEqual({
      away: lightTheme.colors.info.default,
      home: lightTheme.colors.success.default,
    });
  });

  it('replaces dark Team colors with the theme colors in dark mode', () => {
    const { result } = renderHook(
      () => useGameTeamColors(game({ away: RAVENS, home: GIANTS })),
      { wrapper: darkThemeWrapper },
    );

    expect(result.current).toEqual({
      away: darkTheme.colors.info.default,
      home: darkTheme.colors.success.default,
    });
  });

  it('keeps a Team color that is readable in dark mode', () => {
    const { result } = renderHook(
      () => useGameTeamColors(game({ away: DOLPHINS, home: GIANTS })),
      { wrapper: darkThemeWrapper },
    );

    expect(result.current).toEqual({
      away: DOLPHINS,
      home: darkTheme.colors.success.default,
    });
  });

  it('keeps dark Team colors in light mode', () => {
    const { result } = renderHook(() =>
      useGameTeamColors(game({ away: RAVENS, home: GIANTS })),
    );

    expect(result.current).toEqual({ away: RAVENS, home: GIANTS });
  });

  it('keeps a Team color whose contrast cannot be measured', () => {
    const { result } = renderHook(
      () => useGameTeamColors(game({ away: 'navy' })),
      { wrapper: darkThemeWrapper },
    );

    expect(result.current.away).toBe('navy');
  });
});

describe('getContrastRatio', () => {
  it('returns 21 for black on white', () => {
    expect(getContrastRatio(BLACK, WHITE)).toBeCloseTo(21);
  });

  it('reads short hex colors', () => {
    expect(getContrastRatio(`#${'000'}`, `#${'fff'}`)).toBeCloseTo(21);
  });

  it('puts the dark Team colors below the floor on the dark card', () => {
    const background = darkTheme.colors.background.section;

    expect(getContrastRatio(RAVENS, background)).toBeLessThan(
      MIN_TEAM_COLOR_CONTRAST,
    );
    expect(getContrastRatio(GIANTS, background)).toBeLessThan(
      MIN_TEAM_COLOR_CONTRAST,
    );
  });

  it('returns undefined for a color that is not hex', () => {
    expect(getContrastRatio('navy', WHITE)).toBeUndefined();
  });
});

describe('getReadableQuoteColors', () => {
  it('keeps a dark Team fill with the light label', () => {
    expect(getReadableQuoteColors(GIANTS, INKS)).toEqual({
      fill: GIANTS,
      label: WHITE,
    });
  });

  it('keeps a pale Team fill with the dark label', () => {
    expect(getContrastRatio(WHITE, PALE_YELLOW)).toBeLessThan(
      MIN_LABEL_CONTRAST,
    );

    const colors = getReadableQuoteColors(PALE_YELLOW, INKS);

    expect(colors).toEqual({ fill: PALE_YELLOW, label: brandColor.grey1000 });
    expect(getContrastRatio(colors.label, colors.fill)).toBeGreaterThanOrEqual(
      MIN_LABEL_CONTRAST,
    );
  });

  it('darkens a mid-tone fill just enough for the light label', () => {
    expect(getContrastRatio(WHITE, MID_ORANGE)).toBeLessThan(
      MIN_LABEL_CONTRAST,
    );
    expect(getContrastRatio(brandColor.grey1000, MID_ORANGE)).toBeLessThan(
      MIN_LABEL_CONTRAST,
    );

    const { fill, label } = getReadableQuoteColors(MID_ORANGE, INKS);
    const ratio = getContrastRatio(label, fill) as number;

    expect(label).toBe(WHITE);
    expect(fill).not.toBe(MID_ORANGE);
    expect(ratio).toBeGreaterThanOrEqual(MIN_LABEL_CONTRAST);
    expect(ratio).toBeLessThan(MIN_LABEL_CONTRAST + 0.1);
  });

  it('keeps the hue of a darkened fill', () => {
    const { fill } = getReadableQuoteColors(MID_ORANGE, INKS);
    const [red, green, blue] = [1, 3, 5].map((start) =>
      parseInt(fill.slice(start, start + 2), 16),
    );

    expect(green / red).toBeCloseTo(0x49 / 0xd2, 1);
    expect(blue / red).toBeCloseTo(0x2a / 0xd2, 1);
  });

  it('passes a color that is not hex through with the light label', () => {
    expect(getReadableQuoteColors('navy', INKS)).toEqual({
      fill: 'navy',
      label: WHITE,
    });
  });
});
