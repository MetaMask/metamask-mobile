import { useState, useCallback } from 'react';
import {
  disableProfileSyncing as disableProfileSyncingAction,
  enableProfileSyncing as enableProfileSyncingAction,
} from '../../../../actions/identity';

/**
 * Custom hook to enable profile syncing. This hook handles the process of signing in
 * and enabling profile syncing.
 *
 * @returns An object containing the `enableProfileSyncing` function, loading state, and error state.
 */
export function useEnableProfileSyncing(): {
  enableProfileSyncing: () => Promise<void>;
  error: string | null;
  isLoading: boolean;
} {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const enableProfileSyncing = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await enableProfileSyncingAction();
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : JSON.stringify(e ?? '');
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { enableProfileSyncing, error, isLoading };
}

/**
 * Custom hook to disable profile syncing. This hook handles the process of
 * disabling profile syncing.
 *
 * @returns An object containing the `disableProfileSyncing` function, current profile syncing state,
 * loading state, and error state.
 */
export function useDisableProfileSyncing(): {
  disableProfileSyncing: () => Promise<void>;
  error: string | null;
  isLoading: boolean;
} {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const disableProfileSyncing = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await disableProfileSyncingAction();
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : JSON.stringify(e ?? '');
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { disableProfileSyncing, error, isLoading };
}
