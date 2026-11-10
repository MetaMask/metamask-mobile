import type { PredictVenueId } from '../../../../types';
import { getFeedScreen, type FeedScreenId } from '../../../feedScreens';
import { PredictNextRoutes } from '../../../routes';
import { readPredictEventRef } from '../../eventRef';
import type { PredictIntent } from '../../intents';
import {
  ready,
  unavailable,
  type PredictIntentResolution,
} from '../../targets';

/**
 * The PredictNext branch: PredictNext routes, each carrying the Active
 * Venue. Feeds open Home, where the Venue's own sections are; a Venue's
 * Feed Screens are not named by legacy feed categories. Funding has no
 * PredictNext implementation yet, so it is unsupported and its entry hides.
 */
export const resolveNextIntent = (
  intent: PredictIntent,
  venueId: PredictVenueId,
): PredictIntentResolution => {
  switch (intent.type) {
    // A V1 link's list parameters (`linkList`) name Polymarket feeds and
    // tabs, which a PredictNext Venue does not have, so they open Home too.
    case 'home':
    case 'feed':
    case 'linkList':
      return ready({
        kind: 'predict',
        params: { screen: PredictNextRoutes.HOME },
      });
    case 'event': {
      const eventRef = readPredictEventRef(intent.eventRef);
      if (eventRef.implementation !== 'next' || eventRef.venue !== venueId) {
        return unavailable('venueMismatch');
      }
      return ready({
        kind: 'predict',
        params: {
          screen: PredictNextRoutes.EVENT,
          params: {
            venueId,
            eventId: eventRef.eventId,
            titleSnapshot: intent.titleSnapshot ?? '',
          },
        },
      });
    }
    case 'portfolio':
      return ready({
        kind: 'predict',
        params: {
          screen: PredictNextRoutes.PORTFOLIO,
          params: intent.tab
            ? { venueId, initialTab: intent.tab }
            : { venueId },
        },
      });
    case 'feedScreen':
      if (!getFeedScreen(intent.feedScreenId)) {
        return unavailable('notFound');
      }
      return ready({
        kind: 'predict',
        params: {
          screen: PredictNextRoutes.FEED,
          params: {
            venueId,
            feedScreenId: intent.feedScreenId as FeedScreenId,
            ...(intent.tabId ? { selectedTabId: intent.tabId } : {}),
          },
        },
      });
    case 'addFunds':
      return unavailable('unsupported');
  }
};
