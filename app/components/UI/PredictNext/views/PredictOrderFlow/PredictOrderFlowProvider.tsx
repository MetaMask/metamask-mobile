import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import Engine from '../../../../../core/Engine';
import {
  canPerformVenueAction,
  useVenueCapabilities,
} from '../../capabilities';

import {
  PredictOrderFlowSheet,
  type PredictOrderFlowIntent,
} from './internal/PredictOrderFlowSheet';

export type { PredictOrderFlowIntent };

interface OpenOrderFlow {
  /** Distinguishes each opening, so support is checked per intent. */
  id: number;
  intent: PredictOrderFlowIntent;
}

interface PredictOrderFlowContextValue {
  openOrderFlow: (intent: PredictOrderFlowIntent) => void;
}

/**
 * Opens the sheet only for an action the intent's Venue supports. Unknown,
 * missing, or malformed capabilities close the flow instead. Support is
 * checked when the sheet opens and then held, so a catalog refresh cannot
 * tear down an Order mid-commit; the backend authorizes the Commit anyway.
 */
const SupportedOrderFlowSheet = ({
  intent,
  onClose,
}: {
  intent: PredictOrderFlowIntent;
  onClose: () => void;
}) => {
  const capabilities = useVenueCapabilities(intent.venueId);
  const supported = canPerformVenueAction(capabilities, intent.action);
  const [admitted, setAdmitted] = useState(supported);
  if (supported && !admitted) {
    setAdmitted(true);
  }
  const rejected = !admitted && capabilities.status !== 'loading';

  useEffect(() => {
    if (rejected) {
      onClose();
    }
  }, [onClose, rejected]);

  return admitted ? (
    <PredictOrderFlowSheet
      intent={intent}
      service={Engine.context.PredictOrderService}
      onClose={onClose}
    />
  ) : null;
};

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
    setOpen((current) => ({ id: (current?.id ?? 0) + 1, intent }));
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
        <SupportedOrderFlowSheet
          key={open.id}
          intent={open.intent}
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
