import React, { createContext, useContext } from 'react';
import { useBridgeQuoteData } from './index';
import { useSwapQuotes } from '../useSwapQuotes';
import { useSwapsFeatureId } from '../useSwapsFeatureId';
import { MIGRATED_FEATURE_IDS } from '../../Views/BridgeView/BridgeView.constants';
import { useBridgeSession } from '../useBridgeSession';

type BridgeQuoteDataContextValue = ReturnType<typeof useBridgeQuoteData>;

const BridgeQuoteDataContext =
  createContext<BridgeQuoteDataContextValue | null>(null);

interface BridgeQuoteDataProviderProps {
  children: React.ReactNode;
}

export function BridgeQuoteDataProvider({
  children,
}: BridgeQuoteDataProviderProps) {
  const featureId = useSwapsFeatureId();
  const { latestSourceBalance } = useBridgeSession();
  const value = useBridgeQuoteData({
    latestSourceAtomicBalance: latestSourceBalance?.atomicBalance,
    isActive: !MIGRATED_FEATURE_IDS.includes(featureId),
  });

  return (
    <BridgeQuoteDataContext.Provider value={value}>
      {children}
    </BridgeQuoteDataContext.Provider>
  );
}

/**
 * Hook for getting the bridge quote data context
 * @deprecated Use useSwapQuotes instead. Avoid adding new functionality to this hook.
 * @returns BridgeQuoteDataContextValue
 */
export function useBridgeQuoteDataContext(): BridgeQuoteDataContextValue {
  const combinedSwapQuoteData = useSwapQuotes();
  const quoteDataContext = useContext(BridgeQuoteDataContext);

  // Components shared by the Market, Limit and Recurring tabs use this hook so we need to check both contexts.
  const context = combinedSwapQuoteData ?? quoteDataContext;

  if (!context) {
    throw new Error(
      'useBridgeQuoteDataContext must be used within BridgeQuoteDataProvider and SwapQuotesProvider',
    );
  }

  return context;
}
