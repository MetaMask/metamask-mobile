import React, { createContext, useContext } from 'react';
import { BigNumber as EthersBigNumber } from 'ethers';
import { useBridgeQuoteRequest } from './index';

type BridgeQuoteRequestContextValue = ReturnType<typeof useBridgeQuoteRequest>;

const BridgeQuoteRequestContext =
  createContext<BridgeQuoteRequestContextValue | null>(null);

interface BridgeQuoteRequestProviderProps {
  children: React.ReactNode;
  latestSourceAtomicBalance?: EthersBigNumber;
}

export function BridgeQuoteRequestProvider({
  children,
  latestSourceAtomicBalance,
}: BridgeQuoteRequestProviderProps) {
  const updateQuoteParams = useBridgeQuoteRequest({
    latestSourceAtomicBalance,
  });

  return (
    <BridgeQuoteRequestContext.Provider value={updateQuoteParams}>
      {children}
    </BridgeQuoteRequestContext.Provider>
  );
}

export function useBridgeQuoteRequestContext(): BridgeQuoteRequestContextValue {
  const context = useContext(BridgeQuoteRequestContext);

  if (!context) {
    throw new Error(
      'useBridgeQuoteRequestContext must be used within BridgeQuoteRequestProvider',
    );
  }

  return context;
}
