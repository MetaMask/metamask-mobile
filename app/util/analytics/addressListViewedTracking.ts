import { InternalAccount } from '@metamask/keyring-internal-api';
import { MetaMetricsEvents } from '../../core/Analytics';
import { getQrCodeViewedAccountType } from './qrCodeViewedTracking';
import { IMetaMetricsEvent, JsonMap } from './analytics.types';

export const AddressListViewedSource = {
  COPY_BUTTON: 'copy_button',
  RECEIVE_BUTTON: 'receive_button',
  ACCOUNT_DETAILS: 'account_details',
  ACCOUNT_ACTIONS: 'account_actions',
} as const;

export type AddressListViewedSourceValue =
  (typeof AddressListViewedSource)[keyof typeof AddressListViewedSource];

/**
 * Properties for Address List Viewed tracking.
 *
 * @property source - Entry point that opened the address list
 * @property account_type - Account type from getAddressListViewedAccountType
 */
export interface AddressListViewedProperties extends JsonMap {
  source: string;
  account_type: string;
}

type AddressListViewedEventFactory<TEvent> = (event: IMetaMetricsEvent) => {
  addProperties: (properties: AddressListViewedProperties) => {
    build: () => TEvent;
  };
};

/**
 * Resolve account_type for Address List Viewed from the account group's accounts.
 *
 * @param accounts - Internal accounts in the address list group
 * @returns Account type string for analytics
 */
export const getAddressListViewedAccountType = (
  accounts: InternalAccount[],
): string => {
  const firstAccount = accounts[0];
  if (!firstAccount) {
    return 'MetaMask';
  }

  return getQrCodeViewedAccountType(firstAccount);
};

/**
 * Track Address List Viewed with the mobile analytics schema.
 *
 * @param trackEvent - trackEvent function from useAnalytics
 * @param createEventBuilder - createEventBuilder function from AnalyticsEventBuilder
 * @param properties - Address list view properties
 */
export const trackAddressListViewed = <TEvent>(
  trackEvent: (event: TEvent) => void,
  createEventBuilder: AddressListViewedEventFactory<TEvent>,
  properties: AddressListViewedProperties,
): void => {
  trackEvent(
    createEventBuilder(MetaMetricsEvents.ADDRESS_LIST_VIEWED)
      .addProperties(properties)
      .build(),
  );
};
