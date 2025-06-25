import { useCallback } from 'react';
import { useSelector } from 'react-redux';

import { selectBasicFunctionalityEnabled } from '../../../../selectors/settings';
import { selectCompletedOnboarding } from '../../../../selectors/onboarding';
import { selectIsUnlocked } from '../../../../selectors/keyringController';

import { syncInternalAccountsWithUserStorage } from '../../../../actions/identity';
import {
  selectIsAccountSyncingReadyToBeDispatched,
  selectIsBackupAndSyncEnabled,
  selectIsAccountSyncingEnabled,
  selectIsSignedIn,
} from '../../../../selectors/identity';

/**
 * A utility used internally to decide if account syncing should be dispatched
 * Considers factors like basic functionality; unlocked; finished onboarding, is logged in, and more specific logic.
 *
 * @returns a boolean if internally we can perform account syncing or not.
 */
export const useShouldDispatchAccountSyncing = () => {
  const isAccountSyncingReadyToBeDispatched = useSelector(
    selectIsAccountSyncingReadyToBeDispatched,
  );
  const isBackupAndSyncEnabled = useSelector(selectIsBackupAndSyncEnabled);
  const isAccountSyncingEnabled = useSelector(selectIsAccountSyncingEnabled);
  const basicFunctionality: boolean | undefined = useSelector(
    selectBasicFunctionalityEnabled,
  );
  const isUnlocked: boolean | undefined = useSelector(selectIsUnlocked);
  const isSignedIn = useSelector(selectIsSignedIn);
  const completedOnboarding = useSelector(selectCompletedOnboarding);

  const shouldDispatchAccountSyncing: boolean = Boolean(
    basicFunctionality &&
      isBackupAndSyncEnabled &&
      isAccountSyncingEnabled &&
      isUnlocked &&
      isSignedIn &&
      completedOnboarding &&
      isAccountSyncingReadyToBeDispatched,
  );

  return shouldDispatchAccountSyncing;
};

/**
 * Custom hook to dispatch account syncing.
 *
 * @returns An object containing the `dispatchAccountSyncing` function, boolean `shouldDispatchAccountSyncing`,
 * and error state.
 */
export const useAccountSyncing = () => {
  const shouldDispatchAccountSyncing = useShouldDispatchAccountSyncing();

  const dispatchAccountSyncing = useCallback(() => {
    if (!shouldDispatchAccountSyncing) {
      return;
    }
    syncInternalAccountsWithUserStorage();
  }, [shouldDispatchAccountSyncing]);

  return {
    dispatchAccountSyncing,
    shouldDispatchAccountSyncing,
  };
};
