import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import Routes from '../../../constants/navigation/Routes';

/**
 * Opens the unified Ramp buy flow from the onboarding stack, skipping
 * Token Selection and landing directly on the BuildQuote (amount input) screen.
 *
 * The default token and provider are already seeded into RampsController state
 * by OnboardingFundWallet's useEffect, so BuildQuote picks them up
 * automatically.
 *
 * Navigator hierarchy:
 * OnboardingRootNav  <- getParent() lands here; TOKEN_SELECTION registered here
 * └── OnboardingNav  <- OnboardingFundWallet lives here
 *
 * TOKEN_SELECTION (TokenListRoutes)
 * └ TOKEN_SELECTION_ROOT (MainRoutes)
 * └ AMOUNT_INPUT (BuildQuote) <- we navigate directly here
 */
export function navigateFromOnboardingToBuyFlow(
  navigation: Pick<NavigationProp<ParamListBase>, 'getParent'>,
) {
  navigation.getParent()?.navigate(Routes.RAMP.TOKEN_SELECTION, {
    screen: Routes.RAMP.TOKEN_SELECTION_ROOT,
    params: {
      screen: Routes.RAMP.AMOUNT_INPUT,
    },
  });
}
