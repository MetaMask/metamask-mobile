import { useEffect } from 'react';
import { useAccountSyncing } from '../useAccountSyncing';
import { useContactSyncing } from '../useContactSyncing';
import { useAutoSignIn, useAutoSignOut } from '../useAuthentication';
import { useBrazeIdentity } from '../../../../core/Braze/hooks';
import { useCanonicalProfileIdTrait } from '../useCanonicalProfileIdTrait';

/**
 * TEMP perf-debug switch for manual binary search on wallet-unlock JS-thread spike.
 * `dispatchAccountSyncing` -> `AccountTreeController.syncWithUserStorage()` iterates every
 * account group/wallet and issues a user-storage request for each right when `isUnlocked`
 * flips true — often racing the bearer-token/auth session not being ready yet, producing a
 * burst of failed `multichain_accounts_groups.N` uncaught promise rejections (seen: 17+ in a
 * row). Flip to true to test whether this accounts for the sustained post-unlock spike.
 * Remove this block before merging.
 */
export const PERF_DEBUG_SKIP_IDENTITY_SYNC_EFFECTS = false;

/**
 * TEMP perf-debug switch. Separate from `PERF_DEBUG_SKIP_IDENTITY_SYNC_EFFECTS` above, which
 * only guards `dispatchAccountSyncing`/`dispatchContactSyncing`. This one guards `autoSignIn()`
 * (from `useAutoSignIn`), which was running on EVERY unlock regardless of that other flag.
 * `autoSignIn` -> `AuthenticationController.performSignIn()` invokes the
 * `npm:@metamask/message-signing-snap` (seen timing out / "unreachable" in logs) and drives
 * `UserStorageController`'s `nativeScryptCrypto` (react-native-fast-crypto `scrypt`, N=131072)
 * key derivation — a heavy KDF. Flip to true to test its contribution to the unlock spike.
 * Remove this block before merging.
 */
export const PERF_DEBUG_SKIP_AUTO_SIGN_IN = true;

/**
 * Takes care of various identity effects.
 * - Automatically signs users in or out based on the app state.
 * - Syncs profile ID to Braze on sign-in/sign-out.
 * - Pushes the canonical_profile_id MetaMetrics trait on sign-in.
 */
export const useIdentityEffects = () => {
  const { dispatchAccountSyncing, shouldDispatchAccountSyncing } =
    useAccountSyncing();
  const { dispatchContactSyncing, shouldDispatchContactSyncing } =
    useContactSyncing();
  const { autoSignIn, shouldAutoSignIn } = useAutoSignIn();
  const { autoSignOut, shouldAutoSignOut } = useAutoSignOut();

  useBrazeIdentity();
  useCanonicalProfileIdTrait();

  /**
   * Back up & sync effects
   */
  useEffect(() => {
    if (PERF_DEBUG_SKIP_IDENTITY_SYNC_EFFECTS) {
      if (shouldDispatchAccountSyncing) {
        // eslint-disable-next-line no-console
        console.log(
          '[PERF_DEBUG] skipped dispatchAccountSyncing (AccountTreeController.syncWithUserStorage not called)',
        );
      }
      return;
    }
    if (shouldDispatchAccountSyncing) {
      dispatchAccountSyncing();
    }
  }, [shouldDispatchAccountSyncing, dispatchAccountSyncing]);

  useEffect(() => {
    if (PERF_DEBUG_SKIP_IDENTITY_SYNC_EFFECTS) {
      if (shouldDispatchContactSyncing) {
        // eslint-disable-next-line no-console
        console.log('[PERF_DEBUG] skipped dispatchContactSyncing');
      }
      return;
    }
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
    if (PERF_DEBUG_SKIP_AUTO_SIGN_IN) {
      if (shouldAutoSignIn) {
        // eslint-disable-next-line no-console
        console.log(
          '[PERF_DEBUG] skipped autoSignIn (AuthenticationController.performSignIn not called — no message-signing-snap call, no UserStorageController scrypt)',
        );
      }
      return;
    }
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
