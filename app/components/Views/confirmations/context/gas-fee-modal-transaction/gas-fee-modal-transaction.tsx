import React, { useContext, useMemo } from 'react';

export interface GasFeeModalTransactionContextParams {
  /** When set, gas modal and hooks use this transaction instead of approval request. */
  transactionId: string | null;
}

const GasFeeModalTransactionContext =
  React.createContext<GasFeeModalTransactionContextParams | null>(null);

const defaultParams: GasFeeModalTransactionContextParams = {
  transactionId: null,
};

interface GasFeeModalTransactionProviderProps {
  children: React.ReactNode;
  /** When provided, gas modal uses this transaction instead of approval request. */
  transactionId?: string | null;
}

export const GasFeeModalTransactionProvider: React.FC<
  GasFeeModalTransactionProviderProps
> = ({ children, transactionId = null }) => {
  const contextValue = useMemo(
    () => ({
      transactionId: transactionId ?? null,
    }),
    [transactionId],
  );

  return (
    <GasFeeModalTransactionContext.Provider value={contextValue}>
      {children}
    </GasFeeModalTransactionContext.Provider>
  );
};

/**
 * Returns the gas fee modal transaction context.
 * When transactionId is set (e.g. cancel/speed up), use it instead of approval request for the "current" transaction.
 */
export function useGasFeeModalTransaction(): GasFeeModalTransactionContextParams {
  const context = useContext(GasFeeModalTransactionContext);
  return context ?? defaultParams;
}
