import { useContext } from 'react';

import {
  SwapQuotesContext,
  type SwapQuotesContextValue,
} from './SwapQuotesContext';

/**
 * Hook for updating the bridge-controller's quoteRequest state and returning quote data
 */
export function useSwapQuotes(): SwapQuotesContextValue {
  const context = useContext(SwapQuotesContext);

  if (!context) {
    throw new Error('useSwapQuotes must be used within SwapQuotesProvider');
  }

  return context;
}
