import React, { useEffect, useRef } from 'react';
import PredictMarketSportCard from './PredictMarketSportCard';
import { usePredictMarket } from '../../hooks/usePredictMarket';
import { PredictEntryPoint } from '../../types/navigation';
import { Box } from '@metamask/design-system-react-native';

interface PredictMarketSportCardWrapperProps {
  marketId: string;
  testID?: string;
  entryPoint?: PredictEntryPoint;
  onDismiss?: () => void;
  onLoad?: () => void;
}

const PredictMarketSportCardWrapper: React.FC<
  PredictMarketSportCardWrapperProps
> = ({ marketId, testID, entryPoint, onDismiss, onLoad }) => {
  const { market, isFetching, error } = usePredictMarket({
    id: marketId,
    enabled: Boolean(marketId),
  });
  const hasCalledOnLoad = useRef(false);

  useEffect(() => {
    if (!isFetching && !error && market && onLoad && !hasCalledOnLoad.current) {
      hasCalledOnLoad.current = true;
      onLoad();
    }
  }, [isFetching, error, market, onLoad]);

  if (isFetching || error || !market) {
    return null;
  }

  return (
    <Box twClassName="mx-4">
      <PredictMarketSportCard
        market={market}
        testID={testID}
        entryPoint={entryPoint}
        onDismiss={onDismiss}
      />
    </Box>
  );
};

export default PredictMarketSportCardWrapper;
