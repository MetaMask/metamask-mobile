import { useContext } from 'react';

import { FeatureIdContext } from './FeatureIdContext';
import { FeatureId } from '@metamask/bridge-controller';

/**
 * Hook for tracking the {@link FeatureId} for the current bridge tab
 */
export function useSwapFeatureId(): FeatureId {
  const context = useContext(FeatureIdContext);

  if (!context) {
    throw new Error('useSwapFeatureId must be used within FeatureIdProvider');
  }

  return context;
}
