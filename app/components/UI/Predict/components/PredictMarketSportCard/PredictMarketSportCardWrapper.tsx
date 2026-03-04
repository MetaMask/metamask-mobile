import React, { useEffect, useRef } from 'react';
import PredictMarketSportCard from './PredictMarketSportCard';
import Logger from '../../../../../util/Logger';
import { PREDICT_CONSTANTS } from '../../constants/errors';
import { ensureError } from '../../utils/predictErrorHandler';
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
  const {
    data: market,
    isLoading,
    error,
  } = usePredictMarket({
    id: marketId,
    enabled: Boolean(marketId),
  });
  const hasCalledOnLoad = useRef(false);

  useEffect(() => {
    if (!error) return;

    Logger.error(ensureError(error), {
      tags: {
        feature: PREDICT_CONSTANTS.FEATURE_NAME,
        component: 'PredictMarketSportCardWrapper',
      },
      context: {
        name: 'PredictMarketSportCardWrapper',
        data: {
          method: 'queryFn',
          action: 'market_load',
          operation: 'data_fetching',
          marketId,
        },
      },
    });
  }, [error, marketId]);

  useEffect(() => {
    if (!isLoading && !error && market && onLoad && !hasCalledOnLoad.current) {
      hasCalledOnLoad.current = true;
      onLoad();
    }
  }, [isLoading, error, market, onLoad]);

  if (isLoading || error || !market) {
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
