import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import Engine from '../../../../core/Engine';
import {
  clearSocialEarlyAccess,
  selectSocialEarlyAccessProfileId,
  setSocialEarlyAccess,
} from '../../../../core/redux/slices/socialEarlyAccess';
import { selectIsSocialV1Treatment } from '../../../../selectors/featureFlagController/socialV1';
import {
  selectCanonicalProfileId,
  selectIsSignedIn,
  selectSessionProfileId,
} from '../../../../selectors/identity';

/**
 * Loads the profile's Social early-access status once per profile per
 * session and stores it for the Social gates.
 *
 * Only asks while early access can change something: the user is outside the
 * Social V1 treatment bucket. Reads the bucket alone, never the combined
 * access, because that depends on the answer this hook stores.
 *
 * Clears the stored answer once the current profile differs from the one it
 * belongs to, so a grant never carries over to another wallet.
 */
export function useSocialEarlyAccess(): void {
  const dispatch = useDispatch();
  const isSignedIn = useSelector(selectIsSignedIn);
  const canonicalProfileId = useSelector(selectCanonicalProfileId);
  const sessionProfileId = useSelector(selectSessionProfileId);
  const isSocialV1Treatment = useSelector(selectIsSocialV1Treatment);
  const storedProfileId = useSelector(selectSocialEarlyAccessProfileId);
  const profileId = canonicalProfileId || sessionProfileId;
  const canEarlyAccessApply = !isSocialV1Treatment;
  const attemptedProfileIdRef = useRef<string | null>(null);
  const wasSignedInRef = useRef(isSignedIn);

  useEffect(() => {
    if (wasSignedInRef.current && !isSignedIn) {
      attemptedProfileIdRef.current = null;
      dispatch(clearSocialEarlyAccess());
    }
    wasSignedInRef.current = isSignedIn;
  }, [dispatch, isSignedIn]);

  // Waits for a known profile id so a late identity hydration on cold start
  // does not wipe a valid grant.
  useEffect(() => {
    if (storedProfileId && profileId && storedProfileId !== profileId) {
      dispatch(clearSocialEarlyAccess());
    }
  }, [dispatch, profileId, storedProfileId]);

  useEffect(() => {
    if (
      !isSignedIn ||
      !profileId ||
      !canEarlyAccessApply ||
      attemptedProfileIdRef.current === profileId
    ) {
      return;
    }

    attemptedProfileIdRef.current = profileId;
    Engine.context.ProfileService.checkEarlyAccess()
      .then(({ hasAccess }) => {
        // A response for a profile that is no longer current is dropped.
        if (attemptedProfileIdRef.current === profileId) {
          dispatch(setSocialEarlyAccess({ profileId, hasAccess }));
        }
      })
      .catch(() => undefined);
  }, [canEarlyAccessApply, dispatch, isSignedIn, profileId]);
}
