import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import type { PredictEvent, PredictMarket, PredictOutcome } from '../../types';
import {
  EVENT_CARD_VISIBLE_MARKET_COUNT,
  EventCard,
} from './internal/EventCard';
import { formatEventCardSubtitle } from './internal/formatEventCardSubtitle';

export interface EventCardStandardProps {
  event: PredictEvent;
  onPress: () => void;
  onOrder?: (
    event: PredictEvent,
    market: PredictMarket,
    outcome: PredictOutcome,
  ) => void;
}

const SIDE_LABEL_IDS: Record<PredictOutcome['side'], string> = {
  yes: 'predict_next.portfolio.outcome_side.yes',
  no: 'predict_next.portfolio.outcome_side.no',
};

const getOutcome = (market: PredictMarket, side: 'yes' | 'no') =>
  market.outcomes.find((outcome) => outcome.side === side) as PredictOutcome;

/**
 * A non-game Event on the feed: its title and a close date and volume line,
 * then a Yes and a No row for a binary Event, or the Yes row of up to three
 * Markets otherwise. Rows reuse the Event image as their avatar because the
 * read model has no per-Market image.
 */
export const EventCardStandard = ({
  event,
  onPress,
  onOrder,
}: EventCardStandardProps) => {
  const isSingleMarket = event.markets.length === 1;
  const subtitle = formatEventCardSubtitle(event);

  return (
    <EventCard.Root testID={`predict-next-event-${event.venueId}-${event.id}`}>
      <EventCard.Pressable
        onPress={onPress}
        testID={`predict-next-event-content-${event.venueId}-${event.id}`}
      >
        <EventCard.Header twClassName="gap-1">
          <EventCard.Title twClassName="w-full">{event.title}</EventCard.Title>
          {subtitle ? (
            <EventCard.Subtitle
              testID={`predict-next-event-subtitle-${event.id}`}
            >
              {subtitle}
            </EventCard.Subtitle>
          ) : null}
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
                label={strings(SIDE_LABEL_IDS[side])}
                imageUrl={event.imageUrl}
                onOrder={onOrder}
                testID={`predict-next-outcome-${event.id}-${side}`}
              />
            ))
          : event.markets
              .slice(0, EVENT_CARD_VISIBLE_MARKET_COUNT)
              .map((market) => (
                <EventCard.OutcomeRow
                  key={market.id}
                  event={event}
                  market={market}
                  outcome={getOutcome(market, 'yes')}
                  imageUrl={event.imageUrl}
                  onOrder={onOrder}
                  testID={`predict-next-outcome-${event.id}-${market.id}-yes`}
                />
              ))}
      </EventCard.Body>
    </EventCard.Root>
  );
};
