import React, { createContext, useContext, ReactNode } from 'react';
import {
  usePerpsOrderForm,
  UsePerpsOrderFormReturn,
} from '../hooks/usePerpsOrderForm';
import { OrderType } from '../controllers/types';

interface PerpsOrderContextType extends UsePerpsOrderFormReturn {}

const PerpsOrderContext = createContext<PerpsOrderContextType | null>(null);

interface PerpsOrderProviderProps {
  children: ReactNode;
  initialAsset?: string;
  initialDirection?: 'long' | 'short';
  initialAmount?: string;
  initialLeverage?: number;
  initialType?: OrderType;
}

export const PerpsOrderProvider = ({
  children,
  initialAsset,
  initialDirection,
  initialAmount,
  initialLeverage,
  initialType,
}: PerpsOrderProviderProps) => {
  const orderFormState = usePerpsOrderForm({
    initialAsset,
    initialDirection,
    initialAmount,
    initialLeverage,
    initialType,
  });

  return (
    <PerpsOrderContext.Provider value={orderFormState}>
      {children}
    </PerpsOrderContext.Provider>
  );
};

export const usePerpsOrderContext = (): PerpsOrderContextType => {
  const context = useContext(PerpsOrderContext);
  if (!context) {
    throw new Error(
      'usePerpsOrderContext must be used within a PerpsOrderProvider',
    );
  }
  return context;
};
