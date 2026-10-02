import React, { createContext, useCallback, useContext, useState } from 'react';

import Engine from '../../../../../core/Engine';

import {
  PredictOrderFlowSheet,
  type PredictOrderFlowIntent,
} from './internal/PredictOrderFlowSheet';

export type { PredictOrderFlowIntent };

interface OpenOrderFlow {
  intent: PredictOrderFlowIntent;
}

interface PredictOrderFlowContextValue {
  openOrderFlow: (intent: PredictOrderFlowIntent) => void;
}

const PredictOrderFlowContext =
  createContext<PredictOrderFlowContextValue | null>(null);

/**
 * Composition point for the Order Flow: owns the one shared preview sheet.
 * Every Yes/No Outcome entry point (Event Screen buttons, Event cards) opens
 * the same flow. The Order workflow service is the Engine-registered
 * PredictOrderService — adapter composition lives at the Engine composition
 * root, never in product modules (see venue-adapters.md).
 */
export const PredictOrderFlowProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [open, setOpen] = useState<OpenOrderFlow | null>(null);

  const openOrderFlow = useCallback((intent: OpenOrderFlow['intent']) => {
    setOpen({ intent });
  }, []);
  const closeOrderFlow = useCallback(() => setOpen(null), []);

  const contextValue = React.useMemo(
    () => ({ openOrderFlow }),
    [openOrderFlow],
  );

  return (
    <PredictOrderFlowContext.Provider value={contextValue}>
      {children}
      {open ? (
        <PredictOrderFlowSheet
          intent={open.intent}
          service={Engine.context.PredictOrderService}
          onClose={closeOrderFlow}
        />
      ) : null}
    </PredictOrderFlowContext.Provider>
  );
};

/** Expresses Order intent from any PredictNext surface. */
export const usePredictOrderFlow = (): PredictOrderFlowContextValue => {
  const context = useContext(PredictOrderFlowContext);
  if (!context) {
    throw new Error(
      'usePredictOrderFlow must be used within PredictOrderFlowProvider.',
    );
  }
  return context;
};
