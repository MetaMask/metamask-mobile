import { store } from '../../../store';

const isStoreReady = () => {
  try {
    if (store && typeof store.dispatch === 'function') {
      return true;
    }
    return false;
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
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
};
