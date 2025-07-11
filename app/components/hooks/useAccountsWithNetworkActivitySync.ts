import { useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../core/Engine/Engine';
import { RootState } from '../../reducers';

/**
 * Options for useAccountsWithNetworkActivitySync
 */
export interface UseAccountsWithNetworkActivitySyncOptions {
  /** If true, fetch on first load (once per app session). Default: true */
  onFirstLoad?: boolean;
  /** If true, fetch on every confirmed transaction. Default: true */
  onTransactionComplete?: boolean;
}

/**
 * Return type for useAccountsWithNetworkActivitySync
 */
export interface UseAccountsWithNetworkActivitySyncResult {
  /**
   * Call this manually to fetch account activity (e.g. after adding an account).
   */
  fetchAccountsWithActivity: () => Promise<void>;
}

/**
 * useAccountsWithNetworkActivitySync
 *
 * Centralizes account activity fetching logic for:
 * - First load (only once per app session, if basic functionality is enabled)
 * - Transaction complete (confirmed)
 * - Manual trigger (e.g. after account add)
 *
 * @param {UseAccountsWithNetworkActivitySyncOptions} [options]
 * @returns {UseAccountsWithNetworkActivitySyncResult}
 *
 * @example // Fetch on first load and transaction complete (default)
 * useAccountsWithNetworkActivitySync();
 *
 * @example // Only fetch manually (e.g. after account add)
 * const { fetchAccountsWithActivity } = useAccountsWithNetworkActivitySync({
 *   onFirstLoad: false,
 *   onTransactionComplete: false,
 * });
 *
 * await fetchAccountsWithActivity();
 */
export function useAccountsWithNetworkActivitySync({
  onFirstLoad = true,
  onTransactionComplete = true,
}: UseAccountsWithNetworkActivitySyncOptions = {}): UseAccountsWithNetworkActivitySyncResult {
  const basicFunctionalityEnabled: boolean = useSelector(
    (state: RootState) => state.settings.basicFunctionalityEnabled,
  );
  const hasFetchedRef = useRef<boolean>(false);

  const fetchAccountsWithActivity = useCallback(async (): Promise<void> => {
    try {
      const multichainNetworkController =
        Engine.context.MultichainNetworkController;
      await multichainNetworkController.getNetworksWithTransactionActivityByAccounts();
    } catch (error) {
      console.error('Error fetching accounts with activity', error);
    }
  }, []);

  useEffect(() => {
    if (onFirstLoad && basicFunctionalityEnabled && !hasFetchedRef.current) {
      fetchAccountsWithActivity();
      hasFetchedRef.current = true;
    }
  }, [onFirstLoad, basicFunctionalityEnabled, fetchAccountsWithActivity]);

  useEffect(() => {
    if (!onTransactionComplete) return;
    const onTransactionCompleteHandler = () => {
      fetchAccountsWithActivity();
    };
    Engine.controllerMessenger.subscribe(
      'TransactionController:transactionConfirmed',
      onTransactionCompleteHandler,
    );
    return () => {
      Engine.controllerMessenger.unsubscribe(
        'TransactionController:transactionConfirmed',
        onTransactionCompleteHandler,
      );
    };
  }, [onTransactionComplete, fetchAccountsWithActivity]);

  return { fetchAccountsWithActivity };
}
