import { store } from '../../../store';

const isStoreReady = () => {
  try {
    return Boolean(
      store &&
        typeof store.dispatch === 'function' &&
        // This check is needed because the BackgroundBridge requires the NetworkController state
        // for initialization. This check is brittle as reliance on other controller state during
        // resumption would not be accounted for. We should figure out something more robust.
        store.getState().engine.backgroundState.NetworkController,
    );
  } catch {
    return false;
  }
};

/**
 * Waits for the Redux store and its dispatch method to be available.
 * This utility helps prevent a rare race condition during app initialization where
 * services might attempt to dispatch actions before the store is ready.
 *
 * @returns A promise that resolves when the store is ready.
 */
export const whenStoreReady = async (): Promise<void> => {
  while (!isStoreReady()) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
};
