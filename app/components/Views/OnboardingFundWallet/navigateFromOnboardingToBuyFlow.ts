import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import Routes from '../../../constants/navigation/Routes';

/**
 * Opens the unified Ramp buy flow from the onboarding stack.
 *
 * Routes.RAMP.TOKEN_SELECTION is registered directly on OnboardingRootNav
 * (the parent of OnboardingNav where this screen lives), so a single
 * getParent() call is enough to reach it.
 *
 * Navigator hierarchy:
 * OnboardingRootNav  <- getParent() lands here; TOKEN_SELECTION registered here
 * └── OnboardingNav  <- OnboardingFundWallet lives here
 */
export function navigateFromOnboardingToBuyFlow(
  navigation: Pick<NavigationProp<ParamListBase>, 'getParent'>,
) {
  navigation.getParent()?.navigate(Routes.RAMP.TOKEN_SELECTION);
}
