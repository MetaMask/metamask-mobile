import React, { createContext, useCallback, useContext, useState } from 'react';

import Engine from '../../../../../core/Engine';
import { useNextVenueId } from '../../implementation';
import { usePredictWithdrawAvailable } from '../../funding';

import { PredictWithdrawFlowSheet } from './internal/PredictWithdrawFlowSheet';

interface OpenWithdrawFlow {
  /** Distinguishes each opening, so every tap mounts a fresh flow. */
  id: number;
}

interface PredictWithdrawFlowContextValue {
  openWithdrawFlow: () => void;
}

/**
 * Opens the sheet only for a Venue that advertises Withdraw and whose
 * implementation this client can run. Support is checked when the sheet
 * opens and then held, so a catalog refresh cannot tear down a Withdrawal
 * while it is committing; the backend authorizes the Commit anyway.
 */
const SupportedWithdrawFlowSheet = ({ onClose }: { onClose: () => void }) => {
  const venueId = useNextVenueId();
  const resolution = usePredictWithdrawAvailable();
  const supported = resolution.status === 'ready';
  const [admitted, setAdmitted] = useState(supported);
  if (supported && !admitted) {
    setAdmitted(true);
  }

  return admitted ? (
    <PredictWithdrawFlowSheet
      venueId={venueId}
      service={Engine.context.PredictFundingService}
      onClose={onClose}
    />
  ) : null;
};

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
        <SupportedWithdrawFlowSheet key={open.id} onClose={closeWithdrawFlow} />
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
