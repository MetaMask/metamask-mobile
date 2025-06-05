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
import Logger from '../../../../util/Logger';

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

  // DEBUG: Log all conditions for account syncing
  Logger.log('🔍 ACCOUNT SYNCING CONDITIONS:');
  Logger.log(`  basicFunctionality: ${basicFunctionality}`);
  Logger.log(`  isBackupAndSyncEnabled: ${isBackupAndSyncEnabled}`);
  Logger.log(`  isAccountSyncingEnabled: ${isAccountSyncingEnabled}`);
  Logger.log(`  isUnlocked: ${isUnlocked}`);
  Logger.log(`  isSignedIn: ${isSignedIn}`);
  Logger.log(`  completedOnboarding: ${completedOnboarding}`);
  Logger.log(
    `  isAccountSyncingReadyToBeDispatched: ${isAccountSyncingReadyToBeDispatched}`,
  );

  const shouldDispatchAccountSyncing: boolean = Boolean(
    basicFunctionality &&
      isBackupAndSyncEnabled &&
      isAccountSyncingEnabled &&
      isUnlocked &&
      isSignedIn &&
      completedOnboarding &&
      isAccountSyncingReadyToBeDispatched,
  );

  Logger.log(`  shouldDispatchAccountSyncing: ${shouldDispatchAccountSyncing}`);

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
    Logger.log('🎯 dispatchAccountSyncing called');
    Logger.log(
      `🎯 shouldDispatchAccountSyncing: ${shouldDispatchAccountSyncing}`,
    );

    if (!shouldDispatchAccountSyncing) {
      Logger.log('❌ Account syncing conditions not met, skipping sync');
      return;
    }

    Logger.log(
      '✅ Account syncing conditions met, calling syncInternalAccountsWithUserStorage',
    );
    syncInternalAccountsWithUserStorage();
  }, [shouldDispatchAccountSyncing]);

  return {
    dispatchAccountSyncing,
    shouldDispatchAccountSyncing,
  };
};
