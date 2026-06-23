import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { memo, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import type { GamePlayEvent, GamePlayType } from '../../../services/gameEvents';
import type { PredictMarketGame } from '../../../types';
import {
  isFreshFeedItem,
  useFeedItemEntrance,
} from '../hooks/useFeedItemEntrance';
import { PREDICT_GAME_LIVE_TEST_IDS } from '../PredictGameLive.testIds';

interface PredictPlayEventCardProps {
  event: GamePlayEvent;
  game: PredictMarketGame;
}

const SCORING_PLAY_TYPES = new Set(['shot_made', 'three_made', 'free_throw']);
const PERIOD_PLAY_TYPES = new Set(['period_start', 'period_end']);

const POINTS_BY_PLAY_TYPE: Record<string, number> = {
  three_made: 3,
  shot_made: 2,
  free_throw: 1,
};

/** Glyphs for non-scoring plays, echoing real sports-app feed rows. */
const FILLER_PLAY_ICONS: Partial<Record<GamePlayType, IconName>> = {
  shot_missed: IconName.Close,
  offensive_rebound: IconName.Refresh,
  defensive_rebound: IconName.Refresh,
  turnover: IconName.SwapHorizontal,
  foul: IconName.Warning,
  timeout: IconName.Clock,
};

const HIGHLIGHT_PEAK_OPACITY = 0.22;
const HIGHLIGHT_HOLD_MS = 350;
const HIGHLIGHT_DECAY_MS = 1_500;

/**
 * Play-by-play row in the live feed. Scoring plays render as full cards with
 * a team-color accent bar, points pill, and an entrance glow; non-scoring
 * plays render as compact glyph rows so the moments that move the score (and
 * the markets) stand out. Period markers render as centered captions.
 */
const PredictPlayEventCard: React.FC<PredictPlayEventCardProps> = ({
  event,
  game,
}) => {
  const tw = useTailwind();
  const isScoring = SCORING_PLAY_TYPES.has(event.playType);
  const isPeriodMarker = PERIOD_PLAY_TYPES.has(event.playType);
  const team = event.teamSide === 'home' ? game.homeTeam : game.awayTeam;
  const points = event.points ?? POINTS_BY_PLAY_TYPE[event.playType];

  const entranceStyle = useFeedItemEntrance(event.id, event.timestamp);

  // Team-color glow that flashes on fresh scoring plays, then decays.
  const highlight = useSharedValue(0);
  useEffect(() => {
    if (isScoring && isFreshFeedItem(event.timestamp)) {
      highlight.value = HIGHLIGHT_PEAK_OPACITY;
      highlight.value = withDelay(
        HIGHLIGHT_HOLD_MS,
        withTiming(0, { duration: HIGHLIGHT_DECAY_MS }),
      );
    } else {
      highlight.value = 0;
    }
  }, [event.id, event.timestamp, isScoring, highlight]);
  const highlightStyle = useAnimatedStyle(() => ({
    opacity: highlight.value,
  }));

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

  if (!isScoring) {
    const fillerIcon = FILLER_PLAY_ICONS[event.playType];
    return (
      <Animated.View style={[entranceStyle, tw.style('mx-4 my-0.5')]}>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="px-3 py-2 gap-3"
          testID={PREDICT_GAME_LIVE_TEST_IDS.PLAY_EVENT_CARD}
        >
          <Box
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Center}
            twClassName="w-8 h-8 rounded-full bg-muted"
            style={tw.style({ borderWidth: 2, borderColor: team.color })}
          >
            {fillerIcon ? (
              <Icon
                name={fillerIcon}
                size={IconSize.Sm}
                color={IconColor.IconAlternative}
              />
            ) : (
              <Text
                variant={TextVariant.BodyXs}
                fontWeight={FontWeight.Bold}
                color={TextColor.TextAlternative}
              >
                {team.abbreviation}
              </Text>
            )}
          </Box>

          <Box twClassName="flex-1 gap-0.5">
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextDefault}
              numberOfLines={1}
            >
              {event.description}
            </Text>
            <Text
              variant={TextVariant.BodyXs}
              color={TextColor.TextAlternative}
              numberOfLines={1}
            >
              {[team.abbreviation, event.player?.name, event.player?.statLine]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </Box>

          {(event.period || event.clock) && (
            <Text
              variant={TextVariant.BodyXs}
              color={TextColor.TextAlternative}
            >
              {[event.period, event.clock].filter(Boolean).join(' · ')}
            </Text>
          )}
        </Box>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[entranceStyle, tw.style('mx-4 my-1')]}>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="p-3 rounded-[12px] bg-muted gap-3 overflow-hidden"
        testID={PREDICT_GAME_LIVE_TEST_IDS.PLAY_EVENT_CARD}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            highlightStyle,
            tw.style({ backgroundColor: team.color }),
          ]}
        />
        <Box
          twClassName="absolute left-0 top-0 bottom-0 w-1"
          style={tw.style({ backgroundColor: team.color })}
        />

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
            fontWeight={FontWeight.Bold}
            color={TextColor.TextDefault}
            numberOfLines={2}
          >
            {event.description}
          </Text>
          {event.player && (
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {event.player.name}
              {event.player.statLine ? ` · ${event.player.statLine}` : ''}
            </Text>
          )}
        </Box>

        <Box alignItems={BoxAlignItems.End} twClassName="gap-0.5">
          {points ? (
            <Box
              twClassName="rounded-full px-2 py-0.5"
              style={tw.style({ backgroundColor: team.color })}
            >
              <Text
                variant={TextVariant.BodyXs}
                fontWeight={FontWeight.Bold}
                twClassName="text-white"
              >
                +{points}
              </Text>
            </Box>
          ) : (
            (event.period || event.clock) && (
              <Text
                variant={TextVariant.BodyXs}
                color={TextColor.TextAlternative}
              >
                {[event.period, event.clock].filter(Boolean).join(' · ')}
              </Text>
            )
          )}
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Bold}
            color={TextColor.TextDefault}
          >
            {event.scoreAfter.away}-{event.scoreAfter.home}
          </Text>
        </Box>
      </Box>
    </Animated.View>
  );
};

export default memo(PredictPlayEventCard);
