import React, { useCallback, useMemo } from 'react';
import { Box } from '@metamask/design-system-react-native';
import { PredictEventValues } from '../../../analytics';
import { PredictEventCard } from '../../../events/cards';
import { useEventsWithLiveData } from '../../../hooks/useEventsWithLiveData';
import type {
  PredictEvent,
  PredictMarket,
  PredictOutcome,
} from '../../../types';
import {
  useOpenNextTrendingEvent,
  useOrderNextTrendingOutcome,
} from './useNextTrendingActions';

export interface NextTrendingEventCardProps {
  event: PredictEvent;
  /** Hold live price and score watches; false keeps the last read values. */
  isLive: boolean;
  /** Fills the carousel cell, like the Polymarket carousel card. */
  isCarousel?: boolean;
  testID?: string;
  /** Called before the card opens the Event. */
  onCardPress?: () => void;
  /** Called when a buy button opens the Order Flow. */
  onBuyButtonPress?: () => void;
}

/**
 * A next Venue's Event as an Explore card: the PredictNext Event card with
 * live data, attributed to the `explore` entry point. A card press opens the
 * Event through the `event` intent; a buy press opens the Order Flow. Each
 * press tracks its analytics first, like the Polymarket card, and both are
 * refused, with no analytics, once the Event's Venue is no longer the
 * Active Venue.
 */
export const NextTrendingEventCard = ({
  event,
  isLive,
  isCarousel = false,
  testID,
  onCardPress,
  onBuyButtonPress,
}: NextTrendingEventCardProps) => {
  const events = useMemo(() => [event], [event]);
  const [liveEvent] = useEventsWithLiveData(event.venueId, events, {
    isVisible: isLive,
    marketScope: 'card',
  });
  const openEvent = useOpenNextTrendingEvent(
    PredictEventValues.ENTRY_POINT.EXPLORE,
  );
  const orderOutcome = useOrderNextTrendingOutcome();

  const handlePress = useCallback(() => {
    openEvent(liveEvent, onCardPress);
  }, [liveEvent, onCardPress, openEvent]);

  const handleOrder = useCallback(
    (
      cardEvent: PredictEvent,
      market: PredictMarket,
      outcome: PredictOutcome,
    ) => {
      orderOutcome(cardEvent, market, outcome, onBuyButtonPress);
    },
    [onBuyButtonPress, orderOutcome],
  );

  return (
    <Box testID={testID} twClassName={isCarousel ? 'h-full' : undefined}>
      <PredictEventCard
        event={liveEvent}
        variant="featured"
        onPress={handlePress}
        onOrder={handleOrder}
      />
    </Box>
  );
};
