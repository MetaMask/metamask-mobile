import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import {
  usePerpsOrderForm,
  UsePerpsOrderFormReturn,
} from '../hooks/usePerpsOrderForm';
import { OrderType, Position } from '@metamask/perps-controller';

interface PerpsOrderContextType extends UsePerpsOrderFormReturn {
  existingPosition?: Position;
}

const PerpsOrderContext = createContext<PerpsOrderContextType | null>(null);

interface PerpsOrderProviderProps {
  children: ReactNode;
  initialAsset?: string;
  initialDirection?: 'long' | 'short';
  initialAmount?: string;
  initialLeverage?: number;
  initialType?: OrderType;
  existingPosition?: Position;
  /** When paying with a custom token, the selected token amount in USD; caps maxPossibleAmount and amount handlers */
  effectiveAvailableBalance?: number;
}

export const PerpsOrderProvider = ({
  children,
  initialAsset,
  initialDirection,
  initialAmount,
  initialLeverage,
  initialType,
  existingPosition,
  effectiveAvailableBalance,
}: PerpsOrderProviderProps) => {
  const orderFormState = usePerpsOrderForm({
    initialAsset,
    initialDirection,
    initialAmount,
    initialLeverage: initialLeverage ?? existingPosition?.leverage?.value,
    initialType,
    effectiveAvailableBalance,
  });

  // orderFormState is itself memoized by usePerpsOrderForm (stable callbacks +
  // changing primitives), so depending on it directly keeps the provider value
  // referentially stable until the form state or existingPosition actually changes.
  const value = useMemo<PerpsOrderContextType>(
    () => ({
      ...orderFormState,
      existingPosition,
    }),
    [orderFormState, existingPosition],
  );

  return (
    <PerpsOrderContext.Provider value={value}>
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
