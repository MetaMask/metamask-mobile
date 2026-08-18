import React from 'react';
import { Box } from '@metamask/design-system-react-native';
import type { PredictEvent, PredictMarket, PredictOutcome } from '../../types';
import {
  BINARY_OUTCOME_ROW_COLORS,
  EVENT_CARD_VISIBLE_MARKET_COUNT,
  EventCard,
  MULTI_OUTCOME_ROW_COLORS,
} from './EventCard';

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
        <Box twClassName="gap-3">
          {(['yes', 'no'] as const).map((side) => (
            <EventCard.OutcomeRow
              key={side}
              event={event}
              market={event.markets[0]}
              outcome={getOutcome(event.markets[0], side)}
              label={side === 'yes' ? 'Yes' : 'No'}
              color={BINARY_OUTCOME_ROW_COLORS[side]}
              onOrder={onOrder}
              testID={`predict-next-outcome-${event.id}-${side}`}
            />
          ))}
        </Box>
      ) : (
        <Box twClassName="gap-3">
          {visibleMarkets.map((market, index) => (
            <EventCard.OutcomeRow
              key={market.id}
              event={event}
              market={market}
              outcome={getOutcome(market, 'yes')}
              color={MULTI_OUTCOME_ROW_COLORS[index]}
              onOrder={onOrder}
              testID={`predict-next-outcome-${event.id}-${market.id}-yes`}
            />
          ))}
        </Box>
      )}

      <EventCard.Footer event={event} onPress={onPress} />
    </EventCard.Root>
  );
};
