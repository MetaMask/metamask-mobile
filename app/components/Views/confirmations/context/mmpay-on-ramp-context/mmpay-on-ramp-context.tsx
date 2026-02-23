import React, { createContext, ReactNode, useContext, useMemo } from 'react';
import type { MMPayOnRampIntent } from '../../../../UI/Ramp/types';

interface MMPayOnRampContextValue {
  mmPayOnRamp?: MMPayOnRampIntent;
  isMMPayOnRamp: boolean;
}

const MMPayOnRampContext = createContext<MMPayOnRampContextValue | undefined>(
  undefined,
);

interface MMPayOnRampProviderProps {
  children: ReactNode;
  mmPayOnRamp?: MMPayOnRampIntent | null;
}

/**
 * Provides MM-pay on-ramp route intent to ramp screens so they can apply
 * MM-pay specific routing behavior without prop drilling.
 */
export function MMPayOnRampProvider({
  children,
  mmPayOnRamp: incomingMMPayOnRamp,
}: MMPayOnRampProviderProps) {
  const mmPayOnRamp =
    incomingMMPayOnRamp?.source === 'mm_pay' ? incomingMMPayOnRamp : undefined;

  const value = useMemo<MMPayOnRampContextValue>(
    () => ({
      mmPayOnRamp,
      isMMPayOnRamp: mmPayOnRamp?.source === 'mm_pay',
    }),
    [mmPayOnRamp],
  );

  return (
    <MMPayOnRampContext.Provider value={value}>
      {children}
    </MMPayOnRampContext.Provider>
  );
}

export function useMMPayOnRampContext() {
  const context = useContext(MMPayOnRampContext);

  if (!context) {
    throw new Error(
      'useMMPayOnRampContext must be used within MMPayOnRampProvider',
    );
  }

  return context;
}
