import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { useMyProfile } from '../../SocialLeaderboard/MyProfileView/hooks';
import { selectSelectedAccountWalletId } from '../../../../selectors/multichainAccounts/selectedWallet';
import {
  hasRecentSocialTrade,
  isRecentSocialActivityTimestamp,
} from '../../../../util/social/socialActivityStorage';

export const evaluateIsSocialTopTradersEligible = (
  profile: ReturnType<typeof useMyProfile>['profile'],
  walletId?: string | null,
  now: number = Date.now(),
): boolean =>
  isRecentSocialActivityTimestamp(profile?.createdAt, now) ||
  hasRecentSocialTrade(walletId ?? undefined, now);

/**
 * Resolves Top Traders priority without waiting for an asynchronous request.
 *
 * The homepage uses the first-render value to choose its section order and
 * refreshes the same synchronous sources each time it regains focus.
 */
export const useIsSocialTopTradersEligible = (): boolean => {
  const { profile } = useMyProfile();
  const walletId = useSelector(selectSelectedAccountWalletId);
  const profileRef = useRef(profile);
  const walletIdRef = useRef(walletId);
  profileRef.current = profile;
  walletIdRef.current = walletId;
  const [isEligible, setIsEligible] = useState(() =>
    evaluateIsSocialTopTradersEligible(profile, walletId),
  );

  useFocusEffect(
    useCallback(() => {
      setIsEligible(
        evaluateIsSocialTopTradersEligible(
          profileRef.current,
          walletIdRef.current,
        ),
      );
    }, []),
  );

  return isEligible;
};
