import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import {
  usePerpsOrderForm,
  UsePerpsOrderFormReturn,
  PerpsOrderPriceField,
} from '../hooks/usePerpsOrderForm';
import { OrderType, Position } from '@metamask/perps-controller';

/**
 * Exact base size an order-book row filled. The form keeps size as USD, which
 * cannot hold every base size exactly, so the fill applies while the order
 * still has the `amount` it set and `field` still holds `price`.
 */
export interface PerpsOrderBookSizeFill {
  /** Row size in base units. */
  size: string;
  /** USD amount the fill wrote to the form. */
  amount: string;
  /** Price the fill committed. */
  price: string;
  /** Price field the tap filled: the focused one or the type's default. */
  field: PerpsOrderPriceField;
}

interface PerpsOrderContextType extends UsePerpsOrderFormReturn {
  existingPosition?: Position;
  orderBookSizeFill?: PerpsOrderBookSizeFill;
  /** Sets the form amount and records the exact size behind it. */
  fillOrderBookSize: (fill: PerpsOrderBookSizeFill) => void;
  /** Drops the recorded fill, so sizing works from the amount again. */
  clearOrderBookSizeFill: () => void;
}

const PerpsOrderContext = createContext<PerpsOrderContextType | null>(null);

interface PerpsOrderProviderProps {
  children: ReactNode;
  initialAsset?: string;
  initialDirection?: 'long' | 'short';
  initialAmount?: string;
  fallbackAmount?: string;
  initialLeverage?: number;
  initialType?: OrderType;
  initialSzDecimals?: number;
  existingPosition?: Position;
  /** When paying with a custom token, the selected token amount in USD; caps maxPossibleAmount and amount handlers */
  effectiveAvailableBalance?: number;
}

export const PerpsOrderProvider = ({
  children,
  initialAsset,
  initialDirection,
  initialAmount,
  fallbackAmount,
  initialLeverage,
  initialType,
  initialSzDecimals,
  existingPosition,
  effectiveAvailableBalance,
}: PerpsOrderProviderProps) => {
  const orderFormState = usePerpsOrderForm({
    initialAsset,
    initialDirection,
    initialAmount,
    fallbackAmount,
    initialLeverage: initialLeverage ?? existingPosition?.leverage?.value,
    initialType,
    initialSzDecimals,
    effectiveAvailableBalance,
  });
  const [orderBookSizeFill, setOrderBookSizeFill] =
    useState<PerpsOrderBookSizeFill>();
  const { setAmount } = orderFormState;
  const fillOrderBookSize = useCallback(
    (fill: PerpsOrderBookSizeFill) => {
      setAmount(fill.amount);
      setOrderBookSizeFill(fill);
    },
    [setAmount],
  );
  const clearOrderBookSizeFill = useCallback(
    () => setOrderBookSizeFill(undefined),
    [],
  );

  // orderFormState is itself memoized by usePerpsOrderForm (stable callbacks +
  // changing primitives), so depending on it directly keeps the provider value
  // referentially stable until the form state or existingPosition actually changes.
  const value = useMemo<PerpsOrderContextType>(
    () => ({
      ...orderFormState,
      existingPosition,
      orderBookSizeFill,
      fillOrderBookSize,
      clearOrderBookSizeFill,
    }),
    [
      orderFormState,
      existingPosition,
      orderBookSizeFill,
      fillOrderBookSize,
      clearOrderBookSizeFill,
    ],
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
