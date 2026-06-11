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
import React, { memo, useEffect, useState } from 'react';
import { strings } from '../../../../../../../locales/i18n';
import type { GameFlashMarketEvent } from '../../../services/gameEvents';
import { PREDICT_GAME_LIVE_TEST_IDS } from '../PredictGameLive.testIds';

interface PredictFlashMarketCardProps {
  event: GameFlashMarketEvent;
}

const secondsUntil = (closesAt: number): number =>
  Math.max(0, Math.ceil((closesAt - Date.now()) / 1000));

/**
 * Short-lived "flash" micro-market card woven into the live feed, with a
 * ticking countdown. Simulated for the POC (badged as demo) — options are not
 * tappable and never place real orders.
 */
const PredictFlashMarketCard: React.FC<PredictFlashMarketCardProps> = ({
  event,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    secondsUntil(event.closesAt),
  );

  useEffect(() => {
    setSecondsLeft(secondsUntil(event.closesAt));
    const intervalId = setInterval(() => {
      const remaining = secondsUntil(event.closesAt);
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        clearInterval(intervalId);
      }
    }, 1000);
    return () => clearInterval(intervalId);
  }, [event.closesAt]);

  const isClosed = secondsLeft <= 0;

  return (
    <Box
      twClassName={`mx-4 my-1 p-3 rounded-[12px] border border-muted gap-2 ${
        isClosed ? 'opacity-50' : ''
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
          color={isClosed ? TextColor.TextAlternative : TextColor.ErrorDefault}
        >
          {isClosed
            ? strings('predict.game_live.flash_market_closed')
            : strings('predict.game_live.flash_market_closes_in', {
                seconds: secondsLeft,
              })}
        </Text>
      </Box>

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
  );
};

export default memo(PredictFlashMarketCard);
