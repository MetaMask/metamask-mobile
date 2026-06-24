import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React from 'react';
import I18n from '../../../../../../locales/i18n';
import { getIntlDateTimeFormatter } from '../../../../../util/intl';
import { getLeagueConfig } from '../../constants/sportLeagueConfigs';
import { isSoccerLeague } from '../../constants/sports';
import { PredictMarketGame, PredictSportTeam } from '../../types';
import { getSportLiveStatusText, isGameEnded } from '../../utils/scoreboard';
import PredictSportTeamLogo from '../PredictSportTeamLogo/PredictSportTeamLogo';
import PulsingLiveDot from '../PulsingLiveDot/PulsingLiveDot';
import { PREDICT_SPORT_SCOREBOARD_TEST_IDS } from './PredictSportScoreboard.testIds';

const TEAM_LOGO_SIZE = 32;
const COMPACT_TEAM_LOGO_SIZE = 28;

export interface PredictSportScoreboardProps {
  game: PredictMarketGame;
  /** Renders a denser layout for use inside carousel cards. */
  compact?: boolean;
  testID?: string;
}

/**
 * Formats startTime to { date: "Mon, June 8", time: "5:30 PM" }.
 */
const formatGameDateTime = (
  startTime: string,
): { date: string; time: string } => {
  const dateObj = new Date(startTime);
  const dateFormatter = getIntlDateTimeFormatter(I18n.locale, {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
  });
  const timeFormatter = getIntlDateTimeFormatter(I18n.locale, {
    hour: 'numeric',
    minute: '2-digit',
  });

  return {
    date: dateFormatter.format(dateObj),
    time: timeFormatter.format(dateObj),
  };
};

/**
 * Shared sports scoreboard used by market sport cards and the game details
 * screen. Subscribes to live game updates and renders team logos, scores, a
 * live/scheduled/final status, and team names.
 *
 * Center states:
 * - scheduled: match date and time
 * - ongoing: pulsing "Live" label with the period/elapsed status text
 * - ended: "Final"
 */
const PredictSportScoreboard: React.FC<PredictSportScoreboardProps> = ({
  game,
  compact = false,
  testID,
}) => {
  const config = getLeagueConfig(game.league);

  const gameData = {
    homeScore: game.score?.home ?? 0,
    awayScore: game.score?.away ?? 0,
    elapsed: game.elapsed,
    period: game.period,
    status: game.status,
  };

  const isEnded = isGameEnded({
    status: gameData.status,
    period: gameData.period,
    endTime: game.endTime,
  });
  const isScheduled = !isEnded && gameData.status === 'scheduled';
  const isLive = !isEnded && !isScheduled;

  const scheduledTime = formatGameDateTime(game.startTime);

  const statusText = getSportLiveStatusText({
    league: game.league,
    status: gameData.status,
    period: gameData.period,
    elapsed: gameData.elapsed,
    endTime: game.endTime,
  });

  const teamLogoSize = compact ? COMPACT_TEAM_LOGO_SIZE : TEAM_LOGO_SIZE;
  const showScores = isLive || isEnded;

  // Team display order is sport-dependent: soccer (and other draw-capable
  // leagues) show the home team on the left, while US sports (e.g. American
  // football) follow the away-then-home convention. testIDs stay tied to the
  // team identity (home/away), not the slot.
  const isHomeFirst = isSoccerLeague(game.league);
  const leftTeam = isHomeFirst ? game.homeTeam : game.awayTeam;
  const rightTeam = isHomeFirst ? game.awayTeam : game.homeTeam;
  const leftScore = isHomeFirst ? gameData.homeScore : gameData.awayScore;
  const rightScore = isHomeFirst ? gameData.awayScore : gameData.homeScore;
  const leftLogoTestID = testID
    ? `${testID}${
        isHomeFirst
          ? PREDICT_SPORT_SCOREBOARD_TEST_IDS.HOME_TEAM_LOGO
          : PREDICT_SPORT_SCOREBOARD_TEST_IDS.AWAY_TEAM_LOGO
      }`
    : undefined;
  const rightLogoTestID = testID
    ? `${testID}${
        isHomeFirst
          ? PREDICT_SPORT_SCOREBOARD_TEST_IDS.AWAY_TEAM_LOGO
          : PREDICT_SPORT_SCOREBOARD_TEST_IDS.HOME_TEAM_LOGO
      }`
    : undefined;

  const renderTeamLogo = (
    team: PredictSportTeam,
    logoTestID?: string,
    flipped?: boolean,
  ) =>
    config?.TeamIcon ? (
      <config.TeamIcon
        color={team.color}
        size={teamLogoSize}
        flipped={flipped}
        testID={logoTestID}
      />
    ) : (
      <PredictSportTeamLogo
        uri={team.logo}
        size={teamLogoSize}
        testID={logoTestID}
      />
    );

  return (
    <Box twClassName={compact ? 'gap-1' : 'gap-2'} testID={testID}>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="w-full"
      >
        {renderTeamLogo(leftTeam, leftLogoTestID)}

        {showScores && (
          <Text
            variant={TextVariant.DisplayMd}
            color={TextColor.TextDefault}
            fontWeight={FontWeight.Bold}
            twClassName={`${compact ? 'pl-2' : 'pl-3'}`}
            numberOfLines={1}
          >
            {leftScore}
          </Text>
        )}

        <Box
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          twClassName="flex-1"
        >
          {isScheduled ? (
            <>
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextDefault}
                twClassName="text-center"
              >
                {scheduledTime.date}
              </Text>
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextAlternative}
                twClassName="text-center"
              >
                {scheduledTime.time}
              </Text>
            </>
          ) : isLive ? (
            <>
              {/* The pulsing dot sits to the left of "Live" while an invisible
                  spacer of equal width balances the right side, so the "Live"
                  label and the status text stay centered on the same axis. */}
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                justifyContent={BoxJustifyContent.Center}
                twClassName="gap-1"
              >
                <PulsingLiveDot />
                <Text
                  variant={TextVariant.BodySm}
                  fontWeight={FontWeight.Medium}
                  color={TextColor.SuccessDefault}
                >
                  Live
                </Text>
                <Box twClassName="w-3" />
              </Box>
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextAlternative}
                twClassName="text-center"
              >
                {statusText}
              </Text>
            </>
          ) : (
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextAlternative}
              twClassName="text-center"
            >
              {statusText}
            </Text>
          )}
        </Box>

        {showScores && (
          <Text
            variant={TextVariant.DisplayMd}
            color={TextColor.TextDefault}
            fontWeight={FontWeight.Bold}
            twClassName={`${compact ? 'pr-2' : 'pr-3'} text-right`}
            numberOfLines={1}
          >
            {rightScore}
          </Text>
        )}

        {/* The right-side team icon is mirrored so directional icons (e.g. NFL
            helmets) face the left-side team. */}
        {renderTeamLogo(rightTeam, rightLogoTestID, true)}
      </Box>

      <Box
        flexDirection={BoxFlexDirection.Row}
        justifyContent={BoxJustifyContent.Between}
        twClassName="w-full"
      >
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
          numberOfLines={1}
          twClassName="flex-1"
        >
          {leftTeam.name}
        </Text>
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
          numberOfLines={1}
          twClassName="flex-1 text-right"
        >
          {rightTeam.name}
        </Text>
      </Box>
    </Box>
  );
};

export default PredictSportScoreboard;
