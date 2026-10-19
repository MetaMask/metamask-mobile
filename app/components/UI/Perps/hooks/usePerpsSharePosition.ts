import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import type { Position } from '@metamask/perps-controller';
import Routes from '../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { selectSocialLeaderboardEnabled } from '../../../../selectors/featureFlagController/socialLeaderboard';
import { getSessionProfileId } from '../../../../util/notifications/utils/get-session-profile-id';
import { useProfileController } from '../../../Views/SocialLeaderboard/ManageProfileView/hooks/useProfileController';
import { usePerpsSocialEnabled } from './usePerpsSocialEnabled';

const PERPS_SHARE_SOCIAL_PROFILE_QUERY_KEY = [
  'perps',
  'shareSocialProfile',
] as const;

export interface UsePerpsSharePositionResult {
  sharePosition: (position: Position, marketPrice?: string) => void;
}

export const usePerpsSharePosition = (): UsePerpsSharePositionResult => {
  const navigation = useNavigation<AppNavigationProp>();
  const isPerpsSocialEnabled = usePerpsSocialEnabled();
  const isSocialLeaderboardEnabled = useSelector(
    selectSocialLeaderboardEnabled,
  );
  const { profile: socialProfile, fetchAndUpdateProfile } =
    useProfileController();
  const isSocialFeedAvailable =
    isPerpsSocialEnabled && isSocialLeaderboardEnabled;
  const canPostToSocial = isSocialFeedAvailable && socialProfile !== undefined;

  useQuery({
    queryKey: PERPS_SHARE_SOCIAL_PROFILE_QUERY_KEY,
    queryFn: async () => {
      const sessionProfileId = await getSessionProfileId();
      return sessionProfileId ? fetchAndUpdateProfile(sessionProfileId) : null;
    },
    enabled: isSocialFeedAvailable && socialProfile === undefined,
    staleTime: Infinity,
    retry: false,
    retryOnMount: false,
  });

  const sharePosition = useCallback(
    (position: Position, marketPrice?: string) => {
      if (canPostToSocial) {
        navigation.navigate(Routes.PERPS.MODALS.ROOT, {
          screen: Routes.PERPS.MODALS.SHARE_POSITION,
          params: { position, marketPrice },
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

  return { sharePosition };
};
