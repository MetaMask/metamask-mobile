import React from 'react';
import { PredictMarket as PredictMarketType } from '../../types';
import PredictMarketSingle from '../PredictMarketSingle';
import PredictMarketMultiple from '../PredictMarketMultiple';

interface PredictMarketProps {
  market: PredictMarketType;
}

const PredictMarket: React.FC<PredictMarketProps> = ({ market }) => {
  if (market.outcomes.length === 1) {
    return <PredictMarketSingle market={market} />;
  }

  return <PredictMarketMultiple market={market} />;
};

export default PredictMarket;
