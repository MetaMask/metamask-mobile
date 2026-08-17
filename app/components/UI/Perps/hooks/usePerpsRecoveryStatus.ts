import { useCallback, useEffect, useState } from 'react';

import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import Engine from '../../../../core/Engine';
import type {
  PerpsPendingManualRecovery,
  PerpsRecoveredDispatch,
} from '@metamask/perps-controller';

export interface UsePerpsRecoveryStatusReturn {
  /** TP/SL protections parked for explicit manual re-establishment. */
  pendingManualRecoveries: PerpsPendingManualRecovery[];
  /** Previously ambiguous dispatches later resolved; block writes until acknowledged. */
  recoveredDispatches: PerpsRecoveredDispatch[];
  /** Whether a refresh is in flight. */
  isLoading: boolean;
  /** Read failure (storage corruption surfaces here — never hidden). */
  error: Error | null;
  /** Re-read both lists from the active provider. */
  refresh: () => Promise<void>;
  /** Acknowledge ONE recovered dispatch by its stable id, then refresh. */
  acknowledge: (recoveryId: string) => Promise<void>;
}

/**
 * Surfaces the active perps provider's durable-settlement safety state
 * (Lighter): manual TP/SL recoveries and recovered dispatch outcomes.
 *
 * Reads are read-only; acknowledgment is explicit and per-outcome. A
 * provider without durable settlement state yields empty lists.
 *
 * @returns Recovery state and handlers.
 */
export const usePerpsRecoveryStatus = (): UsePerpsRecoveryStatusReturn => {
  const [pendingManualRecoveries, setPendingManualRecoveries] = useState<
    PerpsPendingManualRecovery[]
  >([]);
  const [recoveredDispatches, setRecoveredDispatches] = useState<
    PerpsRecoveredDispatch[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const controller = Engine.context.PerpsController;
      const [manual, recovered] = await Promise.all([
        controller.getPendingManualRecoveries(),
        controller.getRecoveredDispatches(),
      ]);
      setPendingManualRecoveries(manual);
      setRecoveredDispatches(recovered);
      setError(null);
    } catch (caughtError) {
      // Storage corruption or provider failure must SURFACE, never
      // degrade to "nothing pending".
      const wrapped =
        caughtError instanceof Error
          ? caughtError
          : new Error(String(caughtError));
      setError(wrapped);
      DevLogger.log('usePerpsRecoveryStatus: refresh failed', wrapped);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const acknowledge = useCallback(
    async (recoveryId: string) => {
      // The caller has just seen refreshed state in the UI; acknowledge
      // exactly the selected outcome, then re-read.
      await Engine.context.PerpsController.acknowledgeRecoveredDispatch(
        recoveryId,
      );
      await refresh();
    },
    [refresh],
  );

  useEffect(() => {
    refresh().catch(() => {
      // refresh records its own error state.
    });
  }, [refresh]);

  return {
    pendingManualRecoveries,
    recoveredDispatches,
    isLoading,
    error,
    refresh,
    acknowledge,
  };
};
