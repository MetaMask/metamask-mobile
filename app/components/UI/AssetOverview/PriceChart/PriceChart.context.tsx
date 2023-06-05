import React, { createContext, useContext, useState } from 'react';

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

  return (
    <PriceChartContext.Provider
      value={{ isChartBeingTouched, setIsChartBeingTouched }}
    >
      {children}
    </PriceChartContext.Provider>
  );
};

export default PriceChartContext;
