import { useCallback } from 'react';
import { useSelector } from 'react-redux';

import { selectBasicFunctionalityEnabled } from '../../../../selectors/settings';
import { selectCompletedOnboarding } from '../../../../selectors/onboarding';
import { selectIsUnlocked } from '../../../../selectors/keyringController';

import Engine from '../../../../core/Engine';
import {
  selectIsBackupAndSyncEnabled,
  selectIsRampsSyncingEnabled,
  selectIsSignedIn,
} from '../../../../selectors/identity';

/**
 * A utility used internally to decide if ramps order syncing should be dispatched.
 * Considers factors like basic functionality, unlocked, finished onboarding,
 * signed in, and ramps syncing feature flags.
 *
 * @returns Whether ramps order syncing can be performed.
 */
export const useShouldDispatchRampsOrderSyncing = () => {
  const isBackupAndSyncEnabled = useSelector(selectIsBackupAndSyncEnabled);
  const isRampsSyncingEnabled = useSelector(selectIsRampsSyncingEnabled);
  const basicFunctionality: boolean | undefined = useSelector(
    selectBasicFunctionalityEnabled,
  );
  const isUnlocked: boolean | undefined = useSelector(selectIsUnlocked);
  const isSignedIn = useSelector(selectIsSignedIn);
  const completedOnboarding = useSelector(selectCompletedOnboarding);

  const shouldDispatchRampsOrderSyncing: boolean = Boolean(
    basicFunctionality &&
      isBackupAndSyncEnabled &&
      isRampsSyncingEnabled &&
      isUnlocked &&
      isSignedIn &&
      completedOnboarding,
  );

  return shouldDispatchRampsOrderSyncing;
};

/**
 * Custom hook to dispatch ramps order syncing.
 *
 * @returns An object containing the `dispatchRampsOrderSyncing` function and
 * boolean `shouldDispatchRampsOrderSyncing`.
 */
export const useRampsOrderSyncing = () => {
  const shouldDispatchRampsOrderSyncing = useShouldDispatchRampsOrderSyncing();

  const dispatchRampsOrderSyncing = useCallback(() => {
    const action = async () => {
      if (!shouldDispatchRampsOrderSyncing) {
        return;
      }
      await Engine.context.RampsController.syncOrdersWithUserStorage();
    };
    action().catch((error) => {
      console.error('Error dispatching ramps order syncing:', error);
    });
  }, [shouldDispatchRampsOrderSyncing]);

  return {
    dispatchRampsOrderSyncing,
    shouldDispatchRampsOrderSyncing,
  };
};
