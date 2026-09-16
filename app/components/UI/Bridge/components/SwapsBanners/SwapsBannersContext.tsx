import React, { createContext, useContext, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { MetaMetricsSwapsEventSource } from '@metamask/bridge-controller';
import {
  selectDestToken,
  selectSourceAmount,
  selectSourceToken,
} from '../../../../../core/redux/slices/bridge';
import { selectSourceWalletAddress } from '../../../../../selectors/bridge';
import type {
  SwapsBannersContextValue,
  SwapsBannersProviderProps,
} from './SwapsBanners.types';

const SwapsBannersContext = createContext<SwapsBannersContextValue | null>(
  null,
);

export function SwapsBannersProvider({
  children,
  latestSourceAtomicBalance,
  location = MetaMetricsSwapsEventSource.MainView,
  onAdjustSourceAmount,
}: SwapsBannersProviderProps) {
  const sourceAmount = useSelector(selectSourceAmount);
  const sourceToken = useSelector(selectSourceToken);
  const destToken = useSelector(selectDestToken);
  const walletAddress = useSelector(selectSourceWalletAddress);

  const value = useMemo(
    () => ({
      sourceAmount,
      sourceToken,
      destToken,
      walletAddress,
      latestSourceAtomicBalance,
      location,
      onAdjustSourceAmount,
    }),
    [
      sourceAmount,
      sourceToken,
      destToken,
      walletAddress,
      latestSourceAtomicBalance,
      location,
      onAdjustSourceAmount,
    ],
  );

  return (
    <SwapsBannersContext.Provider value={value}>
      {children}
    </SwapsBannersContext.Provider>
  );
}

export function useSwapsBannersContext(): SwapsBannersContextValue {
  const context = useContext(SwapsBannersContext);

  if (!context) {
    throw new Error(
      'useSwapsBannersContext must be used within SwapsBannersProvider',
    );
  }

  return context;
}
