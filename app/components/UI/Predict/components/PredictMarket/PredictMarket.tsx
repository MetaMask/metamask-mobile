import React from 'react';
import { PredictMarket as PredictMarketType } from '../../types';
import PredictMarketSingle from '../PredictMarketSingle';
import PredictMarketMultiple from '../PredictMarketMultiple';

interface PredictMarketProps {
  market: PredictMarketType;
  testID?: string;
  isCarousel?: boolean;
}

const PredictMarket: React.FC<PredictMarketProps> = ({
  market,
  testID,
  isCarousel = false,
}) => {
  if (market.outcomes.length === 1) {
    return (
      <PredictMarketSingle
        market={market}
        testID={testID}
        isCarousel={isCarousel}
      />
    );
  }

  return (
    <PredictMarketMultiple
      market={market}
      testID={testID}
      isCarousel={isCarousel}
    />
  );
};

export default PredictMarket;
