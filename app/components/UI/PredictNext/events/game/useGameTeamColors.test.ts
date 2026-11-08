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
