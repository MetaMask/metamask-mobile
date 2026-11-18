import type { PredictEvent } from '../../../types';
import { getEventGame } from '../../game';

/**
 * Whether an Event card shows its Event as live. A game Event is live while
 * its Game is in progress. A non-game Event has no live signal yet, so it is
 * never live: the rule for when one is live is still open in PRED-1483.
 */
export const isEventLive = (event: PredictEvent): boolean =>
  getEventGame(event)?.status === 'in_progress';
