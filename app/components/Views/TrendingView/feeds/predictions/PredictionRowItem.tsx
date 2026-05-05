import React from 'react';
import { Box } from '@metamask/design-system-react-native';
import PredictMarket from '../../../../UI/Predict/components/PredictMarket';
import PredictMarketRowItem from '../../../../UI/Predict/components/PredictMarketRowItem';
import type { PredictMarket as PredictMarketType } from '../../../../UI/Predict/types';

interface PredictionCarouselRowItemProps {
  market: PredictMarketType;
  testIdPrefix?: string;
  /** Called synchronously before the card's navigation press fires. */
  onBeforePress?: () => void;
  /** Called when the user taps a vote button (before betslip opens). */
  onVote?: (marketId: string) => void;
}

/** Carousel-style market card used inside Explore home tabs. */
export const PredictionCarouselRowItem: React.FC<
  PredictionCarouselRowItemProps
> = ({ market, testIdPrefix, onBeforePress, onVote }) => (
  <Box twClassName="py-2">
    <PredictMarket
      market={market}
      isCarousel
      testID={testIdPrefix ? `${testIdPrefix}-${market.id}` : undefined}
      onBeforePress={onBeforePress}
      onVote={onVote}
    />
  </Box>
);

interface PredictionSearchRowItemProps {
  market: PredictMarketType;
}

/** Compact list row used inside the omni-search results. */
export const PredictionSearchRowItem: React.FC<
  PredictionSearchRowItemProps
> = ({ market }) => <PredictMarketRowItem market={market} />;
