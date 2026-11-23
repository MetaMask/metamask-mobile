import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../locales/i18n';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import { selectSelectedAccountGroupId } from '../../../selectors/multichainAccounts/accountTreeController';
import {
  ActionButtonType,
  ActionLocation,
  ActionPosition,
  trackActionButtonClick,
} from '../../../util/analytics/actionButtonTracking';
import type { IMetaMetricsEvent } from '../../../util/analytics/analytics.types';
import type { AnalyticsTrackingEvent } from '../../../util/analytics/AnalyticsEventBuilder';
import { AddressListViewedSource } from '../../../util/analytics/addressListViewedTracking';
import Logger from '../../../util/Logger';
import { navigateWithDetails } from '../../../util/navigation/navUtils';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { createAddressListNavigationDetails } from '../../Views/MultichainAccounts/AddressList';

/**
 * Opens the receiving address list from the wallet home onboarding fund step
 * (TMCU-1939 A/B treatment). Tracks `Action Button Clicked` with
 * `location: onboarding_checklist`; the address list reports the new
 * `onboarding_checklist` source via `Address List Viewed`.
 *
 * Navigation only: the fund step advances on a completed buy flow or a positive
 * balance, never from this press.
 */
export function useWalletHomeOnboardingChecklistReceivePress(): () => void {
  const navigation = useNavigation<AppNavigationProp>();
  const selectedAccountGroupId = useSelector(selectSelectedAccountGroupId);
  const analytics = useAnalytics();

  return useCallback(() => {
    if (!selectedAccountGroupId) {
      Logger.error(
        new Error(
          'WalletHomeOnboardingSteps::onReceive - Missing selectedAccountGroupId',
        ),
      );
      return;
    }

    // Wrapped rather than passing `analytics.trackEvent` / `createEventBuilder`
    // by reference, so no unbound method is handed to the helper.
    trackActionButtonClick(
      (event: AnalyticsTrackingEvent) => analytics.trackEvent(event),
      (event: IMetaMetricsEvent) => analytics.createEventBuilder(event),
      {
        action_name: ActionButtonType.RECEIVE,
        action_position: ActionPosition.FIRST_POSITION,
        button_label: strings('asset_overview.receive_button'),
        location: ActionLocation.ONBOARDING_CHECKLIST,
      },
    );

    navigateWithDetails(
      navigation,
      createAddressListNavigationDetails({
        groupId: selectedAccountGroupId,
        title: strings('multichain_accounts.address_list.receiving_address'),
        source: AddressListViewedSource.ONBOARDING_CHECKLIST,
      }),
    );
  }, [analytics, navigation, selectedAccountGroupId]);
}
