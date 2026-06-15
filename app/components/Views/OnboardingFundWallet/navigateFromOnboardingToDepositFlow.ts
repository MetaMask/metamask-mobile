import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import Routes from '../../../constants/navigation/Routes';

/**
 * Pushes the ramp/deposit flow onto the onboarding root stack so token
 * selection keeps OnboardingFundWallet in the back stack.
 */
export function navigateFromOnboardingToDepositFlow(
  navigation: Pick<NavigationProp<ParamListBase>, 'getParent'>,
  isRampsUnifiedV2Enabled: boolean,
) {
  const routeName = isRampsUnifiedV2Enabled
    ? Routes.RAMP.TOKEN_SELECTION
    : Routes.DEPOSIT.ID;

  navigation.getParent()?.navigate(routeName);
}
