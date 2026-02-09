import React from 'react';
import { PredictMarket as PredictMarketType } from '../../types';
import { PredictEntryPoint } from '../../types/navigation';
import { PredictEventValues } from '../../constants/eventNames';
import { usePredictEntryPoint } from '../../contexts';
import PredictMarketSingle from '../PredictMarketSingle';
import PredictMarketMultiple from '../PredictMarketMultiple';
import PredictMarketSportCard from '../PredictMarketSportCard';

interface PredictMarketProps {
  market: PredictMarketType;
  testID?: string;
  entryPoint?: PredictEntryPoint;
  isCarousel?: boolean;
}

const PredictMarket: React.FC<PredictMarketProps> = ({
  market,
  testID,
  entryPoint: propEntryPoint,
  isCarousel = false,
}) => {
  const contextEntryPoint = usePredictEntryPoint();
  const entryPoint =
    contextEntryPoint ??
    propEntryPoint ??
    PredictEventValues.ENTRY_POINT.PREDICT_FEED;
  if (market.game) {
    return (
      <PredictMarketSportCard
        market={market}
        testID={testID}
        entryPoint={entryPoint}
        isCarousel={isCarousel}
      />
    );
  }

  if (market.outcomes.length === 1) {
    return (
      <PredictMarketSingle
        market={market}
        testID={testID}
        entryPoint={entryPoint}
        isCarousel={isCarousel}
      />
    );
  }

  return (
    <PredictMarketMultiple
      market={market}
      testID={testID}
      entryPoint={entryPoint}
      isCarousel={isCarousel}
    />
  );
};

export default PredictMarket;
