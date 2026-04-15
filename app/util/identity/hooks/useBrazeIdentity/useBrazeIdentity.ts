import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectIsSignedIn } from '../../../../selectors/identity';
import { setBrazeUser, clearBrazeUser } from '../../../../core/Braze';

/**
 * Syncs the Braze identity with the MetaMask profile sign-in state.
 *
 * On sign-in the profile ID is forwarded to the Braze Segment plugin via
 * `setBrazeUser()`.  On sign-out `clearBrazeUser()` makes the plugin a
 * no-op so events are no longer attributed to the previous user.
 */
export function useBrazeIdentity(): void {
  const isSignedIn = useSelector(selectIsSignedIn);

  useEffect(() => {
    if (isSignedIn) {
      setBrazeUser();
    } else {
      clearBrazeUser();
    }
  }, [isSignedIn]);
}
