import React from 'react';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { PredictEvent, PredictMarket, PredictOutcome } from '../../types';
import { EventCard } from './EventCard';

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

export const EventCardContent = ({
  event,
  onPress,
  onOrder,
}: EventCardContentProps) => {
  const isSingleMarket = event.markets.length === 1;
  const visibleMarkets = event.markets.slice(0, 3);
  const hiddenCount = event.markets.length - visibleMarkets.length;

  return (
    <EventCard.Root testID={`predict-next-event-${event.venueId}-${event.id}`}>
      <EventCard.Pressable
        onPress={onPress}
        testID={`predict-next-event-content-${event.venueId}-${event.id}`}
      >
        <EventCard.Title>{event.title}</EventCard.Title>
        {event.subtitle ? (
          <EventCard.Subtitle>{event.subtitle}</EventCard.Subtitle>
        ) : null}
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

      {hiddenCount > 0 ? (
        <Button
          testID={`predict-next-event-more-${event.id}`}
          accessibilityLabel={`+${hiddenCount} more`}
          size={ButtonSize.Sm}
          variant={ButtonVariant.Tertiary}
          onPress={onPress}
        >
          +{hiddenCount} more
        </Button>
      ) : null}
    </EventCard.Root>
  );
};
