import React from 'react';
import { useSelector } from 'react-redux';
import { selectPredictEnabledFlag } from '../../selectors/featureFlags';
import { PredictProvider } from './PredictProvider';
import { PredictProviderProps } from './PredictProvider.types';

export const PredictProviderGated: React.FC<PredictProviderProps> = ({
  children,
}) => {
  const isPredictEnabled = useSelector(selectPredictEnabledFlag);

  if (!isPredictEnabled) {
    return <>{children}</>;
  }

  return <PredictProvider>{children}</PredictProvider>;
};
