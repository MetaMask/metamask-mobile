import React, { createContext, useCallback, useContext, useState } from 'react';

import Engine from '../../../../../core/Engine';
import { useNextVenueId } from '../../implementation';

import { PredictWithdrawFlowSheet } from './internal/PredictWithdrawFlowSheet';

interface OpenWithdrawFlow {
  /** Distinguishes each opening, so every tap mounts a fresh flow. */
  id: number;
}

interface PredictWithdrawFlowContextValue {
  openWithdrawFlow: () => void;
}

const PredictWithdrawFlowContext =
  createContext<PredictWithdrawFlowContextValue | null>(null);

/**
 * Composition point for the Withdraw flow: owns the one shared Withdraw
 * sheet. Every Withdraw entry point (Home's Portfolio actions, the Portfolio
 * summary card) opens the same flow. The funding workflow service is the
 * Engine-registered PredictFundingService — adapter composition lives at the
 * Engine composition root, never in product modules.
 *
 * Mounting this provider does no work: the sheet, its hooks, and its balance
 * read appear only once the user taps Withdraw.
 */
export const PredictWithdrawFlowProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [open, setOpen] = useState<OpenWithdrawFlow | null>(null);
  const venueId = useNextVenueId();

  const openWithdrawFlow = useCallback(() => {
    setOpen((current) => ({ id: (current?.id ?? 0) + 1 }));
  }, []);
  const closeWithdrawFlow = useCallback(() => setOpen(null), []);

  const contextValue = React.useMemo(
    () => ({ openWithdrawFlow }),
    [openWithdrawFlow],
  );

  return (
    <PredictWithdrawFlowContext.Provider value={contextValue}>
      {children}
      {open ? (
        <PredictWithdrawFlowSheet
          key={open.id}
          venueId={venueId}
          service={Engine.context.PredictFundingService}
          onClose={closeWithdrawFlow}
        />
      ) : null}
    </PredictWithdrawFlowContext.Provider>
  );
};

/** Opens the Withdraw flow from any PredictNext surface. */
export const usePredictWithdrawFlow = (): PredictWithdrawFlowContextValue => {
  const context = useContext(PredictWithdrawFlowContext);
  if (!context) {
    throw new Error(
      'usePredictWithdrawFlow must be used within PredictWithdrawFlowProvider.',
    );
  }
  return context;
};
