import { useEffect } from 'react';
import { useAccountSyncing } from '../useAccountSyncing';
import { useContactSyncing } from '../useContactSyncing';
import { useAutoSignIn, useAutoSignOut } from '../useAuthentication';
import { useBrazeIdentity } from '../../../../core/Braze/useBrazeIdentity';

/**
 * Takes care of various identity effects.
 * - Automatically signs users in or out based on the app state.
 * - Syncs profile ID to Braze on sign-in/sign-out.
 */
export const useIdentityEffects = () => {
  const { dispatchAccountSyncing, shouldDispatchAccountSyncing } =
    useAccountSyncing();
  const { dispatchContactSyncing, shouldDispatchContactSyncing } =
    useContactSyncing();
  const { autoSignIn, shouldAutoSignIn } = useAutoSignIn();
  const { autoSignOut, shouldAutoSignOut } = useAutoSignOut();

  useBrazeIdentity();

  /**
   * Back up & sync effects
   */
  useEffect(() => {
    if (shouldDispatchAccountSyncing) {
      dispatchAccountSyncing();
    }
  }, [shouldDispatchAccountSyncing, dispatchAccountSyncing]);

  useEffect(() => {
    if (shouldDispatchContactSyncing) {
      dispatchContactSyncing();
    }
  }, [shouldDispatchContactSyncing, dispatchContactSyncing]);

  /**
   * Authentication effects
   *
   * - Users should be automatically signed in based on various conditions. (see `useAutoSignIn`).
   * - Users should be signed out if basic functionality is disabled. (see `useAutoSignOut`)
   */
  useEffect(() => {
    if (shouldAutoSignIn) {
      autoSignIn();
    }
  }, [shouldAutoSignIn, autoSignIn]);

  useEffect(() => {
    if (shouldAutoSignOut) {
      autoSignOut();
    }
  }, [shouldAutoSignOut, autoSignOut]);
};
