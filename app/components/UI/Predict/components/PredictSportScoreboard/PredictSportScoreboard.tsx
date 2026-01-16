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
import {
  PredictSportScoreboardProps,
  GameState,
  Possession,
  Winner,
} from './PredictSportScoreboard.types';

/**
 * NFL scoreboard component that displays team helmets, scores, and game status.
 * Supports 4 game states: Pre-game, In-progress, Halftime, Final.
 * Shows possession indicator (football icon) during in-progress games.
 * Shows winner trophy during final games.
 */
const PredictSportScoreboard: React.FC<PredictSportScoreboardProps> = ({
  awayTeam,
  homeTeam,
  awayScore,
  homeScore,
  gameState,
  eventTitle,
  date,
  time,
  quarter,
  possession = Possession.None,
  winner = Winner.None,
  testID,
}) => {
  const helmetSize = 42;
  const footballSize = 14;

  const renderStatusSection = () => {
    switch (gameState) {
      case GameState.PreGame:
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

      case GameState.InProgress:
        return (
          <Box twClassName="items-center">
            {(quarter || time) && (
              <Text variant={TextVariant.BodyMd} twClassName="text-alternative">
                {quarter && time ? `${quarter} • ${time}` : quarter || time}
              </Text>
            )}
          </Box>
        );

      case GameState.Halftime:
        return (
          <Box twClassName="items-center">
            <Text variant={TextVariant.BodyMd} twClassName="text-alternative">
              {strings('predict.sports.halftime')}
            </Text>
          </Box>
        );

      case GameState.Final:
        return (
          <Box twClassName="items-center">
            <Text variant={TextVariant.BodyMd} twClassName="text-alternative">
              {strings('predict.sports.final')}
            </Text>
          </Box>
        );

      default:
        return null;
    }
  };

  const renderTeamSection = (
    team: typeof awayTeam | typeof homeTeam,
    score: number | undefined,
    side: 'away' | 'home',
    hasPossession: boolean,
    hasWon: boolean,
  ) => {
    const showScore = gameState !== GameState.PreGame;
    const showPossession = gameState === GameState.InProgress && hasPossession;
    const showWinner = gameState === GameState.Final && hasWon;

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
          possession === Possession.Away,
          winner === Winner.Away,
        )}
      </Box>

      <Box twClassName="flex-shrink-0">{renderStatusSection()}</Box>

      <Box twClassName="flex-1">
        {renderTeamSection(
          homeTeam,
          homeScore,
          'home',
          possession === Possession.Home,
          winner === Winner.Home,
        )}
      </Box>
    </Box>
  );
};

export default PredictSportScoreboard;
