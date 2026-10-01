import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { useStore } from 'react-redux';
import type { Store } from 'redux';
import type { PerpsActiveProviderMode } from '@metamask/perps-controller';
import type { RootState } from '../../../../reducers';
import { selectPerpsSelectedAccountAddress } from '../selectors/selectedAccountAddress';
import {
  selectPerpsNetwork,
  selectPerpsProvider,
} from '../selectors/perpsController';

interface RecoverySelection {
  readonly address?: string;
  readonly network?: 'mainnet' | 'testnet';
  readonly provider?: PerpsActiveProviderMode;
}

export interface PerpsRecoveryContext extends Required<RecoverySelection> {
  readonly epoch: number;
}

type RecoverySnapshot = RecoverySelection & { readonly epoch: number };

interface RecoveryTracker {
  readonly store: Store<RootState>;
  active: boolean;
  snapshot: RecoverySnapshot;
}

const readSelection = (state: RootState): RecoverySelection => {
  const controllerState = state.engine.backgroundState.PerpsController;
  return {
    address: selectPerpsSelectedAccountAddress(state),
    network:
      typeof controllerState?.isTestnet === 'boolean'
        ? selectPerpsNetwork(state)
        : undefined,
    provider: selectPerpsProvider(state),
  };
};

const isReady = (
  snapshot: RecoverySnapshot,
): snapshot is PerpsRecoveryContext =>
  snapshot.address !== undefined &&
  snapshot.network !== undefined &&
  snapshot.provider !== undefined;

/**
 * Owns recovery request identity for one mounted surface. The local Redux
 * subscription observes every selection transition before React batches renders,
 * so returning to the original account does not revive an earlier request.
 * This does not alter connection ownership or global market caches.
 *
 * @returns Current selection, a complete issuing-context capture, and a guard
 * for every asynchronous result, error and final UI update.
 */
export function usePerpsRecoveryContext() {
  const store = useStore<RootState>();
  const trackerRef = useRef<RecoveryTracker | undefined>(undefined);
  const [context, setContext] = useState<RecoverySnapshot>(() => ({
    ...readSelection(store.getState()),
    epoch: 0,
  }));

  const refresh = useCallback(() => {
    const tracker = trackerRef.current;
    if (!tracker?.active || tracker.store !== store) {
      return undefined;
    }
    const selection = readSelection(store.getState());
    const previous = tracker.snapshot;
    if (
      selection.address !== previous.address ||
      selection.network !== previous.network ||
      selection.provider !== previous.provider
    ) {
      tracker.snapshot = { ...selection, epoch: previous.epoch + 1 };
      setContext(tracker.snapshot);
    }
    return tracker.snapshot;
  }, [store]);

  useLayoutEffect(() => {
    const tracker: RecoveryTracker = {
      store,
      active: true,
      snapshot: { ...readSelection(store.getState()), epoch: 0 },
    };
    trackerRef.current = tracker;
    const unsubscribe = store.subscribe(refresh);
    refresh();
    setContext(tracker.snapshot);
    return () => {
      tracker.active = false;
      tracker.snapshot = {
        ...tracker.snapshot,
        epoch: tracker.snapshot.epoch + 1,
      };
      unsubscribe();
      if (trackerRef.current === tracker) {
        trackerRef.current = undefined;
      }
    };
  }, [refresh, store]);

  const capture = useCallback((): PerpsRecoveryContext | undefined => {
    const snapshot = refresh();
    return snapshot !== undefined && isReady(snapshot) ? snapshot : undefined;
  }, [refresh]);

  const isCurrent = useCallback(
    (issued: PerpsRecoveryContext | undefined): boolean =>
      issued !== undefined && refresh() === issued,
    [refresh],
  );

  return { context, capture, isCurrent };
}
