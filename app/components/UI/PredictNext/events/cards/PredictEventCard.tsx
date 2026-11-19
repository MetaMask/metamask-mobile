import React from 'react';
import type { PredictEvent, PredictMarket, PredictOutcome } from '../../types';
import { getEventGame } from '../game';
import { EventCardGame, type EventCardGameVariant } from './EventCardGame';
import {
  EventCardStandard,
  type EventCardStandardVariant,
} from './EventCardStandard';

/**
 * The card's presentation. 'compact', 'featured' and 'small' style game
 * Events only. 'trending' is the Trending carousel card for both kinds of
 * Event. The two tables below say what each value renders.
 */
export type PredictEventCardVariant = EventCardGameVariant | 'trending';

/** The game card each variant renders. */
const GAME_VARIANT: Record<PredictEventCardVariant, EventCardGameVariant> = {
  compact: 'compact',
  small: 'small',
  featured: 'featured',
  trending: 'featured',
};

/** The standard card each variant renders for a non-game Event. */
const STANDARD_VARIANT: Record<
  PredictEventCardVariant,
  EventCardStandardVariant
> = {
  compact: 'default',
  small: 'default',
  featured: 'default',
  trending: 'trending',
};

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
  variant = 'compact',
  onPress,
  onOrder,
}: PredictEventCardProps) =>
  getEventGame(event) ? (
    <EventCardGame
      event={event}
      variant={GAME_VARIANT[variant]}
      onPress={onPress}
      onOrder={onOrder}
    />
  ) : (
    <EventCardStandard
      event={event}
      variant={STANDARD_VARIANT[variant]}
      onPress={onPress}
      onOrder={onOrder}
    />
  );
