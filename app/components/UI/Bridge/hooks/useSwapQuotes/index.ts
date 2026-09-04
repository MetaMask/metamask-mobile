import { useContext } from 'react';

import {
  SwapQuotesContext,
  type SwapQuotesContextValue,
} from './SwapQuotesContext';
import { useSwapFeatureId } from '../useSwapFeatureId';
import { MIGRATED_FEATURE_IDS } from '../../Views/BridgeView/BridgeView.constants';

/**
 * Hook for updating the bridge-controller's quoteRequest state and returning quote data
 */
export const useSwapQuotes = (): SwapQuotesContextValue | null => {
  const context = useContext(SwapQuotesContext);

  const featureId = useSwapFeatureId();
  if (!MIGRATED_FEATURE_IDS.includes(featureId)) {
    return null;
  }

  if (!context) {
    throw new Error('useSwapQuotes must be used within SwapQuotesProvider');
  }

  return context;
};
