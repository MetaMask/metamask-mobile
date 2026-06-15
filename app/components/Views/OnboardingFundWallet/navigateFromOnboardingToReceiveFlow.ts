import type { AccountGroupId } from '@metamask/account-api';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import { AddressListViewedSource } from '../../../util/analytics/addressListViewedTracking';

export interface OnboardingReceiveFlowParams {
  groupId: AccountGroupId;
}

/**
 * Pushes the wallet receive flow (AddressList → ShareAddressQR) onto the
 * onboarding root stack so OnboardingFundWallet stays in the back stack.
 */
export function navigateFromOnboardingToReceiveFlow(
  navigation: Pick<NavigationProp<ParamListBase>, 'getParent'>,
  params: OnboardingReceiveFlowParams,
) {
  navigation.getParent()?.navigate(Routes.MULTICHAIN_ACCOUNTS.ADDRESS_LIST, {
    groupId: params.groupId,
    title: strings('multichain_accounts.address_list.receiving_address'),
    source: AddressListViewedSource.RECEIVE_BUTTON,
  });
}
