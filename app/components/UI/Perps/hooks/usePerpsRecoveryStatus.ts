import { useCallback, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';

import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import Engine from '../../../../core/Engine';
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';
import {
  selectPerpsProvider,
  selectPerpsNetwork,
} from '../selectors/perpsController';
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
  /** Read or acknowledgment failure (storage corruption surfaces here — never hidden). */
  error: Error | null;
  /** Re-read both lists from the active provider. */
  refresh: () => Promise<void>;
  /** Acknowledge ONE recovered dispatch by its stable id, then refresh. */
  acknowledge: (recoveryId: string) => Promise<void>;
}

interface RecoveryState {
  contextKey: string;
  pendingManualRecoveries: PerpsPendingManualRecovery[];
  recoveredDispatches: PerpsRecoveredDispatch[];
  error: Error | null;
}

/**
 * Surfaces the active perps provider's durable-settlement safety state
 * (Lighter): manual TP/SL recoveries and recovered dispatch outcomes.
 *
 * Refreshes on initial focus, every later screen focus (returning from a
 * failed trade must expose fresh quarantine/manual state), and whenever
 * the selected account, active provider, or network changes. Reads are
 * read-only; acknowledgment is explicit and per-outcome. A provider
 * without durable settlement state yields empty lists.
 *
 * @returns Recovery state and handlers.
 */
export const usePerpsRecoveryStatus = (): UsePerpsRecoveryStatusReturn => {
  const selectedAddress = useSelector(selectSelectedInternalAccountAddress);
  const activeProvider = useSelector(selectPerpsProvider);
  const perpsNetwork = useSelector(selectPerpsNetwork);
  const contextKey = `${selectedAddress ?? ''}|${activeProvider ?? ''}|${
    perpsNetwork ?? ''
  }`;
  const [recoveryState, setRecoveryState] = useState<RecoveryState>({
    contextKey,
    pendingManualRecoveries: [],
    recoveredDispatches: [],
    error: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  // Overlapping focus/context refreshes can resolve OUT OF ORDER: a slow stale read must never
  // overwrite the state committed by a newer one. Every refresh takes a
  // request generation and captures its context; only the LATEST request
  // whose context still matches may commit lists, error, or loading.
  const requestSeqRef = useRef(0);
  const latestContextRef = useRef('');
  latestContextRef.current = contextKey;

  const refresh = useCallback(async () => {
    requestSeqRef.current += 1;
    const requestId = requestSeqRef.current;
    const requestContext = contextKey;
    const isCurrent = () =>
      requestId === requestSeqRef.current &&
      requestContext === latestContextRef.current;
    setIsLoading(true);
    try {
      const controller = Engine.context.PerpsController;
      const [manual, recovered] = await Promise.all([
        controller.getPendingManualRecoveries(),
        controller.getRecoveredDispatches(),
      ]);
      if (!isCurrent()) {
        return;
      }
      setRecoveryState({
        contextKey: requestContext,
        pendingManualRecoveries: manual,
        recoveredDispatches: recovered,
        error: null,
      });
    } catch (caughtError) {
      // Storage corruption or provider failure must SURFACE, never
      // degrade to "nothing pending" — but a STALE failure must not
      // clobber a newer request's state either.
      if (!isCurrent()) {
        return;
      }
      const wrapped =
        caughtError instanceof Error
          ? caughtError
          : new Error(String(caughtError));
      setRecoveryState((current) => ({
        contextKey: requestContext,
        pendingManualRecoveries:
          current.contextKey === requestContext
            ? current.pendingManualRecoveries
            : [],
        recoveredDispatches:
          current.contextKey === requestContext
            ? current.recoveredDispatches
            : [],
        error: wrapped,
      }));
      DevLogger.log('usePerpsRecoveryStatus: refresh failed', wrapped);
    } finally {
      if (isCurrent()) {
        setIsLoading(false);
      }
    }
  }, [contextKey]);

  const acknowledge = useCallback(
    async (recoveryId: string) => {
      const acknowledgementContext = contextKey;
      try {
        // The caller has just seen refreshed state in the UI; acknowledge
        // exactly the selected outcome, then re-read.
        await Engine.context.PerpsController.acknowledgeRecoveredDispatch(
          recoveryId,
        );
      } catch (caughtError) {
        // Keep the failure VISIBLE and the banner actionable.
        const wrapped =
          caughtError instanceof Error
            ? caughtError
            : new Error(String(caughtError));
        if (latestContextRef.current === acknowledgementContext) {
          setRecoveryState((current) => ({
            contextKey: acknowledgementContext,
            pendingManualRecoveries:
              current.contextKey === acknowledgementContext
                ? current.pendingManualRecoveries
                : [],
            recoveredDispatches:
              current.contextKey === acknowledgementContext
                ? current.recoveredDispatches
                : [],
            error: wrapped,
          }));
        }
        DevLogger.log('usePerpsRecoveryStatus: acknowledge failed', wrapped);
        throw wrapped;
      }
      await refresh();
    },
    [contextKey, refresh],
  );

  // Initial focus, later focus, and callback dependency changes share one read path.
  useFocusEffect(
    useCallback(() => {
      refresh().catch(() => {
        // refresh records its own error state.
      });
    }, [refresh]),
  );

  const visibleState =
    recoveryState.contextKey === contextKey
      ? recoveryState
      : {
          contextKey,
          pendingManualRecoveries: [],
          recoveredDispatches: [],
          error: null,
        };

  return {
    pendingManualRecoveries: visibleState.pendingManualRecoveries,
    recoveredDispatches: visibleState.recoveredDispatches,
    isLoading,
    error: visibleState.error,
    refresh,
    acknowledge,
  };
};
