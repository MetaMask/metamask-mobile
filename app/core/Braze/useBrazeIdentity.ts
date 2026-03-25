import Logger from '../../util/Logger';
import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { selectIsSignedIn } from '../../selectors/identity';
import { syncBrazeProfileId, clearBrazeProfileId } from './index';

/**
 * Reacts to MetaMask profile sign-in/sign-out and syncs the profile ID
 * to Braze as a custom user attribute (`profile_id`).
 *
 * On sign-in: fetches the profileId from AuthenticationController and
 * sets it on the Braze user profile.
 * On sign-out: clears the attribute so the Braze user no longer carries
 * a stale profile ID.
 */
export function useBrazeIdentity(): void {
  const isSignedIn = useSelector(selectIsSignedIn);
  const prevSignedIn = useRef(isSignedIn);

  useEffect(() => {
    Logger.log(
      '[Braze] useBrazeIdentity useEffect',
      isSignedIn,
      prevSignedIn.current,
    );
    if (isSignedIn && !prevSignedIn.current) {
      syncBrazeProfileId();
    } else if (!isSignedIn && prevSignedIn.current) {
      clearBrazeProfileId();
    }
    prevSignedIn.current = isSignedIn;
  }, [isSignedIn]);

  // On mount: if already signed in, sync immediately
  useEffect(() => {
    Logger.log('[Braze] useBrazeIdentity useEffect on mount', isSignedIn);
    if (isSignedIn) {
      syncBrazeProfileId();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
