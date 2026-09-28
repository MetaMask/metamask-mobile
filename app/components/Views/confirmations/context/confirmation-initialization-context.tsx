import React, { createContext, useContext } from 'react';
import { useAfterFirstLayout } from '../hooks/ui/useAfterFirstLayout';

export type ConfirmationInitialization = ReturnType<typeof useAfterFirstLayout>;

const ConfirmationInitializationContext = createContext<
  ConfirmationInitialization | undefined
>(undefined);

export function ConfirmationInitializationProvider({
  children,
  enabled,
  transactionId,
}: {
  children: React.ReactNode;
  enabled: boolean;
  transactionId?: string;
}) {
  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <InitializationProvider key={transactionId}>
      {children}
    </InitializationProvider>
  );
}

export function useConfirmationInitialization() {
  return useContext(ConfirmationInitializationContext);
}

function InitializationProvider({ children }: { children: React.ReactNode }) {
  const initialization = useAfterFirstLayout();

  return (
    <ConfirmationInitializationContext.Provider value={initialization}>
      {children}
    </ConfirmationInitializationContext.Provider>
  );
}
