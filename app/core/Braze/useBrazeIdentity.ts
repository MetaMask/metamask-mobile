import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectIsSignedIn } from '../../selectors/identity';
import { setBrazeUser } from './index';

/**
 * Reacts to MetaMask profile sign-in and sets the Braze external user ID
 * to the profile ID via `Braze.changeUser()`.
 *
 * This is the sole mechanism for creating/identifying Braze users —
 * Braze is intentionally decoupled from the Segment analytics pipeline.
 */
export function useBrazeIdentity(): void {
  const isSignedIn = useSelector(selectIsSignedIn);

  useEffect(() => {
    if (isSignedIn) {
      setBrazeUser();
    }
  }, [isSignedIn]);
}
