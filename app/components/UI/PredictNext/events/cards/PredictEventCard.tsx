import React from 'react';
import type { PredictEvent, PredictMarket, PredictOutcome } from '../../types';
import { getEventGame } from '../game';
import { EventCardGame } from './EventCardGame';
import { EventCardStandard } from './EventCardStandard';
import type { EventCardVariant } from './internal/EventCard';

export interface PredictEventCardProps {
  event: PredictEvent;
  /**
   * The presentation, the same for both card families. A game Event has
   * 'compact' (the default), 'featured' and 'small'. A non-game Event has
   * only 'featured'; any other value renders its default card.
   */
  variant?: EventCardVariant;
  onPress: () => void;
  onOrder?: (
    event: PredictEvent,
    market: PredictMarket,
    outcome: PredictOutcome,
  ) => void;
}

/**
 * An Event card for a feed surface: the game card for an Event with a Game,
 * the standard card otherwise. Whether the Event shows as live is derived
 * inside the cards, never passed in.
 */
export const PredictEventCard = ({
  event,
  variant,
  onPress,
  onOrder,
}: PredictEventCardProps) =>
  getEventGame(event) ? (
    <EventCardGame
      event={event}
      variant={variant}
      onPress={onPress}
      onOrder={onOrder}
    />
  ) : (
    <EventCardStandard
      event={event}
      variant={variant}
      onPress={onPress}
      onOrder={onOrder}
    />
  );
