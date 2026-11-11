import React from 'react';
import type { PredictEvent, PredictMarket, PredictOutcome } from '../../types';
import { getEventGame } from '../game';
import { EventCardGame, type EventCardGameVariant } from './EventCardGame';
import { EventCardStandard } from './EventCardStandard';

/**
 * The card's presentation. 'compact', 'featured' and 'small' style game
 * Events only; a non-game Event renders its default feed card for them.
 * 'trending' is the Trending carousel card for both: the featured game card
 * for a game Event, and the Category header, LIVE marker and two compact rows
 * for a non-game Event.
 */
export type PredictEventCardVariant = EventCardGameVariant | 'trending';

export interface PredictEventCardProps {
  event: PredictEvent;
  /** Defaults to 'compact'. */
  variant?: PredictEventCardVariant;
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
      variant={variant === 'trending' ? 'featured' : variant}
      onPress={onPress}
      onOrder={onOrder}
    />
  ) : (
    <EventCardStandard
      event={event}
      variant={variant === 'trending' ? 'trending' : 'default'}
      onPress={onPress}
      onOrder={onOrder}
    />
  );
