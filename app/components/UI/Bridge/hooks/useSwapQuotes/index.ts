import { useContext } from 'react';

import {
  SwapQuotesContext,
  type SwapQuotesContextValue,
} from '../../providers/SwapQuotesProvider';
import { MIGRATED_FEATURE_IDS } from '../../Views/BridgeView/BridgeView.constants';
import { useSwapsFeatureId } from '../useSwapsFeatureId';

/**
 * Hook for updating the bridge-controller's quoteRequest state and returning quote data
 */
export const useSwapQuotes = (): SwapQuotesContextValue | null => {
  const context = useContext(SwapQuotesContext);
  const featureId = useSwapsFeatureId();

  if (!MIGRATED_FEATURE_IDS.includes(featureId)) {
    return null;
  }

  if (!context) {
    return null;
  }

  return context;
};
