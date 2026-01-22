import React from 'react';
import PredictMarketSportCard from './PredictMarketSportCard';
import { usePredictMarket } from '../../hooks/usePredictMarket';
import { PredictEntryPoint } from '../../types/navigation';

interface PredictMarketSportCardWrapperProps {
  marketId: string;
  testID?: string;
  entryPoint?: PredictEntryPoint;
  onDismiss?: () => void;
}

const PredictMarketSportCardWrapper: React.FC<
  PredictMarketSportCardWrapperProps
> = ({ marketId, testID, entryPoint, onDismiss }) => {
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
      onDismiss={onDismiss}
    />
  );
};

export default PredictMarketSportCardWrapper;
