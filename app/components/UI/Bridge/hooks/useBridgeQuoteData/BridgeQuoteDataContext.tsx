import React, { createContext, useContext } from 'react';
import { BigNumber as EthersBigNumber } from 'ethers';
import { useBridgeQuoteData } from './index';

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
  const context = useContext(BridgeQuoteDataContext);

  if (!context) {
    throw new Error(
      'useBridgeQuoteDataContext must be used within BridgeQuoteDataProvider',
    );
  }

  return context;
}
