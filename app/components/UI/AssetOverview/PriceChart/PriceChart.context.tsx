import React, { createContext, useContext, useMemo, useState } from 'react';

interface PriceChartContextType {
  isChartBeingTouched: boolean;
  setIsChartBeingTouched: React.Dispatch<React.SetStateAction<boolean>>;
}

const PriceChartContext = createContext<PriceChartContextType>({
  isChartBeingTouched: false,
  setIsChartBeingTouched: () => {
    throw new Error(
      'setIsChartBeingTouched() was called but no PriceChartProvider was found in the component tree.',
    );
  },
});

export const usePriceChart = () => useContext(PriceChartContext);

interface PriceChartProviderProps {
  children: React.ReactNode;
}

export const PriceChartProvider = ({ children }: PriceChartProviderProps) => {
  const [isChartBeingTouched, setIsChartBeingTouched] =
    useState<boolean>(false);

  // Keeps the context value identity stable so consumers only re-render when
  // the touch flag actually flips, not on every provider re-render.
  const value = useMemo(
    () => ({ isChartBeingTouched, setIsChartBeingTouched }),
    [isChartBeingTouched],
  );

  return (
    <PriceChartContext.Provider value={value}>
      {children}
    </PriceChartContext.Provider>
  );
};

export default PriceChartContext;
