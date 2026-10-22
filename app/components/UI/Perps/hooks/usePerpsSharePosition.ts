import { useCallback, useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import type { Position } from '@metamask/perps-controller';
import Routes from '../../../../constants/navigation/Routes';
import Engine from '../../../../core/Engine';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { selectSocialLeaderboardEnabled } from '../../../../selectors/featureFlagController/socialLeaderboard';
import { selectIsSignedIn } from '../../../../selectors/identity';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { useProfileController } from '../../../Views/SocialLeaderboard/ManageProfileView/hooks/useProfileController';
import { isProfileNotFoundError } from '../../../Views/SocialLeaderboard/MyProfileView/utils/isProfileNotFoundError';
import { usePerpsSocialEnabled } from './usePerpsSocialEnabled';

const PERPS_SHARE_SOCIAL_PROFILE_QUERY_KEY = [
  'perps',
  'shareSocialProfile',
] as const;
const PERPS_ACCOUNT_SCOPE = 'eip155:1';

interface PerpsShareRequest {
  position: Position;
  marketPrice?: string;
  accountAddress?: string;
}

export interface UsePerpsSharePositionResult {
  sharePosition: (position: Position, marketPrice?: string) => void;
}

export const usePerpsSharePosition = (): UsePerpsSharePositionResult => {
  const navigation = useNavigation<AppNavigationProp>();
  const isPerpsSocialEnabled = usePerpsSocialEnabled();
  const isSocialLeaderboardEnabled = useSelector(
    selectSocialLeaderboardEnabled,
  );
  const isSignedIn = useSelector(selectIsSignedIn);
  const accountAddress = useSelector(selectSelectedInternalAccountByScope)(
    PERPS_ACCOUNT_SCOPE,
  )?.address;
  const { profile: socialProfile, fetchAndUpdateProfile } =
    useProfileController();
  const isSocialFeedAvailable =
    isPerpsSocialEnabled && isSocialLeaderboardEnabled;
  const shouldLookUpProfile =
    isSocialFeedAvailable && isSignedIn && socialProfile === undefined;

  const {
    data: lookedUpProfileId,
    isFetching: isProfileLookupFetching,
    isError: hasProfileLookupFailed,
    refetch: retryProfileLookup,
  } = useQuery({
    queryKey: [...PERPS_SHARE_SOCIAL_PROFILE_QUERY_KEY, isSignedIn],
    queryFn: async () => {
      const sessionProfile =
        await Engine.context.AuthenticationController.getSessionProfile();
      if (!sessionProfile?.profileId) {
        return null;
      }
      try {
        await fetchAndUpdateProfile(sessionProfile.profileId);
        return sessionProfile.profileId;
      } catch (error) {
        if (isProfileNotFoundError(error)) {
          return null;
        }
        throw error;
      }
    },
    enabled: shouldLookUpProfile,
    staleTime: Infinity,
    retry: false,
  });

  const canPostToSocial =
    isSocialFeedAvailable &&
    (socialProfile !== undefined || Boolean(lookedUpProfileId));
  const isProfileLookupPending = shouldLookUpProfile && isProfileLookupFetching;
  const pendingShareRef = useRef<{
    request: PerpsShareRequest;
    hasRetried: boolean;
  } | null>(null);

  const openShare = useCallback(
    ({
      position,
      marketPrice,
      accountAddress: shareAccount,
    }: PerpsShareRequest) => {
      if (canPostToSocial) {
        navigation.navigate(Routes.PERPS.MODALS.ROOT, {
          screen: Routes.PERPS.MODALS.SHARE_POSITION,
          params: { position, marketPrice, accountAddress: shareAccount },
        });
        return;
      }
      navigation.navigate(Routes.PERPS.PNL_HERO_CARD, {
        position,
        marketPrice,
      });
    },
    [canPostToSocial, navigation],
  );

  useEffect(() => {
    const pendingShare = pendingShareRef.current;
    if (!pendingShare || isProfileLookupPending) {
      return;
    }
    if (hasProfileLookupFailed && !pendingShare.hasRetried) {
      pendingShare.hasRetried = true;
      retryProfileLookup().catch(() => undefined);
      return;
    }
    pendingShareRef.current = null;
    openShare(pendingShare.request);
  }, [
    hasProfileLookupFailed,
    isProfileLookupPending,
    openShare,
    retryProfileLookup,
  ]);

  const sharePosition = useCallback(
    (position: Position, marketPrice?: string) => {
      const isProfileUnresolved =
        shouldLookUpProfile &&
        (isProfileLookupFetching || hasProfileLookupFailed);
      const request = { position, marketPrice, accountAddress };
      if (!isProfileUnresolved) {
        openShare(request);
        return;
      }
      const shouldRetryNow = hasProfileLookupFailed && !isProfileLookupFetching;
      pendingShareRef.current = {
        request,
        hasRetried:
          shouldRetryNow || Boolean(pendingShareRef.current?.hasRetried),
      };
      if (shouldRetryNow) {
        retryProfileLookup().catch(() => undefined);
      }
    },
    [
      accountAddress,
      hasProfileLookupFailed,
      isProfileLookupFetching,
      openShare,
      retryProfileLookup,
      shouldLookUpProfile,
    ],
  );

  return { sharePosition };
};
