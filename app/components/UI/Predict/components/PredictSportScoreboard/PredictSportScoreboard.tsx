import React, { useMemo } from 'react';
import {
  Box,
  Text,
  TextVariant,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  FontWeight,
} from '@metamask/design-system-react-native';
import I18n, { strings } from '../../../../../../locales/i18n';
import { getIntlDateTimeFormatter } from '../../../../../util/intl';
import PredictSportTeamLogo from '../PredictSportTeamLogo/PredictSportTeamLogo';
import { getLeagueConfig } from '../../constants/sportLeagueConfigs';
import PredictSportWinner from '../PredictSportWinner/PredictSportWinner';
import { PredictMarketGame } from '../../types';
import { useLiveGameUpdates } from '../../hooks/useLiveGameUpdates';
import { PREDICT_SPORT_SCOREBOARD_TEST_IDS } from './PredictSportScoreboard.testIds';

export interface PredictSportScoreboardProps {
  game: PredictMarketGame;
  testID?: string;
}

/**
 * Parses score string "away-home" (e.g., "21-14") into { away, home } numbers.
 */
const parseScoreString = (
  scoreString: string | null | undefined,
): { away: number; home: number } | null => {
  if (!scoreString) return null;

  const parts = scoreString.split('-');
  if (parts.length !== 2) return null;

  const away = parseInt(parts[0], 10);
  const home = parseInt(parts[1], 10);

  if (isNaN(away) || isNaN(home)) return null;

  return { away, home };
};

/**
 * Formats startTime to { date: "Sat, Jan 17", time: "2:30 PM" }.
 */
