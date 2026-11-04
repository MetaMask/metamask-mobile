import type { PredictEvent } from '../../types';
import type { GameSelection } from './createGamePresentation';

const KALSHI_VENUE_ID = 'kalshi';
const FOOTBALL_SPORT_ID = 'american-football';

/** NFL and college football Games. */
export const isFootballEvent = (event: PredictEvent): boolean =>
  event.sports?.sport.id === FOOTBALL_SPORT_ID;

/**
 * Kalshi sends football logos as helmets that all face right, so the home
 * helmet is mirrored to face its opponent. Other logos are shown as sent.
 */
export const isMirroredTeamLogo = (
  event: PredictEvent,
  selection: GameSelection,
): boolean =>
  selection === 'home' &&
  event.venueId === KALSHI_VENUE_ID &&
  isFootballEvent(event);
