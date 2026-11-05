import React, { useCallback } from 'react';
import PredictMarket from '../../Predict/components/PredictMarket';
import { PredictEventValues } from '../analytics';
import { PredictOrderFlowProvider } from '../views/PredictOrderFlow';
import { toLegacyMarket, toTrendingMarket } from './internal/legacyMarkets';
import { NextTrendingEventCard } from './internal/next/NextTrendingEventCard';
import { useTrendingLiveDataAllowed } from './internal/next/useTrendingLiveDataAllowed';
import { readNextTrendingEvent } from './internal/nextMarkets';
import type { PredictTrendingMarket } from './types';
import type { PredictEvent } from '../types';

export interface PredictTrendingMarketCardProps {
  market: PredictTrendingMarket;
  /** Called synchronously before the card's navigation press fires. */
  onCardPress?: () => void;
  /** Called when the user taps a buy button, before the bet slip opens. */
  onBuyButtonPress?: (params: { market: PredictTrendingMarket }) => void;
}

const NextMarketCard = ({
  market,
  event,
  onCardPress,
  onBuyButtonPress,
}: PredictTrendingMarketCardProps & { event: PredictEvent }) => {
  const isLive = useTrendingLiveDataAllowed();
  const handleBuyButtonPress = useCallback(
    () => onBuyButtonPress?.({ market }),
    [market, onBuyButtonPress],
  );

  return (
    <PredictOrderFlowProvider>
      <NextTrendingEventCard
        event={event}
        isLive={isLive}
        onCardPress={onCardPress}
        onBuyButtonPress={handleBuyButtonPress}
      />
    </PredictOrderFlowProvider>
  );
};

/**
 * A full-width market card in an Explore list, attributed to the `explore`
 * entry point. A legacy market renders the Predict market card unchanged; a
 * next Venue's market renders the PredictNext Event card, which opens the
 * Event through an intent and buys through the PredictNext Order Flow.
 */
export const PredictTrendingMarketCard = ({
  market,
  onCardPress,
  onBuyButtonPress,
}: PredictTrendingMarketCardProps) => {
  const event = readNextTrendingEvent(market);
  if (event) {
    return (
      <NextMarketCard
        market={market}
        event={event}
        onCardPress={onCardPress}
        onBuyButtonPress={onBuyButtonPress}
      />
    );
  }

  return (
    <PredictMarket
      market={toLegacyMarket(market)}
      entryPoint={PredictEventValues.ENTRY_POINT.EXPLORE}
      onCardPress={onCardPress}
      onBuyButtonPress={
        onBuyButtonPress
          ? (params) =>
              onBuyButtonPress({ market: toTrendingMarket(params.market) })
          : undefined
      }
    />
  );
};
