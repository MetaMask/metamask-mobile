import { useCallback } from 'react';

import { SocialEvent } from '../components/Views/SocialLeaderboard/analytics/socialEvents';
import { useSocialInteraction } from '../components/Views/SocialLeaderboard/analytics/useSocialV1Analytics';

const { Interaction, Outcome } = SocialEvent;

/**
 * Records a successful Manage profile edit as `profile_edited`.
 *
 * Lives outside `components/Views` because the Manage profile route and the X
 * account route both report this edit, and sibling route modules may not
 * import from each other (ADR 0020). Same shared home as `useXAuth`, which the
 * same two routes already use.
 */
export const useManageProfileAnalytics = () => {
  const track = useSocialInteraction(SocialEvent.Screen.MANAGE_PROFILE);
  return useCallback(
    () => track(Interaction.PROFILE_EDITED, Outcome.SUCCESS),
    [track],
  );
};
