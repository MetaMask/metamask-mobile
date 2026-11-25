import type { AccountGroupId } from '@metamask/account-api';
import { strings } from '../../../../../locales/i18n';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import type { AddressListViewedSource } from '../../../../util/analytics/addressListViewedTracking';
import Logger from '../../../../util/Logger';
import { navigateWithDetails } from '../../../../util/navigation/navUtils';
import { createAddressListNavigationDetails } from './AddressList';

type AddressListViewedSourceValue =
  (typeof AddressListViewedSource)[keyof typeof AddressListViewedSource];

interface NavigateToReceiveAddressListParams {
  navigation: AppNavigationProp;
  /** Selected account group. Navigation is skipped (and logged) when missing. */
  groupId: AccountGroupId | null | undefined;
  /** Reported by `Address List Viewed` so each entry point stays attributable. */
  source: AddressListViewedSourceValue;
  /** Prefix for the error logged when `groupId` is missing, e.g. `Wallet::onReceive`. */
  caller: string;
}

/**
 * Opens the receiving address list for the selected account group.
 * Navigation only: callers own any `Action Button Clicked` tracking.
 *
 * @returns `true` when navigation was triggered, `false` when `groupId` is missing.
 */
export function navigateToReceiveAddressList({
  navigation,
  groupId,
  source,
  caller,
}: NavigateToReceiveAddressListParams): boolean {
  if (!groupId) {
    Logger.error(new Error(`${caller} - Missing selectedAccountGroupId`));
    return false;
  }

  navigateWithDetails(
    navigation,
    createAddressListNavigationDetails({
      groupId,
      title: strings('multichain_accounts.address_list.receiving_address'),
      source,
    }),
  );
  return true;
}
