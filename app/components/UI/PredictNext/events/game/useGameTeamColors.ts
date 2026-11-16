import { useMemo } from 'react';
import { useTheme } from '../../../../../util/theme';
import type { PredictGame } from '../../types';
import type { GameSelection } from './createGamePresentation';

/**
 * Each Team's color: its own primary color, or the theme's info (away) and
 * success (home) colors when the Venue sends none or there is no Game.
 */
export const useGameTeamColors = (
  game: PredictGame | undefined,
): Record<GameSelection, string> => {
  const { colors } = useTheme();
  return useMemo(
    () => ({
      away: game?.awayTeam.primaryColor ?? colors.info.default,
      home: game?.homeTeam.primaryColor ?? colors.success.default,
    }),
    [
      colors.info.default,
      colors.success.default,
      game?.awayTeam.primaryColor,
      game?.homeTeam.primaryColor,
    ],
  );
};
