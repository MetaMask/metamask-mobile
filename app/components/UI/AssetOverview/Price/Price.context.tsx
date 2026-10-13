import React, { createContext, useContext } from 'react';
import {
  usePriceChartState,
  type PriceChartState,
  type UsePriceChartStateParams,
} from './usePriceChartState';

const PriceChartContext = createContext<PriceChartState | null>(null);

export interface PriceProviderProps extends UsePriceChartStateParams {
  children?: React.ReactNode;
}

/**
 * Owns the price header and chart state. Renders no UI of its own so that
 * `Price.Header`, caller-supplied sections, and `Price.Chart` read as flat
 * siblings at the call site.
 */
export const PriceProvider = ({ children, ...params }: PriceProviderProps) => {
  const value = usePriceChartState(params);

  return (
    <PriceChartContext.Provider value={value}>
      {children}
    </PriceChartContext.Provider>
  );
};

export const usePriceChartContext = (): PriceChartState => {
  const context = useContext(PriceChartContext);

  if (context === null) {
    throw new Error(
      'usePriceChartContext must be used within a Price.Provider',
    );
  }

  return context;
};
