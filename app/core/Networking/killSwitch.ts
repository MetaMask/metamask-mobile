import ReduxService from '../redux';
import {
  resolveTierPolicyEnabled,
  selectTierPolicyEnabled,
} from '../../selectors/featureFlagController/networking';

/** Reads the same effective flag as React, including persisted remote flags. */
export function isTierPolicyEnabled(): boolean {
  const store = ReduxService.storeIfInitialized;
  return store
    ? selectTierPolicyEnabled(store.getState())
    : resolveTierPolicyEnabled();
}

/** Notifies on flag changes, not on unrelated Redux updates. */
export function subscribeTierPolicyEnabled(listener: () => void): () => void {
  let previous = isTierPolicyEnabled();
  let unsubscribe: (() => void) | undefined;
  const cancel = ReduxService.whenStoreReady((store) => {
    const update = () => {
      const current = selectTierPolicyEnabled(store.getState());
      if (previous !== current) {
        previous = current;
        listener();
      }
    };
    unsubscribe = store.subscribe(update);
    update();
  });
  return () => {
    cancel();
    unsubscribe?.();
  };
}
