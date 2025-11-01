import React from 'react';
import { PredictMarket as PredictMarketType } from '../../types';
import { PredictEntryPoint } from '../../types/navigation';
import { PredictEventValues } from '../../constants/eventNames';
import PredictMarketSingle from '../PredictMarketSingle';
import PredictMarketMultiple from '../PredictMarketMultiple';

interface PredictMarketProps {
  market: PredictMarketType;
  testID?: string;
  entryPoint?: PredictEntryPoint;
}

const PredictMarket: React.FC<PredictMarketProps> = ({
  market,
  testID,
  entryPoint = PredictEventValues.ENTRY_POINT.PREDICT_FEED,
}) => {
  if (market.outcomes.length === 1) {
    return (
      <PredictMarketSingle
        market={market}
        testID={testID}
        entryPoint={entryPoint}
      />
    );
  }

  return (
    <PredictMarketMultiple
      market={market}
      testID={testID}
      entryPoint={entryPoint}
    />
  );
};

export default PredictMarket;
