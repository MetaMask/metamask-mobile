import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

import { selectExistingUser } from '../../../../reducers/user/selectors';
import {
  hasVisitedSocialTab as getHasVisitedSocialTab,
  subscribeToSocialTabVisited,
} from '../../../Views/SocialLeaderboard/utils/socialTabVisit';

interface UseSocialTabNewBadgeResult {
  showSocialTabNewBadge: boolean;
}

/**
 * Keeps the Social discovery dot visible for existing users until their first
 * Social entry. MMKV is read synchronously to avoid flashing the dot after it
 * has already been dismissed.
 */
export const useSocialTabNewBadge = (
  isSocialTabEnabled: boolean,
): UseSocialTabNewBadgeResult => {
  const isExistingUser = useSelector(selectExistingUser);
  const [hasVisitedSocialTab, setHasVisitedSocialTab] = useState(
    getHasVisitedSocialTab,
  );

  useEffect(() => {
    if (!isSocialTabEnabled) {
      return;
    }

    return subscribeToSocialTabVisited(setHasVisitedSocialTab);
  }, [isSocialTabEnabled]);

  return {
    showSocialTabNewBadge:
      isSocialTabEnabled && isExistingUser && !hasVisitedSocialTab,
  };
};
