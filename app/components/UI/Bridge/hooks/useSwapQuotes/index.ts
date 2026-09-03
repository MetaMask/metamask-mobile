import { useContext } from 'react';

import {
  SwapQuotesContext,
  type SwapQuotesContextValue,
} from './SwapQuotesContext';
import { FeatureId } from '@metamask/bridge-controller';
import { useSwapFeatureId } from '../useSwapFeatureId';

/**
 * Feature IDs that have been migrated to use the SwapQuotesProvider
 * To migrate a feature ID, add it to this list and replace the useBridgeQuoteRequest hook with useSwapQuotes.
 */
const MIGRATED_FEATURE_IDS = [FeatureId.LIMIT_ORDER];

/**
 * Hook for updating the bridge-controller's quoteRequest state and returning quote data
 */
export function useSwapQuotes(): SwapQuotesContextValue | null {
  const context = useContext(SwapQuotesContext);

  const featureId = useSwapFeatureId();
  if (!MIGRATED_FEATURE_IDS.includes(featureId)) {
    return null;
  }

  if (!context) {
    throw new Error('useSwapQuotes must be used within SwapQuotesProvider');
  }

  return context;
}
