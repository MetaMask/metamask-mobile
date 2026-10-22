import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import Routes from '../../../../constants/navigation/Routes';
import { useMyProfile } from '../MyProfileView/hooks';
import { isSocialProfileOnboardingRequired } from '../navigation/resolveSocialPostComposerWallet';

export interface UseRequireSocialProfileOnboardingResult {
  ensureSocialProfileOnboarding: () => boolean;
}

/**
 * Redirects users without an onboarding-linked wallet to social profile
 * onboarding before they can perform a profile-gated action.
 */
export const useRequireSocialProfileOnboarding =
  (): UseRequireSocialProfileOnboardingResult => {
    const navigation = useNavigation<AppNavigationProp>();
    const { profile } = useMyProfile();

    const ensureSocialProfileOnboarding = useCallback(() => {
      if (!isSocialProfileOnboardingRequired(profile?.linkedAccountAddress)) {
        return true;
      }

      navigation.navigate(Routes.SOCIAL.PROFILE_ONBOARDING);
      return false;
    }, [navigation, profile?.linkedAccountAddress]);

    return { ensureSocialProfileOnboarding };
  };

export default useRequireSocialProfileOnboarding;
