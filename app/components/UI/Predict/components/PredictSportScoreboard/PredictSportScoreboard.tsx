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
import PredictSportTeamHelmet from '../PredictSportTeamHelmet/PredictSportTeamHelmet';
import PredictSportFootballIcon from '../PredictSportFootballIcon/PredictSportFootballIcon';
import PredictSportWinner from '../PredictSportWinner/PredictSportWinner';
import { PredictMarketGame } from '../../types';
import { useLiveGameUpdates } from '../../hooks/useLiveGameUpdates';

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

const HELMET_SIZE = 40;
const FOOTBALL_SIZE = 14;

/**
 * NFL scoreboard with live WebSocket updates. UI states:
 * - Pre-game (scheduled): date/time
 * - In-progress (ongoing): quarter, clock, scores, possession
 * - Halftime (period=HT): "Halftime", scores
 * - Final (ended): "Final", scores, winner trophy
 */
const PredictSportScoreboard: React.FC<PredictSportScoreboardProps> = ({
  game,
  testID,
}) => {
  const { gameUpdate } = useLiveGameUpdates(game.id);

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

  const isPreGame = mergedData.status === 'scheduled';
  const isHalftime =
    mergedData.status === 'ongoing' &&
    mergedData.period?.toUpperCase() === 'HT';
  const isInProgress =
    mergedData.status === 'ongoing' &&
    mergedData.period?.toUpperCase() !== 'HT';
  const isFinal = mergedData.status === 'ended';

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

    if (isInProgress || isHalftime || isFinal) {
      const statusText = isHalftime
        ? strings('predict.sports.halftime')
        : isFinal
          ? strings('predict.sports.final')
          : mergedData.period && mergedData.elapsed
            ? `${mergedData.period} • ${mergedData.elapsed}`
            : mergedData.period || mergedData.elapsed || '';

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
        <PredictSportTeamHelmet
          color={game.awayTeam.color}
          size={HELMET_SIZE}
          testID={`${testID}-away-helmet`}
        />

        <Box twClassName="flex-1">{renderCenterContent()}</Box>

        <PredictSportTeamHelmet
          color={game.homeTeam.color}
          size={HELMET_SIZE}
          flipped
          testID={`${testID}-home-helmet`}
        />
      </Box>

      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          twClassName="w-[40px] gap-1"
        >
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            twClassName="text-alternative text-center"
          >
            {game.awayTeam.abbreviation.toUpperCase()}
          </Text>
          {awayHasPossession && (
            <PredictSportFootballIcon
              size={FOOTBALL_SIZE}
              testID={`${testID}-away-possession`}
            />
          )}
          {awayWon && (
            <PredictSportWinner
              size={FOOTBALL_SIZE}
              testID={`${testID}-away-winner`}
            />
          )}
        </Box>

        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          twClassName="w-[40px] gap-1"
        >
          {homeHasPossession && (
            <PredictSportFootballIcon
              size={FOOTBALL_SIZE}
              testID={`${testID}-home-possession`}
            />
          )}
          {homeWon && (
            <PredictSportWinner
              size={FOOTBALL_SIZE}
              testID={`${testID}-home-winner`}
            />
          )}
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
  );
};

export default PredictSportScoreboard;
