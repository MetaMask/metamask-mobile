import {
  createNextPredictEventRef,
  type PredictNextVenue,
} from '../../../navigation/entry';
import type { PredictEvent } from '../../../types';
import type { PredictSearchResult } from '../../types';

/**
 * Maps a next Venue's Event to a venue-neutral result, with the values the
 * Polymarket row shows: the title, "Open" while any of its Markets trades or
 * "closed" otherwise, and the Event image. The intent names the Event's own
 * Venue, so pressing a result minted before a Venue change resolves
 * `venueMismatch` and opens nothing.
 */
export const toNextPredictSearchResult = (
  event: PredictEvent,
): PredictSearchResult => ({
  id: event.id,
  title: event.title,
  subtitle: event.markets.some(({ status }) => status === 'active')
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
