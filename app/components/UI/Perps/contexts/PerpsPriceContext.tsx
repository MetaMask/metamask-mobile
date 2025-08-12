import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { usePerpsPrices } from '../hooks/usePerpsPrices';
import type { PriceUpdate } from '../controllers/types';

interface PerpsPriceContextType {
  prices: Record<string, PriceUpdate>;
  getCurrentPrice: (symbol: string) => number;
}

const PerpsPriceContext = createContext<PerpsPriceContextType | null>(null);

interface PerpsPriceProviderProps {
  children: ReactNode;
  symbols: string[];
  includeOrderBook?: boolean;
}

/**
 * Separate context for price data to prevent unnecessary re-renders
 * Price updates are debounced and only affect components that use prices
 */
export const PerpsPriceProvider = ({
  children,
  symbols,
  includeOrderBook = false,
}: PerpsPriceProviderProps) => {
  const prices = usePerpsPrices(symbols, includeOrderBook);

  const contextValue = useMemo(
    () => ({
      prices,
      getCurrentPrice: (symbol: string) => {
        const price = prices[symbol];
        return price ? parseFloat(price.price || '0') : 0;
      },
    }),
    [prices],
  );

  return (
    <PerpsPriceContext.Provider value={contextValue}>
      {children}
    </PerpsPriceContext.Provider>
  );
};

export const usePerpsPriceContext = (): PerpsPriceContextType => {
  const context = useContext(PerpsPriceContext);
  if (!context) {
    throw new Error(
      'usePerpsPriceContext must be used within a PerpsPriceProvider',
    );
  }
  return context;
};
