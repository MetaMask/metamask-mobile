import React from 'react';
import PredictMarket from '../../../../UI/Predict/components/PredictMarket';
import PredictMarketRowItem from '../../../../UI/Predict/components/PredictMarketRowItem';
import type { PredictMarket as PredictMarketType } from '../../../../UI/Predict/types';

interface PredictionCarouselRowItemProps {
  market: PredictMarketType;
  testIdPrefix?: string;
  /** Called synchronously before the card's navigation press fires. */
  onCardPress?: () => void;
  /** Called when the user taps a buy button (before betslip opens). */
  onBuyButtonPress?: (marketId: string) => void;
}

/** Carousel-style market card used inside Explore home tabs. */
export const PredictionCarouselRowItem: React.FC<
  PredictionCarouselRowItemProps
> = ({ market, testIdPrefix, onCardPress, onBuyButtonPress }) => (
  <PredictMarket
    market={market}
    isCarousel
    testID={testIdPrefix ? `${testIdPrefix}-${market.id}` : undefined}
    onCardPress={onCardPress}
    onBuyButtonPress={onBuyButtonPress}
  />
);

interface PredictionSearchRowItemProps {
  market: PredictMarketType;
}

/** Compact list row used inside the omni-search results. */
export const PredictionSearchRowItem: React.FC<
  PredictionSearchRowItemProps
> = ({ market }) => <PredictMarketRowItem market={market} />;
