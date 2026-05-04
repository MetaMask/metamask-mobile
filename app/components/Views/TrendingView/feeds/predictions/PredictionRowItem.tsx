import React from 'react';
import { Box } from '@metamask/design-system-react-native';
import PredictMarket from '../../../../UI/Predict/components/PredictMarket';
import PredictMarketRowItem from '../../../../UI/Predict/components/PredictMarketRowItem';
import type { PredictMarket as PredictMarketType } from '../../../../UI/Predict/types';

interface PredictionCarouselRowItemProps {
  market: PredictMarketType;
  testIdPrefix?: string;
}

/** Carousel-style market card used inside Explore home tabs. */
export const PredictionCarouselRowItem: React.FC<
  PredictionCarouselRowItemProps
> = ({ market, testIdPrefix }) => (
  <Box twClassName="py-2">
    <PredictMarket
      market={market}
      isCarousel
      testID={testIdPrefix ? `${testIdPrefix}-${market.id}` : undefined}
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
