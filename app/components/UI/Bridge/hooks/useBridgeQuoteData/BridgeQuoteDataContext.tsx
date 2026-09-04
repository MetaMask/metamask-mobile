import React, { createContext, useContext } from 'react';
import { useBridgeQuoteData } from './index';
import { useSwapQuotes } from '../useSwapQuotes';
import { useSwapFeatureId } from '../useSwapFeatureId';
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
  const featureId = useSwapFeatureId();
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

export function useBridgeQuoteDataContext(): BridgeQuoteDataContextValue {
  const combinedSwapQuoteData = useSwapQuotes();
  const quoteDataContext = useContext(BridgeQuoteDataContext);

  // Components shared by the Market, Limit and Recurring tabs use this hook so we need to check both contexts.
  const context = combinedSwapQuoteData ?? quoteDataContext;

  if (!context) {
    throw new Error(
      'useBridgeQuoteDataContext must be used within BridgeQuoteDataProvider or SwapQuotesProvider',
    );
  }

  return context;
}
