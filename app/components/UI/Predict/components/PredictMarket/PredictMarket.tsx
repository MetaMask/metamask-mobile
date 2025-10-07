import React from 'react';
import { PredictMarket as PredictMarketType } from '../../types';
import PredictMarketSingle from '../PredictMarketSingle';
import PredictMarketMultiple from '../PredictMarketMultiple';

interface PredictMarketProps {
  market: PredictMarketType;
  testID?: string;
}

const PredictMarket: React.FC<PredictMarketProps> = ({ market, testID }) => {
  if (market.outcomes.length === 1) {
    return <PredictMarketSingle market={market} testID={testID} />;
  }

  return <PredictMarketMultiple market={market} testID={testID} />;
};

export default PredictMarket;
