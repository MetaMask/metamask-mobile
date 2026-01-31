import { useCallback, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Routes from '../../constants/navigation/Routes';
import { selectShouldShowOptInPrompt } from '../../core/redux/slices/userProfile';
import { isE2E } from '../../util/test/utils';

/**
 * Hook to handle showing the user profile opt-in modal
 * Shows the modal only when the user hasn't seen the opt-in prompt yet
 */
export const useUserProfileOptIn = () => {
  const navigation = useNavigation();
  const shouldShowOptInPrompt = useSelector(selectShouldShowOptInPrompt);

  const checkAndShowUserProfileOptIn = useCallback(() => {
    // Only show modal if user hasn't seen the opt-in prompt
    const shouldShow = shouldShowOptInPrompt;

    if (shouldShow && !isE2E) {
      navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.MODAL.USER_PROFILE_OPT_IN,
      });
    }
  }, [shouldShowOptInPrompt, navigation]);

  useEffect(() => {
    // Small delay to ensure the wallet view is fully loaded
    const timer = setTimeout(() => {
      checkAndShowUserProfileOptIn();
    }, 1000);

    return () => clearTimeout(timer);
  }, [checkAndShowUserProfileOptIn]);

  return {
    shouldShowOptInPrompt,
  };
};
