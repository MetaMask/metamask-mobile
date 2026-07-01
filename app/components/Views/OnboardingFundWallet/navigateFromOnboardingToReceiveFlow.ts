import type { AccountGroupId } from '@metamask/account-api';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import Routes from '../../../constants/navigation/Routes';

export interface OnboardingReceiveFlowParams {
  groupId: AccountGroupId;
}

/**
 * Opens the Ramp token selection in receive mode. After the user picks a
 * token, TokenSelection navigates to the OnboardingReceiveQR screen with
 * the address for that token's chain.
 *
 * Navigator hierarchy:
 * OnboardingRootNav  <- getParent() lands here
 * └ OnboardingNav    <- OnboardingFundWallet lives here
 */
export function navigateFromOnboardingToReceiveFlow(
  navigation: Pick<NavigationProp<ParamListBase>, 'getParent'>,
  params: OnboardingReceiveFlowParams,
) {
  navigation.getParent()?.navigate(Routes.RAMP.TOKEN_SELECTION, {
    receiveMode: true,
    groupId: params.groupId,
  });
}
