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
  const hiddenMarketCount = Math.max(
    0,
    event.markets.length - EVENT_CARD_VISIBLE_MARKET_COUNT,
  );
  const hasFooter = Boolean(
    event.category || event.volume || hiddenMarketCount,
  );

  return (
    <EventCard.Root testID={`predict-next-event-${event.venueId}-${event.id}`}>
      <EventCard.Pressable
        onPress={onPress}
        testID={`predict-next-event-content-${event.venueId}-${event.id}`}
      >
        <EventCard.Header>
          {event.imageUrl ? (
            <EventCard.Image
              source={event.imageUrl}
              testID={`predict-next-event-image-${event.id}`}
            />
          ) : null}
          <EventCard.Title>{event.title}</EventCard.Title>
        </EventCard.Header>
      </EventCard.Pressable>

      <EventCard.Body twClassName="gap-3">
        {isSingleMarket
          ? (['yes', 'no'] as const).map((side) => (
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
            ))
          : visibleMarkets.map((market, index) => (
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
      </EventCard.Body>

      {hasFooter ? (
        <EventCard.Footer
          testID={`predict-next-event-footer-${event.venueId}-${event.id}`}
        >
          <EventCard.FooterLeading>
            {event.category ? (
              <EventCard.MetadataTag
                testID={`predict-next-event-category-${event.id}`}
              >
                {event.category}
              </EventCard.MetadataTag>
            ) : null}
            <EventCard.Volume
              value={event.volume}
              testID={`predict-next-event-volume-${event.id}`}
            />
          </EventCard.FooterLeading>
          <EventCard.MoreMarkets
            count={hiddenMarketCount}
            onPress={onPress}
            testID={`predict-next-event-more-${event.id}`}
          />
        </EventCard.Footer>
      ) : null}
    </EventCard.Root>
  );
};
