import React from 'react';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import type { PredictEvent, PredictMarket, PredictOutcome } from '../../types';
import { EVENT_CARD_VISIBLE_MARKET_COUNT, EventCard } from './EventCard';

interface EventCardContentProps {
  event: PredictEvent;
  onPress: () => void;
  onOrder?: (
    event: PredictEvent,
    market: PredictMarket,
    outcome: PredictOutcome,
  ) => void;
}

const getOutcome = (market: PredictMarket, side: 'yes' | 'no') =>
  market.outcomes.find((outcome) => outcome.side === side) as PredictOutcome;

export const EventCardStandard = ({
  event,
  onPress,
  onOrder,
}: EventCardContentProps) => {
  const isSingleMarket = event.markets.length === 1;
  const visibleMarkets = event.markets.slice(
    0,
    EVENT_CARD_VISIBLE_MARKET_COUNT,
  );

  return (
    <EventCard.Root testID={`predict-next-event-${event.venueId}-${event.id}`}>
      <EventCard.Pressable
        onPress={onPress}
        testID={`predict-next-event-content-${event.venueId}-${event.id}`}
      >
        <EventCard.Header event={event} />
      </EventCard.Pressable>

      {isSingleMarket ? (
        <Box twClassName="flex-row gap-2">
          {(['yes', 'no'] as const).map((side) => (
            <EventCard.Outcome
              key={side}
              event={event}
              market={event.markets[0]}
              outcome={getOutcome(event.markets[0], side)}
              onOrder={onOrder}
              testID={`predict-next-outcome-${event.id}-${side}`}
            />
          ))}
        </Box>
      ) : (
        <Box twClassName="gap-2">
          {visibleMarkets.map((market) => (
            <Box
              key={market.id}
              twClassName="flex-row items-center justify-between gap-2"
            >
              <Text variant={TextVariant.BodyMd} twClassName="flex-1">
                {market.question}
              </Text>
              <EventCard.Outcome
                event={event}
                market={market}
                outcome={getOutcome(market, 'yes')}
                label="Yes"
                onOrder={onOrder}
                testID={`predict-next-outcome-${event.id}-${market.id}-yes`}
              />
            </Box>
          ))}
        </Box>
      )}

      <EventCard.Footer event={event} onPress={onPress} />
    </EventCard.Root>
  );
};
