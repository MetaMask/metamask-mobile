import React from 'react';
import PredictMarketSportCard from './PredictMarketSportCard';
import { usePredictMarket } from '../../hooks/usePredictMarket';
import { PredictEntryPoint } from '../../types/navigation';

interface PredictMarketSportCardWrapperProps {
  marketId: string;
  testID?: string;
  entryPoint?: PredictEntryPoint;
}

const PredictMarketSportCardWrapper: React.FC<
  PredictMarketSportCardWrapperProps
> = ({ marketId, testID, entryPoint }) => {
  const { market, isFetching, error } = usePredictMarket({
    id: marketId,
    enabled: Boolean(marketId),
  });

  if (isFetching || error || !market) {
    return null;
  }

  return (
    <PredictMarketSportCard
      market={market}
      testID={testID}
      entryPoint={entryPoint}
    />
  );
};

export default PredictMarketSportCardWrapper;
