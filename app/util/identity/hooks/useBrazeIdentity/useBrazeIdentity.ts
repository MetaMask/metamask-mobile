import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectIsSignedIn } from '../../../../selectors/identity';
import {
  setBrazeUser,
  clearBrazeUser,
  refreshBrazeBanners,
} from '../../../../core/Braze';
import Logger from '../../../Logger';

/**
 * Syncs the Braze identity with the MetaMask profile sign-in state.
 *
 * On sign-in, `refreshBrazeBanners()` is called immediately (fire-and-forget)
 * so the native Braze SDK — which already holds the persisted user ID from the
 * previous session — can start fetching banners without waiting for the ~5 s
 * `getSessionProfile()` round-trip inside `setBrazeUser()`.
 *
 * On sign-out `clearBrazeUser()` makes the plugin a no-op so events are no
 * longer attributed to the previous user.
 */
export function useBrazeIdentity(): void {
  const isSignedIn = useSelector(selectIsSignedIn);

  useEffect(() => {
    if (isSignedIn) {
      setBrazeUser();
      Logger.log('[useBrazeIdentity] Refreshin banners');
      refreshBrazeBanners();
    } else {
      clearBrazeUser();
    }
  }, [isSignedIn]);
}
