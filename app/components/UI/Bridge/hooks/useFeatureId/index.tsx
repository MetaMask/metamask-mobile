import { useContext } from 'react';
import type { FeatureId } from '@metamask/bridge-controller';
import { FeatureIdContext } from '../../providers/SwapsFeatureIdProvider';

export const useSwapsFeatureId = (): FeatureId => {
  const featureId = useContext(FeatureIdContext);

  if (!featureId) {
    throw new Error('useFeatureId must be used within FeatureIdProvider');
  }

  return featureId;
};
