import React, { createContext, useContext } from 'react';
import { BigNumber as EthersBigNumber } from 'ethers';
import { useBridgeQuoteData } from './index';
import { useSwapQuotes } from '../useSwapQuotes';

type BridgeQuoteDataContextValue = ReturnType<typeof useBridgeQuoteData>;

const BridgeQuoteDataContext =
  createContext<BridgeQuoteDataContextValue | null>(null);

interface BridgeQuoteDataProviderProps {
  children: React.ReactNode;
  latestSourceAtomicBalance?: EthersBigNumber;
}

export function BridgeQuoteDataProvider({
  children,
  latestSourceAtomicBalance,
}: BridgeQuoteDataProviderProps) {
  const value = useBridgeQuoteData({
    latestSourceAtomicBalance,
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
