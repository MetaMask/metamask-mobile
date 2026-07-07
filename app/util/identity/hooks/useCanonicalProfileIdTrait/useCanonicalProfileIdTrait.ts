import { useEffect } from 'react';
import { useSelector } from 'react-redux';

import Engine from '../../../../core/Engine';
import Logger from '../../../Logger';
import { selectIsSignedIn } from '../../../../selectors/identity';
import { analytics } from '../../../analytics/analytics';
import { UserProfileProperty } from '../../../metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';

/**
 * Pushes the `canonical_profile_id` MetaMetrics identify trait whenever the
 * AuthenticationController sign-in state changes.
 *
 * On sign-in, reads the session profile via
 * `AuthenticationController.getSessionProfile()` and calls `analytics.identify`
 * with the canonical profile id. The canonical id is the unified identifier
 * across all paired SRPs, so any single session profile suffices. On sign-out
 * the hook is a no-op — the trait persists on the previously identified user
 * profile, matching extension behaviour.
 */
export function useCanonicalProfileIdTrait(): void {
  const isSignedIn = useSelector(selectIsSignedIn);

  useEffect(() => {
    if (!isSignedIn) {
      return;
    }

    Engine.context.AuthenticationController.getSessionProfile()
      .then((sessionProfile) => {
        if (sessionProfile?.canonicalProfileId) {
          analytics.identify({
            [UserProfileProperty.CANONICAL_PROFILE_ID]:
              sessionProfile.canonicalProfileId,
          });
        }
      })
      .catch((error) => {
        Logger.error(
          error as Error,
          '[useCanonicalProfileIdTrait] Failed to set canonical_profile_id trait',
        );
      });
  }, [isSignedIn]);
}
