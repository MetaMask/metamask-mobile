import { useCallback } from 'react';
import { useSelector } from 'react-redux';

import { selectBasicFunctionalityEnabled } from '../../../../selectors/settings';
import { selectCompletedOnboarding } from '../../../../selectors/onboarding';
import { selectIsUnlocked } from '../../../../selectors/keyringController';

import { syncContactsWithUserStorage } from '../../../../actions/identity';
import {
  selectIsBackupAndSyncEnabled,
  selectIsContactSyncingEnabled,
  selectIsSignedIn,
} from '../../../../selectors/identity';

/**
 * A utility used internally to decide if contact syncing should be dispatched
 * Considers factors like basic functionality; unlocked; finished onboarding, is logged in, and more specific logic.
 *
 * @returns a boolean if internally we can perform contact syncing or not.
 */
export const useShouldDispatchContactSyncing = () => {
  const isBackupAndSyncEnabled = useSelector(selectIsBackupAndSyncEnabled);
  const isContactSyncingEnabled = useSelector(selectIsContactSyncingEnabled);
  const basicFunctionality: boolean | undefined = useSelector(
    selectBasicFunctionalityEnabled,
  );
  const isUnlocked: boolean | undefined = useSelector(selectIsUnlocked);
  const isSignedIn = useSelector(selectIsSignedIn);
  const completedOnboarding = useSelector(selectCompletedOnboarding);

  const shouldDispatchContactSyncing: boolean = Boolean(
    basicFunctionality &&
      isBackupAndSyncEnabled &&
      isContactSyncingEnabled &&
      isUnlocked &&
      isSignedIn &&
      completedOnboarding,
  );

  return shouldDispatchContactSyncing;
};

/**
 * Custom hook to dispatch contact syncing.
 *
 * @returns An object containing the `dispatchContactSyncing` function, boolean `shouldDispatchContactSyncing`,
 * and error state.
 */
export const useContactSyncing = () => {
  const shouldDispatchContactSyncing = useShouldDispatchContactSyncing();

  const dispatchContactSyncing = useCallback(() => {
    if (!shouldDispatchContactSyncing) {
      return;
    }
    syncContactsWithUserStorage();
  }, [shouldDispatchContactSyncing]);

  return {
    dispatchContactSyncing,
    shouldDispatchContactSyncing,
  };
};