const formatGameDateTime = (
  startTime: string,
  locale: string,
): { date: string; time: string } => {
  const dateObj = new Date(startTime);

  const dateFormatter = getIntlDateTimeFormatter(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const timeFormatter = getIntlDateTimeFormatter(locale, {
    hour: 'numeric',
    minute: '2-digit',
  });

  return {
    date: dateFormatter.format(dateObj),
    time: timeFormatter.format(dateObj),
  };
};

const TEAM_ICON_SIZE = 40;
const POSSESSION_ICON_SIZE = 14;

/**
 * Sports scoreboard with live WebSocket updates and league-specific rendering.
 * Team icons and possession indicators are resolved from the league config.
 * If no custom TeamIcon is configured for a league, the team's remote logo is used.
 * If no PossessionIcon is configured, possession indicators are not rendered.
 *
 * UI states:
 * - Pre-game (scheduled): date/time
 * - In-progress (ongoing): period, clock, scores, possession (if configured)
 * - Halftime (period=HT): "Halftime", scores
 * - Final (ended): "Final", scores, winner trophy
 */
const PredictSportScoreboard: React.FC<PredictSportScoreboardProps> = ({
  game,
  testID,
}) => {
  const { gameUpdate } = useLiveGameUpdates(game.id);
  const config = getLeagueConfig(game.league);

  const mergedData = useMemo(() => {
    const liveScore = gameUpdate?.score
      ? parseScoreString(gameUpdate.score)
      : null;

    return {
      status: gameUpdate?.status ?? game.status,
      period: gameUpdate?.period ?? game.period,
      elapsed: gameUpdate?.elapsed ?? game.elapsed,
      turn: gameUpdate?.turn ?? game.turn,
      awayScore: liveScore?.away ?? game.score?.away,
      homeScore: liveScore?.home ?? game.score?.home,
    };
  }, [game, gameUpdate]);

  const { date, time } = useMemo(
    () => formatGameDateTime(game.startTime, I18n.locale),
    [game.startTime],
  );

  const period = mergedData.period;

  const isPreGame = mergedData.status === 'scheduled' || period === 'NS';
  const isHalftime = period === 'HT';
  const isEndOfQuarter =
    period === 'End Q1' || period === 'End Q3' || period === 'End Q4';
  const isOvertime = period === 'OT';
  const isFinal =
    mergedData.status === 'ended' || period === 'FT' || period === 'VFT';
  const isInProgress =
    !isPreGame &&
    !isHalftime &&
    !isEndOfQuarter &&
    !isFinal &&
    (mergedData.status === 'ongoing' ||
      period === 'Q1' ||
      period === 'Q2' ||
      period === 'Q3' ||
      period === 'Q4' ||
      isOvertime);

  const awayHasPossession =
    isInProgress &&
    mergedData.turn?.toLowerCase() === game.awayTeam.abbreviation.toLowerCase();
  const homeHasPossession =
    isInProgress &&
    mergedData.turn?.toLowerCase() === game.homeTeam.abbreviation.toLowerCase();

  const awayWon =
    isFinal &&
    mergedData.awayScore !== undefined &&
    mergedData.homeScore !== undefined &&
    mergedData.awayScore > mergedData.homeScore;
  const homeWon =
    isFinal &&
    mergedData.awayScore !== undefined &&
    mergedData.homeScore !== undefined &&
    mergedData.homeScore > mergedData.awayScore;

  const renderCenterContent = () => {
    if (isPreGame) {
      return (
        <Box twClassName="items-center justify-center h-[40px]">
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            twClassName="text-default text-center"
          >
            {date}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            twClassName="text-default text-center"
          >
            {time}
          </Text>
        </Box>
      );
    }

    if (isInProgress || isOvertime || isEndOfQuarter || isHalftime || isFinal) {
      let statusText = '';
      if (isHalftime) {
        statusText = strings('predict.sports.halftime');
      } else if (isFinal) {
        statusText = strings('predict.sports.final');
      } else if (isEndOfQuarter) {
        statusText = period ?? '';
      } else if (isOvertime) {
        statusText = mergedData.elapsed ? `OT • ${mergedData.elapsed}` : 'OT';
      } else if (isInProgress && period && mergedData.elapsed) {
        statusText = `${period} • ${mergedData.elapsed}`;
      } else {
        statusText = period || mergedData.elapsed || '';
      }

      return (
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          twClassName="gap-4"
        >
          <Text
            variant={TextVariant.DisplayMd}
            twClassName="text-default leading-none"
          >
            {mergedData.awayScore ?? 0}
          </Text>

          <Box twClassName="items-center">
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              twClassName="text-alternative text-center"
            >
              {statusText}
            </Text>
          </Box>

          <Text
            variant={TextVariant.DisplayMd}
            twClassName="text-default leading-none"
          >
            {mergedData.homeScore ?? 0}
          </Text>
        </Box>
      );
    }

    return null;
  };

  return (
    <Box
      flexDirection={BoxFlexDirection.Column}
      twClassName="w-full py-3 gap-2"
      testID={testID}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-3"
      >
        {config.TeamIcon ? (
          <config.TeamIcon
            color={game.awayTeam.color}
            size={TEAM_ICON_SIZE}
            testID={`${testID}${PREDICT_SPORT_SCOREBOARD_TEST_IDS.AWAY_TEAM_ICON}`}
          />
        ) : (
          <PredictSportTeamLogo
            uri={game.awayTeam.logo}
            color={game.awayTeam.color}
            size={TEAM_ICON_SIZE}
            testID={`${testID}${PREDICT_SPORT_SCOREBOARD_TEST_IDS.AWAY_TEAM_ICON}`}
          />
        )}

        <Box twClassName="flex-1">{renderCenterContent()}</Box>

        {config.TeamIcon ? (
          <config.TeamIcon
            color={game.homeTeam.color}
            size={TEAM_ICON_SIZE}
            flipped
            testID={`${testID}${PREDICT_SPORT_SCOREBOARD_TEST_IDS.HOME_TEAM_ICON}`}
          />
        ) : (
          <PredictSportTeamLogo
            uri={game.homeTeam.logo}
            color={game.homeTeam.color}
            size={TEAM_ICON_SIZE}
            testID={`${testID}${PREDICT_SPORT_SCOREBOARD_TEST_IDS.HOME_TEAM_ICON}`}
          />
        )}
      </Box>

      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
        >
          <Box twClassName="w-[40px]">
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              twClassName="text-alternative text-center"
            >
              {game.awayTeam.abbreviation.toUpperCase()}
            </Text>
          </Box>
          {config.PossessionIcon && awayHasPossession && (
            <Box twClassName="ml-1">
              <config.PossessionIcon
                size={POSSESSION_ICON_SIZE}
                testID={`${testID}${PREDICT_SPORT_SCOREBOARD_TEST_IDS.AWAY_POSSESSION}`}
              />
            </Box>
          )}
          {awayWon && (
            <Box twClassName="ml-1">
              <PredictSportWinner
                size={POSSESSION_ICON_SIZE}
                testID={`${testID}${PREDICT_SPORT_SCOREBOARD_TEST_IDS.AWAY_WINNER}`}
              />
            </Box>
          )}
        </Box>

        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
        >
          {config.PossessionIcon && homeHasPossession && (
            <Box twClassName="mr-1">
              <config.PossessionIcon
                size={POSSESSION_ICON_SIZE}
                testID={`${testID}${PREDICT_SPORT_SCOREBOARD_TEST_IDS.HOME_POSSESSION}`}
              />
            </Box>
          )}
          {homeWon && (
            <Box twClassName="mr-1">
              <PredictSportWinner
                size={POSSESSION_ICON_SIZE}
                testID={`${testID}${PREDICT_SPORT_SCOREBOARD_TEST_IDS.HOME_WINNER}`}
              />
            </Box>
          )}
          <Box twClassName="w-[40px]">
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              twClassName="text-alternative text-center"
            >
              {game.homeTeam.abbreviation.toUpperCase()}
            </Text>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default PredictSportScoreboard;
