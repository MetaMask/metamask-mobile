import { renderHook } from '@testing-library/react-native';
import { lightTheme } from '@metamask/design-tokens';
import type {
  PredictGame,
  PredictHexColor,
  PredictTimestamp,
} from '../../types';
import { useGameTeamColors } from './useGameTeamColors';

// Team colors come from the Venue, not design tokens.
const CAROLINA = `#${'0085CA'}`;
const GREEN_BAY = `#${'203731'}`;

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
});
