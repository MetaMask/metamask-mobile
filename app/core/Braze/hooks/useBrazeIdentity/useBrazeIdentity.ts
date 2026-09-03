import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import {
  selectCanonicalProfileId,
  selectIsSignedIn,
} from '../../../../selectors/identity';
import { setBrazeUser, clearBrazeUser, refreshBrazeBanners } from '../..';
import Logger from '../../../../util/Logger';

/**
 * Syncs the Braze identity with the MetaMask profile sign-in state.
 *
 * On sign-in (and whenever the cached canonical profile ID changes),
 * `setBrazeUser(canonicalProfileId)` identifies Braze, then
 * `refreshBrazeBanners()` runs so placement-targeted banners use the
 * current identity.
 *
 * On sign-out `clearBrazeUser()` makes the plugin a no-op so events are no
 * longer attributed to the previous user.
 */
export function useBrazeIdentity(): void {
  const isSignedIn = useSelector(selectIsSignedIn);
  const canonicalProfileId = useSelector(selectCanonicalProfileId);
  const hasBeenSignedInRef = useRef(false);

  useEffect(() => {
    try {
      if (isSignedIn && canonicalProfileId) {
        hasBeenSignedInRef.current = true;
        setBrazeUser(canonicalProfileId);
        refreshBrazeBanners();
      } else if (!isSignedIn && hasBeenSignedInRef.current) {
        hasBeenSignedInRef.current = false;
        clearBrazeUser();
      }
    } catch (error) {
      Logger.error(error as Error, '[Braze] Failed to sync Braze identity');
    }
  }, [isSignedIn, canonicalProfileId]);
}
