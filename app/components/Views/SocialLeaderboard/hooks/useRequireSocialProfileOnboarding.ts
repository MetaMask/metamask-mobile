import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import Routes from '../../../../constants/navigation/Routes';
import { selectProfileControllerLinkedEvmAddress } from '../../../../selectors/profileController';
import { isSocialProfileOnboardingRequired } from '../navigation/resolveSocialPostComposerWallet';

export interface UseRequireSocialProfileOnboardingOptions {
  /**
   * Runs the onboarding navigation. A bottom sheet passes one that closes the
   * sheet first, so onboarding opens full screen instead of inside the sheet.
   * Defaults to navigating immediately.
   */
  runNavigation?: (navigate: () => void) => void;
}

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
export const useRequireSocialProfileOnboarding = ({
  runNavigation,
}: UseRequireSocialProfileOnboardingOptions = {}): UseRequireSocialProfileOnboardingResult => {
  const navigation = useNavigation<AppNavigationProp>();
  const linkedAccountAddress = useSelector(
    selectProfileControllerLinkedEvmAddress,
  );

  const ensureSocialProfileOnboarding = useCallback(() => {
    if (!isSocialProfileOnboardingRequired(linkedAccountAddress)) {
      return true;
    }

    const navigate = (): void => {
      navigation.navigate(Routes.SOCIAL.PROFILE_ONBOARDING);
    };
    if (runNavigation) {
      runNavigation(navigate);
    } else {
      navigate();
    }
    return false;
  }, [linkedAccountAddress, navigation, runNavigation]);

  return { ensureSocialProfileOnboarding };
};

export default useRequireSocialProfileOnboarding;
