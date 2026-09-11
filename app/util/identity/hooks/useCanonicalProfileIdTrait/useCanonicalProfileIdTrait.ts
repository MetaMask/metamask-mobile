import { useEffect } from 'react';
import { useSelector } from 'react-redux';

import {
  selectCanonicalProfileId,
  selectIsSignedIn,
} from '../../../../selectors/identity';
import { analytics } from '../../../analytics/analytics';
import { UserProfileProperty } from '../../../metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';

/**
 * Pushes the `canonical_profile_id` MetaMetrics identify trait whenever the
 * AuthenticationController session's canonical profile id changes.
 *
 * Reads the canonical id synchronously from redux via
 * `selectCanonicalProfileId`, so the effect re-fires both on sign-in and when
 * the canonical id is updated mid-session (e.g. after SRP pairing). On sign-out
 * the selector returns `undefined` and the trait is not (re-)sent.
 */
export function useCanonicalProfileIdTrait(): void {
  const isSignedIn = useSelector(selectIsSignedIn);
  const canonicalProfileId = useSelector(selectCanonicalProfileId);

  useEffect(() => {
    if (!isSignedIn || !canonicalProfileId) {
      return;
    }
    analytics.identify({
      [UserProfileProperty.CANONICAL_PROFILE_ID]: canonicalProfileId,
    });
  }, [isSignedIn, canonicalProfileId]);
}
