import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectBulkLinkIsRunning,
  selectBulkLinkTotalAccounts,
  selectBulkLinkLinkedAccounts,
  selectBulkLinkFailedAccounts,
  selectBulkLinkAccountProgress,
  selectBulkLinkWasInterrupted,
} from '../../../../reducers/rewards/selectors';
import { bulkLinkReset } from '../../../../reducers/rewards';
import {
  startBulkLink,
  cancelBulkLink,
  resumeBulkLink,
} from '../../../../store/sagas/rewardsBulkLinkAccountGroups';

export interface UseBulkLinkStateResult {
  /**
   * Start the bulk link process for all account groups.
   * This runs in the background and survives navigation.
   */
  startBulkLink: () => void;

  /**
   * Cancel the ongoing bulk link process.
   * Already processed accounts will remain linked.
   */
  cancelBulkLink: () => void;

  /**
   * Reset the bulk link state to initial values.
   * Call this to clear results after reviewing them.
   */
  resetBulkLink: () => void;

  /**
   * Resume an interrupted bulk link process.
   * Use this when wasInterrupted is true to continue where the process left off.
   * The saga will re-fetch opt-in status to skip already-linked accounts.
   */
  resumeBulkLink: () => void;

  /**
   * Whether the bulk link process is currently running
   */
  isRunning: boolean;

  /**
   * Whether the bulk link process was interrupted (e.g., app closed during processing).
   * When true, call resumeBulkLink() to continue where it left off.
   */
  wasInterrupted: boolean;

  /**
   * Whether the bulk link has completed (either all done or cancelled)
   */
  isCompleted: boolean;

  /**
   * Whether there were any failures during the bulk link
   */
  hasFailures: boolean;

  /**
   * Whether all accounts were successfully linked
   */
  isFullySuccessful: boolean;

  /**
   * Total number of accounts that need to be linked
   */
  totalAccounts: number;

  /**
   * Number of accounts successfully linked so far
   */
  linkedAccounts: number;

  /**
   * Number of accounts that failed to link
   */
  failedAccounts: number;

  /**
   * Account-level progress as a decimal (0 to 1).
   * Updates after each individual account for real-time feedback.
   */
  accountProgress: number;

  /**
   * Number of accounts processed so far (linked + failed)
   */
  processedAccounts: number;
}

/**
 * Hook for managing bulk linking of all account groups to Rewards.
 */
export const useBulkLinkState = (): UseBulkLinkStateResult => {
  const dispatch = useDispatch();

  // Select account-level progress (updates after each individual account)
  const isRunning = useSelector(selectBulkLinkIsRunning);
  const wasInterrupted = useSelector(selectBulkLinkWasInterrupted);
  const totalAccounts = useSelector(selectBulkLinkTotalAccounts);
  const linkedAccounts = useSelector(selectBulkLinkLinkedAccounts);
  const failedAccounts = useSelector(selectBulkLinkFailedAccounts);
  const accountProgress = useSelector(selectBulkLinkAccountProgress);

  // Computed values
  const processedAccounts = useMemo(
    () => linkedAccounts + failedAccounts,
    [linkedAccounts, failedAccounts],
  );

  // Consider completed when not running and all accounts have been processed
  const isCompleted = useMemo(
    () =>
      !isRunning && totalAccounts > 0 && processedAccounts === totalAccounts,
    [isRunning, totalAccounts, processedAccounts],
  );

  const hasFailures = useMemo(() => failedAccounts > 0, [failedAccounts]);

  const isFullySuccessful = useMemo(
    () => isCompleted && !hasFailures && totalAccounts > 0,
    [isCompleted, hasFailures, totalAccounts],
  );

  // Action dispatchers
  const handleStartBulkLink = useCallback(() => {
    if (isRunning) {
      return; // Prevent starting multiple times
    }
    dispatch(startBulkLink());
  }, [dispatch, isRunning]);

  const handleCancelBulkLink = useCallback(() => {
    dispatch(cancelBulkLink());
  }, [dispatch]);

  const handleResetBulkLink = useCallback(() => {
    dispatch(bulkLinkReset());
  }, [dispatch]);

  const handleResumeBulkLink = useCallback(() => {
    if (isRunning) {
      return; // Prevent resuming if already running
    }
    dispatch(resumeBulkLink());
  }, [dispatch, isRunning]);

  return {
    startBulkLink: handleStartBulkLink,
    cancelBulkLink: handleCancelBulkLink,
    resetBulkLink: handleResetBulkLink,
    resumeBulkLink: handleResumeBulkLink,
    isRunning,
    wasInterrupted,
    isCompleted,
    hasFailures,
    isFullySuccessful,
    totalAccounts,
    linkedAccounts,
    failedAccounts,
    accountProgress,
    processedAccounts,
  };
};

export default useBulkLinkState;
