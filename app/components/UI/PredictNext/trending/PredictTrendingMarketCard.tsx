import React from 'react';
import PredictMarket from '../../Predict/components/PredictMarket';
import { PredictEventValues } from '../analytics';
import { toLegacyMarket, toTrendingMarket } from './internal/legacyMarkets';
import type { PredictTrendingMarket } from './types';

export interface PredictTrendingMarketCardProps {
  market: PredictTrendingMarket;
  /** Called synchronously before the card's navigation press fires. */
  onCardPress?: () => void;
  /** Called when the user taps a buy button, before the bet slip opens. */
  onBuyButtonPress?: (params: { market: PredictTrendingMarket }) => void;
}

/**
 * A full-width market card in an Explore list, attributed to the `explore`
 * entry point. The legacy branch renders the Predict market card unchanged.
 */
export const PredictTrendingMarketCard = ({
  market,
  onCardPress,
  onBuyButtonPress,
}: PredictTrendingMarketCardProps) => (
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
