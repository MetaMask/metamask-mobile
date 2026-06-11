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
import React, { memo } from 'react';
import type { GamePlayEvent } from '../../../services/gameEvents';
import type { PredictMarketGame } from '../../../types';
import { PREDICT_GAME_LIVE_TEST_IDS } from '../PredictGameLive.testIds';

interface PredictPlayEventCardProps {
  event: GamePlayEvent;
  game: PredictMarketGame;
}

const SCORING_PLAY_TYPES = new Set(['shot_made', 'three_made', 'free_throw']);
const PERIOD_PLAY_TYPES = new Set(['period_start', 'period_end']);

/**
 * Single play-by-play row in the live feed: team chip, play description,
 * player stat line, and the clock/score context on the right.
 */
const PredictPlayEventCard: React.FC<PredictPlayEventCardProps> = ({
  event,
  game,
}) => {
  const tw = useTailwind();
  const isScoring = SCORING_PLAY_TYPES.has(event.playType);
  const isPeriodMarker = PERIOD_PLAY_TYPES.has(event.playType);
  const team = event.teamSide === 'home' ? game.homeTeam : game.awayTeam;

  if (isPeriodMarker) {
    return (
      <Box
        twClassName="mx-4 my-2 items-center"
        testID={PREDICT_GAME_LIVE_TEST_IDS.PLAY_EVENT_CARD}
      >
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Bold}
          color={TextColor.TextAlternative}
        >
          {event.description}
        </Text>
      </Box>
    );
  }

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="mx-4 my-1 p-3 rounded-[12px] bg-muted gap-3"
      testID={PREDICT_GAME_LIVE_TEST_IDS.PLAY_EVENT_CARD}
    >
      <Box
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        twClassName="w-10 h-10 rounded-full"
        style={tw.style({ backgroundColor: team.color })}
      >
        <Text
          variant={TextVariant.BodyXs}
          fontWeight={FontWeight.Bold}
          twClassName="text-white"
        >
          {team.abbreviation}
        </Text>
      </Box>

      <Box twClassName="flex-1 gap-0.5">
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={isScoring ? FontWeight.Bold : FontWeight.Medium}
          color={TextColor.TextDefault}
          numberOfLines={2}
        >
          {event.description}
        </Text>
        {event.player && (
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {event.player.name}
            {event.player.statLine ? ` · ${event.player.statLine}` : ''}
          </Text>
        )}
      </Box>

      <Box alignItems={BoxAlignItems.End} twClassName="gap-0.5">
        {(event.period || event.clock) && (
          <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
            {[event.period, event.clock].filter(Boolean).join(' · ')}
          </Text>
        )}
        <Text
          variant={TextVariant.BodySm}
          fontWeight={isScoring ? FontWeight.Bold : FontWeight.Regular}
          color={isScoring ? TextColor.TextDefault : TextColor.TextAlternative}
        >
          {event.scoreAfter.away}-{event.scoreAfter.home}
        </Text>
      </Box>
    </Box>
  );
};

export default memo(PredictPlayEventCard);
