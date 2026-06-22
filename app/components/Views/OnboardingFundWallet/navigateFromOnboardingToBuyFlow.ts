import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import Routes from '../../../constants/navigation/Routes';

/**
 * Opens the unified Ramp buy flow on the onboarding root stack so
 * OnboardingFundWallet stays in the back stack.
 *
 * The "More ways to fund" methods (PayPal, Google Pay, Revolut, etc.) are not
 * returned by the Deposit SDK — they live in the Aggregator. There is no clean
 * way to pre-select an Aggregator payment method via navigation (`RampIntent`
 * only carries asset/amount/currency), so we drop the user into the buy flow
 * where the full, region-eligible set of providers/methods is presented.
 *
 * Note: the onboarding root navigator (see `OnboardingRootNav` in
 * `components/Nav/App`) only registers `RAMP.TOKEN_SELECTION` and `DEPOSIT.ID`
 * — `RAMP.BUY` lives in the main app navigator and is NOT reachable here, so
 * navigating to it would silently no-op. `TOKEN_SELECTION` is the registered
 * token-first entry into the unified buy flow.
 */
export function navigateFromOnboardingToBuyFlow(
  navigation: Pick<NavigationProp<ParamListBase>, 'getParent'>,
) {
  navigation.getParent()?.navigate(Routes.RAMP.TOKEN_SELECTION);
}
