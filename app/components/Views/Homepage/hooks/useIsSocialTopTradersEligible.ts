import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { useMyProfile } from '../../SocialLeaderboard/MyProfileView/hooks';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../selectors/accountsController';
import {
  hasRecentSocialTrade,
  isRecentSocialActivityTimestamp,
} from '../../../../util/social/socialActivityStorage';

export const evaluateIsSocialTopTradersEligible = (
  profile: ReturnType<typeof useMyProfile>['profile'],
  walletAddress?: string,
  now: number = Date.now(),
): boolean =>
  isRecentSocialActivityTimestamp(profile?.createdAt, now) ||
  hasRecentSocialTrade(walletAddress, now);

/**
 * Resolves Top Traders priority without waiting for an asynchronous request.
 *
 * The homepage uses the first-render value to choose its section order and
 * refreshes the same synchronous sources each time it regains focus.
 */
export const useIsSocialTopTradersEligible = (): boolean => {
  const { profile } = useMyProfile();
  const walletAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const [isEligible, setIsEligible] = useState(() =>
    evaluateIsSocialTopTradersEligible(profile, walletAddress),
  );

  useFocusEffect(
    useCallback(() => {
      setIsEligible(evaluateIsSocialTopTradersEligible(profile, walletAddress));
    }, [profile, walletAddress]),
  );

  return isEligible;
};
