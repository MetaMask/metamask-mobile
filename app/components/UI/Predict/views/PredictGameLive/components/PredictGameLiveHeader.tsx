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
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React from 'react';
import { strings } from '../../../../../../../locales/i18n';
import type { GameUpdate, PredictMarketGame } from '../../../types';
import PredictSportScoreboard from '../../../components/PredictSportScoreboard';
import { PREDICT_GAME_LIVE_TEST_IDS } from '../PredictGameLive.testIds';

interface PredictGameLiveHeaderProps {
  game: PredictMarketGame;
  /** Live anchor from the sports WS (or scripted mock); `null` before first update. */
  gameUpdate: GameUpdate | null;
  /** Away-team win probability percent (0-100) from live moneyline prices. */
  awayPct?: number;
  /** Home-team win probability percent (0-100) from live moneyline prices. */
  homePct?: number;
}

/**
 * Live score header for the Game Live screen: shared scoreboard plus a
 * win-probability bar driven by live moneyline prices.
 */
const PredictGameLiveHeader: React.FC<PredictGameLiveHeaderProps> = ({
  game,
  gameUpdate,
  awayPct,
  homePct,
}) => {
  const tw = useTailwind();
  const hasProbabilities = awayPct !== undefined && homePct !== undefined;

  return (
    <Box
      twClassName="px-4 pb-3 gap-3"
      testID={PREDICT_GAME_LIVE_TEST_IDS.HEADER}
    >
      <PredictSportScoreboard game={game} gameUpdate={gameUpdate} />

      {hasProbabilities && (
        <Box
          twClassName="gap-1"
          testID={PREDICT_GAME_LIVE_TEST_IDS.WIN_PROBABILITY_BAR}
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            justifyContent={BoxJustifyContent.Between}
            alignItems={BoxAlignItems.Center}
          >
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Bold}
              color={TextColor.TextDefault}
            >
              {game.awayTeam.abbreviation} {awayPct}%
            </Text>
            <Text
              variant={TextVariant.BodyXs}
              color={TextColor.TextAlternative}
            >
              {strings('predict.game_live.win_probability')}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Bold}
              color={TextColor.TextDefault}
            >
              {game.homeTeam.abbreviation} {homePct}%
            </Text>
          </Box>
          <Box
            flexDirection={BoxFlexDirection.Row}
            twClassName="h-2 rounded-full overflow-hidden bg-muted"
          >
            <Box
              style={tw.style('h-full', {
                flex: awayPct,
                backgroundColor: game.awayTeam.color,
              })}
            />
            <Box style={tw.style('h-full w-[2px] bg-default')} />
            <Box
              style={tw.style('h-full', {
                flex: homePct,
                backgroundColor: game.homeTeam.color,
              })}
            />
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default PredictGameLiveHeader;
