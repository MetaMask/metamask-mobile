import { useContext } from 'react';
import type { FeatureId } from '@metamask/bridge-controller';
import { SwapsFeatureIdContext } from '../../providers/SwapsFeatureIdProvider';

export const useSwapsFeatureId = (): FeatureId => {
  const featureId = useContext(SwapsFeatureIdContext);

  if (!featureId) {
    throw new Error('useSwapsFeatureId must be used within FeatureIdProvider');
  }

  return featureId;
};
