import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { useMyProfile } from '../../SocialLeaderboard/MyProfileView/hooks';
import {
  hasRecentSocialTrade,
  isRecentSocialActivityTimestamp,
} from '../../../../util/social/socialActivityStorage';

export const evaluateIsSocialTopTradersEligible = (
  profile: ReturnType<typeof useMyProfile>['profile'],
  now: number = Date.now(),
): boolean =>
  isRecentSocialActivityTimestamp(profile?.joinedAt, now) ||
  hasRecentSocialTrade(now);

/**
 * Resolves Top Traders priority without waiting for an asynchronous request.
 *
 * The homepage uses the first-render value to choose its section order and
 * refreshes the same synchronous sources each time it regains focus.
 */
export const useIsSocialTopTradersEligible = (
  enabled: boolean,
  hydrateProfile: boolean = enabled,
): boolean => {
  const { profile } = useMyProfile({ enabled: hydrateProfile });
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const [isEligible, setIsEligible] = useState(() =>
    enabled ? evaluateIsSocialTopTradersEligible(profile) : false,
  );

  useFocusEffect(
    useCallback(() => {
      setIsEligible(
        enabled
          ? evaluateIsSocialTopTradersEligible(profileRef.current)
          : false,
      );
    }, [enabled]),
  );

  return isEligible;
};
