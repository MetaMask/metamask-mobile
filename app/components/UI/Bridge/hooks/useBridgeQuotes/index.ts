import { useContext } from 'react';

import {
  BridgeQuotesContext,
  type BridgeQuotesContextValue,
} from './BridgeQuotesContext';

/**
 * Hook for updating the bridge-controller's quoteRequest state and returning quote data
 */
export function useBridgeQuotes(): BridgeQuotesContextValue {
  const context = useContext(BridgeQuotesContext);

  if (!context) {
    throw new Error('useBridgeQuotes must be used within BridgeQuotesProvider');
  }

  return context;
}
