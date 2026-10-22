import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import Routes from '../../../../constants/navigation/Routes';
import { selectProfileControllerLinkedEvmAddress } from '../../../../selectors/profileController';
import { isSocialProfileOnboardingRequired } from '../navigation/resolveSocialPostComposerWallet';

export interface UseRequireSocialProfileOnboardingResult {
  ensureSocialProfileOnboarding: () => boolean;
}

/**
 * Redirects users without an onboarding-linked wallet to social profile
 * onboarding before they can perform a profile-gated action.
 *
 * Reads the linked wallet from ProfileController state and never fetches, so
 * it is safe to mount once per list row.
 */
export const useRequireSocialProfileOnboarding =
  (): UseRequireSocialProfileOnboardingResult => {
    const navigation = useNavigation<AppNavigationProp>();
    const linkedAccountAddress = useSelector(
      selectProfileControllerLinkedEvmAddress,
    );

    const ensureSocialProfileOnboarding = useCallback(() => {
      if (!isSocialProfileOnboardingRequired(linkedAccountAddress)) {
        return true;
      }

      navigation.navigate(Routes.SOCIAL.PROFILE_ONBOARDING);
      return false;
    }, [linkedAccountAddress, navigation]);

    return { ensureSocialProfileOnboarding };
  };

export default useRequireSocialProfileOnboarding;
