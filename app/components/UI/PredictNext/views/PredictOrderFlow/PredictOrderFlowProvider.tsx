import React, { createContext, useCallback, useContext, useState } from 'react';

import { createKalshiTradingAdapter } from '../../adapters/remote/createKalshiTradingAdapter';
import { PredictOrderPreviewService } from '../../services/PredictOrderPreviewService';
import { KALSHI_VENUE_ID } from '../../types';

import {
  PredictOrderFlowSheet,
  type PredictOrderFlowIntent,
} from './internal/PredictOrderFlowSheet';

export type { PredictOrderFlowIntent };

interface OpenOrderFlow {
  intent: PredictOrderFlowIntent;
  service: PredictOrderPreviewService;
}

interface PredictOrderFlowContextValue {
  openOrderFlow: (intent: PredictOrderFlowIntent) => void;
}

const PredictOrderFlowContext =
  createContext<PredictOrderFlowContextValue | null>(null);

/**
 * Composition point for the Order Flow: owns the one shared preview sheet
 * and its preview service. Every Yes/No Outcome entry point (Event Screen
 * buttons, Event cards) opens the same flow. The trading-capable adapter is
 * built only when the flow actually opens — never on stack mount.
 */
export const PredictOrderFlowProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [open, setOpen] = useState<OpenOrderFlow | null>(null);

  const openOrderFlow = useCallback((intent: PredictOrderFlowIntent) => {
    const adapter = createKalshiTradingAdapter();
    setOpen({
      intent,
      service: new PredictOrderPreviewService({
        trading: adapter.trading,
        venueId: adapter.venueId,
      }),
    });
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
          service={open.service}
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
