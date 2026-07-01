import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectIsSignedIn } from '../../../../selectors/identity';
import { setBrazeUser, clearBrazeUser, refreshBrazeBanners } from '../..';

/**
 * Syncs the Braze identity with the MetaMask profile sign-in state.
 *
 * On sign-in, `refreshBrazeBanners()` is called only after `setBrazeUser()`
 * resolves so the native Braze SDK has switched to the current profile before
 * fetching placement-targeted banners.
 *
 * On sign-out `clearBrazeUser()` makes the plugin a no-op so events are no
 * longer attributed to the previous user.
 */
export function useBrazeIdentity(): void {
  const isSignedIn = useSelector(selectIsSignedIn);

  useEffect(() => {
    let isCancelled = false;

    const syncBrazeIdentity = async () => {
      if (isSignedIn) {
        await setBrazeUser();
        if (!isCancelled) {
          refreshBrazeBanners();
        }
      } else {
        clearBrazeUser();
      }
    };

    void syncBrazeIdentity();

    return () => {
      isCancelled = true;
    };
  }, [isSignedIn]);
}
