import type { PredictEntityId, PredictEvent } from '../../types';

/** Sport IDs whose Events render the Game card when a Game snapshot is present. */
export const GAME_EVENT_CARD_SPORT_ID = 'american-football' as PredictEntityId;

export type EventCardKind = 'game' | 'standard';

/**
 * Chooses the Event card composition for a list surface.
 * Game cards require both a supported Sport and a Game snapshot.
 */
export const resolveEventCardKind = (event: PredictEvent): EventCardKind =>
  event.sports?.sport.id === GAME_EVENT_CARD_SPORT_ID && event.sports.game
    ? 'game'
    : 'standard';
