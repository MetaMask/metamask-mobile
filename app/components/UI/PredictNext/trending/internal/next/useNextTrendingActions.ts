import { useCallback } from 'react';
import { usePredictImplementation } from '../../../implementation';
import {
  createNextPredictEventRef,
  usePredictEntryActions,
  type PredictEntryPoint,
  type PredictIntent,
} from '../../../navigation/entry';
import type { PredictNextVenue } from '../../../navigation/entry/eventRef';
import type {
  PredictEvent,
  PredictMarket,
  PredictOutcome,
} from '../../../types';
import { usePredictOrderFlow } from '../../../views/PredictOrderFlow';

/**
 * Opens an Event from an Explore card or row through the `event` intent.
 * The reference carries the Event's own Venue, so a market minted before a
 * Venue change resolves `venueMismatch` and opens nothing. `beforeOpen`
 * (analytics) runs synchronously before navigating, and only when the
 * intent will open.
 *
 * @returns Whether it navigated.
 */
export const useOpenNextTrendingEvent = (entryPoint: PredictEntryPoint) => {
  const { openPredict, canOpenPredict } = usePredictEntryActions();

  return useCallback(
    (event: PredictEvent, beforeOpen?: () => void): boolean => {
      const intent: PredictIntent = {
        type: 'event',
        // The resolver compares this against the Active Venue, which is how
        // a stale Event of another Venue is refused.
        eventRef: createNextPredictEventRef(
          event.venueId as string as PredictNextVenue,
          event.id,
        ),
        entryPoint,
        titleSnapshot: event.title,
        imageSnapshot: event.imageUrl,
      };
      if (!canOpenPredict(intent)) {
        return false;
      }
      beforeOpen?.();
      return openPredict(intent);
    },
    [canOpenPredict, entryPoint, openPredict],
  );
};

/**
 * Opens the PredictNext Order Flow for a card's buy button. Refused unless
 * the Event's Venue is still the Active Venue, so a stale card can never
 * start an Order against the new one. `beforeOpen` (analytics) runs only
 * when the flow opens. Needs a `PredictOrderFlowProvider`.
 *
 * @returns Whether the Order Flow opened.
 */
export const useOrderNextTrendingOutcome = () => {
  const { openOrderFlow } = usePredictOrderFlow();
  const implementation = usePredictImplementation();
  const activeNextVenueId =
    implementation.status === 'ready' &&
    implementation.implementation === 'next'
      ? implementation.venueId
      : undefined;

  return useCallback(
    (
      event: PredictEvent,
      market: PredictMarket,
      outcome: PredictOutcome,
      beforeOpen?: () => void,
    ): boolean => {
      if (event.venueId !== activeNextVenueId) {
        return false;
      }
      beforeOpen?.();
      openOrderFlow({
        action: 'buy',
        eventId: event.id,
        venueId: event.venueId,
        marketId: market.id,
        side: outcome.side,
        outcomeLabel: outcome.label,
        eventTitle: event.title,
        eventImageUrl: event.imageUrl,
        askPrice: outcome.askPrice,
      });
      return true;
    },
    [activeNextVenueId, openOrderFlow],
  );
};
