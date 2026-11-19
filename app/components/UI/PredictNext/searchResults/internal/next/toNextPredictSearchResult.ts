import {
  createNextPredictEventRef,
  type PredictNextVenue,
} from '../../../navigation/entry';
import type { PredictEvent, PredictMarketStatus } from '../../../types';
import type { PredictSearchResult } from '../../types';

/**
 * Market statuses a user can still browse toward: the ones Predict API search
 * lists an Event for (upcoming, trading or paused). Every other status is
 * terminal.
 */
const OPEN_MARKET_STATUSES: ReadonlySet<PredictMarketStatus> = new Set([
  'initialized',
  'active',
  'inactive',
]);

/**
 * Maps a next Venue's Event to a venue-neutral result, with the values the
 * Polymarket row shows: the title, "Open" while any of its Markets is not
 * terminal or "closed" once all are, and the Event image. The intent names the Event's own
 * Venue, so pressing a result minted before a Venue change resolves
 * `venueMismatch` and opens nothing.
 */
export const toNextPredictSearchResult = (
  event: PredictEvent,
): PredictSearchResult => ({
  id: event.id,
  title: event.title,
  subtitle: event.markets.some(({ status }) => OPEN_MARKET_STATUSES.has(status))
    ? 'Open'
    : 'closed',
  ...(event.imageUrl ? { imageUrl: event.imageUrl } : {}),
  intent: {
    type: 'event',
    eventRef: createNextPredictEventRef(
      event.venueId as string as PredictNextVenue,
      event.id,
    ),
    titleSnapshot: event.title,
    ...(event.imageUrl ? { imageSnapshot: event.imageUrl } : {}),
  },
});
