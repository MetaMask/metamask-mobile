import React from 'react';
import {
  Box,
  Text,
  TextVariant,
  BoxFlexDirection,
  BoxAlignItems,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import PredictSportTeamHelmet from '../PredictSportTeamHelmet/PredictSportTeamHelmet';
import PredictSportFootballIcon from '../PredictSportFootballIcon/PredictSportFootballIcon';
import PredictSportWinner from '../PredictSportWinner/PredictSportWinner';
import { PredictGameStatus, PredictSportTeam } from '../../types';

export interface PredictSportScoreboardProps {
  awayTeam: Pick<PredictSportTeam, 'abbreviation' | 'color'>;
  homeTeam: Pick<PredictSportTeam, 'abbreviation' | 'color'>;
  awayScore?: number | undefined;
  homeScore?: number | undefined;
  gameStatus: PredictGameStatus;
  period?: string | null;
  eventTitle?: string;
  date?: string;
  time?: string;
  quarter?: string;
  /** Team abbreviation (lowercase) indicating which team has possession */
  turn?: string;
  testID?: string;
}

/**
 * NFL scoreboard component that displays team helmets, scores, and game status.
 * Supports 4 UI states: Pre-game, In-progress, Halftime, Final.
 * - 'scheduled' → Pre-game UI
 * - 'ongoing' + period (case-insensitive) === 'HT' → Halftime UI
 * - 'ongoing' → In-progress UI
 * - 'ended' → Final UI
 * Shows possession indicator (football icon) during in-progress games.
 * Shows winner trophy during final games.
 */
const PredictSportScoreboard: React.FC<PredictSportScoreboardProps> = ({
  awayTeam,
  homeTeam,
  awayScore,
  homeScore,
  gameStatus,
  period,
  eventTitle,
  date,
  time,
  quarter,
  turn,
  testID,
}) => {
  const helmetSize = 42;
  const footballSize = 14;

  // Derive UI state from gameStatus + period
  const isPreGame = gameStatus === 'scheduled';
  // Use case-insensitive comparison for halftime since API may return 'ht', 'HT', or 'Ht'
  const isHalftime = gameStatus === 'ongoing' && period?.toUpperCase() === 'HT';
  const isInProgress =
    gameStatus === 'ongoing' && period?.toUpperCase() !== 'HT';
  const isFinal = gameStatus === 'ended';

  // Derive possession from turn (team abbreviation, lowercase)
  const awayHasPossession =
    turn?.toLowerCase() === awayTeam.abbreviation.toLowerCase();
  const homeHasPossession =
    turn?.toLowerCase() === homeTeam.abbreviation.toLowerCase();

  // Derive winner from scores (only meaningful when game is final)
  const awayWon =
    isFinal &&
    awayScore !== undefined &&
    homeScore !== undefined &&
    awayScore > homeScore;
  const homeWon =
    isFinal &&
    awayScore !== undefined &&
    homeScore !== undefined &&
    homeScore > awayScore;

  const renderStatusSection = () => {
    if (isPreGame) {
      return (
        <Box twClassName="items-center">
          {eventTitle && (
            <Text variant={TextVariant.BodyMd} twClassName="text-default">
              {eventTitle}
            </Text>
          )}
          {date && (
            <Text variant={TextVariant.BodySm} twClassName="text-alternative">
              {date}
            </Text>
          )}
          {time && (
            <Text variant={TextVariant.BodySm} twClassName="text-alternative">
              {time}
            </Text>
          )}
        </Box>
      );
    }

    if (isInProgress) {
      return (
        <Box twClassName="items-center">
          {(quarter || time) && (
            <Text variant={TextVariant.BodyMd} twClassName="text-alternative">
              {quarter && time ? `${quarter} • ${time}` : quarter || time}
            </Text>
          )}
        </Box>
      );
    }

    if (isHalftime) {
      return (
        <Box twClassName="items-center">
          <Text variant={TextVariant.BodyMd} twClassName="text-alternative">
            {strings('predict.sports.halftime')}
          </Text>
        </Box>
      );
    }

    if (isFinal) {
      return (
        <Box twClassName="items-center">
          <Text variant={TextVariant.BodyMd} twClassName="text-alternative">
            {strings('predict.sports.final')}
          </Text>
        </Box>
      );
    }

    return null;
  };

  const renderTeamSection = (
    team: Pick<PredictSportTeam, 'abbreviation' | 'color'>,
    score: number | undefined,
    side: 'away' | 'home',
    hasPossession: boolean,
    hasWon: boolean,
  ) => {
    const showScore = !isPreGame;
    const showPossession = isInProgress && hasPossession;
    const showWinner = isFinal && hasWon;

    return (
      <Box
        flexDirection={BoxFlexDirection.Column}
        alignItems={side === 'away' ? BoxAlignItems.Start : BoxAlignItems.End}
        twClassName="gap-2"
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-3"
        >
          {side === 'away' && (
            <PredictSportTeamHelmet
              color={team.color}
              size={helmetSize}
              testID={`${testID}-away-helmet`}
            />
          )}

          {showScore && (
            <Text
              variant={TextVariant.DisplayMd}
              twClassName="text-default leading-none mt-1"
            >
              {score ?? 0}
            </Text>
          )}

          {side === 'home' && (
            <PredictSportTeamHelmet
              color={team.color}
              size={helmetSize}
              flipped
              testID={`${testID}-home-helmet`}
            />
          )}
        </Box>

        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-1"
        >
          {side === 'home' && showPossession && (
            <PredictSportFootballIcon
              size={footballSize}
              testID={`${testID}-${side}-possession`}
            />
          )}
          {side === 'home' && showWinner && (
            <PredictSportWinner
              size={footballSize}
              testID={`${testID}-${side}-winner`}
            />
          )}
          <Text variant={TextVariant.BodyMd} twClassName="text-alternative">
            {team.abbreviation}
          </Text>
          {side === 'away' && showPossession && (
            <PredictSportFootballIcon
              size={footballSize}
              testID={`${testID}-${side}-possession`}
            />
          )}
          {side === 'away' && showWinner && (
            <PredictSportWinner
              size={footballSize}
              testID={`${testID}-${side}-winner`}
            />
          )}
        </Box>
      </Box>
    );
  };

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="w-full py-3 px-4"
      testID={testID}
    >
      <Box twClassName="flex-1">
        {renderTeamSection(
          awayTeam,
          awayScore,
          'away',
          awayHasPossession,
          awayWon,
        )}
      </Box>

      <Box twClassName="flex-shrink-0">{renderStatusSection()}</Box>

      <Box twClassName="flex-1">
        {renderTeamSection(
          homeTeam,
          homeScore,
          'home',
          homeHasPossession,
          homeWon,
        )}
      </Box>
    </Box>
  );
};

export default PredictSportScoreboard;
