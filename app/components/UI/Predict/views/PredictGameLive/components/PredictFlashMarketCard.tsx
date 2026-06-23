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
import React, { memo, useEffect, useRef, useState } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { strings } from '../../../../../../../locales/i18n';
import type { GameFlashMarketEvent } from '../../../services/gameEvents';
import { useFeedItemEntrance } from '../hooks/useFeedItemEntrance';
import { PREDICT_GAME_LIVE_TEST_IDS } from '../PredictGameLive.testIds';

interface PredictFlashMarketCardProps {
  event: GameFlashMarketEvent;
}

const secondsUntil = (closesAt: number): number =>
  Math.max(0, Math.ceil((closesAt - Date.now()) / 1000));

/** Below this many seconds the countdown bar turns urgent. */
const URGENT_SECONDS = 5;

/**
 * Short-lived "flash" micro-market card woven into the live feed, with a
 * ticking countdown and a draining time bar that turns urgent near close.
 * Simulated for the POC (badged as demo) — options are not tappable and never
 * place real orders.
 */
const PredictFlashMarketCard: React.FC<PredictFlashMarketCardProps> = ({
  event,
}) => {
  const tw = useTailwind();
  const [secondsLeft, setSecondsLeft] = useState(() =>
    secondsUntil(event.closesAt),
  );
  // Window length is fixed at first render so the bar drains from full.
  const totalSecondsRef = useRef(Math.max(1, secondsUntil(event.closesAt)));

  const entranceStyle = useFeedItemEntrance(event.id, event.timestamp);

  const progress = useSharedValue(
    secondsUntil(event.closesAt) / totalSecondsRef.current,
  );

  useEffect(() => {
    setSecondsLeft(secondsUntil(event.closesAt));
    const intervalId = setInterval(() => {
      const remaining = secondsUntil(event.closesAt);
      setSecondsLeft(remaining);
      progress.value = withTiming(remaining / totalSecondsRef.current, {
        duration: 1_000,
        easing: Easing.linear,
      });
      if (remaining <= 0) {
        clearInterval(intervalId);
      }
    }, 1_000);
    return () => clearInterval(intervalId);
  }, [event.closesAt, progress]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${Math.max(0, Math.min(1, progress.value)) * 100}%`,
  }));

  const isClosed = secondsLeft <= 0;
  const isUrgent = !isClosed && secondsLeft <= URGENT_SECONDS;

  return (
    <Animated.View style={[entranceStyle, tw.style('mx-4 my-1')]}>
      <Box
        twClassName={`p-3 rounded-[12px] border gap-2 overflow-hidden ${
          isClosed ? 'opacity-50 border-muted' : 'border-default'
        }`}
        testID={PREDICT_GAME_LIVE_TEST_IDS.FLASH_MARKET_CARD}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          justifyContent={BoxJustifyContent.Between}
          alignItems={BoxAlignItems.Center}
        >
          <Text
            variant={TextVariant.BodyXs}
            fontWeight={FontWeight.Bold}
            color={TextColor.TextAlternative}
          >
            {strings('predict.game_live.flash_market_demo_badge')}
          </Text>
          <Text
            variant={TextVariant.BodyXs}
            fontWeight={FontWeight.Bold}
            color={
              isClosed ? TextColor.TextAlternative : TextColor.ErrorDefault
            }
          >
            {isClosed
              ? strings('predict.game_live.flash_market_closed')
              : strings('predict.game_live.flash_market_closes_in', {
                  seconds: secondsLeft,
                })}
          </Text>
        </Box>

        {!isClosed && (
          <Box twClassName="h-1 rounded-full bg-muted overflow-hidden">
            <Animated.View
              style={[
                progressStyle,
                tw.style(
                  `h-full rounded-full ${
                    isUrgent ? 'bg-error-default' : 'bg-primary-default'
                  }`,
                ),
              ]}
            />
          </Box>
        )}

        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Bold}
          color={TextColor.TextDefault}
        >
          {event.question}
        </Text>

        <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-2">
          {event.options.map((option) => (
            <Box
              key={option.id}
              alignItems={BoxAlignItems.Center}
              twClassName="flex-1 py-2 px-1 rounded-[8px] bg-muted gap-0.5"
            >
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextDefault}
                numberOfLines={1}
              >
                {option.label}
              </Text>
              <Text
                variant={TextVariant.BodyXs}
                color={TextColor.TextAlternative}
              >
                {option.impliedPct}%
              </Text>
            </Box>
          ))}
        </Box>
      </Box>
    </Animated.View>
  );
};

export default memo(PredictFlashMarketCard);
