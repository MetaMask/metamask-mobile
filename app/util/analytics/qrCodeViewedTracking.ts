import { InternalAccount } from '@metamask/keyring-internal-api';
import { isCaipAccountId } from '@metamask/utils';
import { MetaMetricsEvents } from '../../core/Analytics';
import { getAddressAccountType, isValidHexAddress } from '../address';
import { IMetaMetricsEvent, JsonMap } from './analytics.types';

/**
 * Resolve account_type for QR Code Viewed without crashing on non-EVM addresses.
 * Prefers getAddressAccountType for hex/CAIP account IDs; falls back to keyring metadata.
 *
 * @param account - Internal account shown in the QR sheet
 * @returns Account type string for analytics
 */
export const getQrCodeViewedAccountType = (
  account: InternalAccount,
): string => {
  const keyringType = account.metadata?.keyring?.type ?? 'MetaMask';

  if (isValidHexAddress(account.address) || isCaipAccountId(account.address)) {
    try {
      return getAddressAccountType(account.address);
    } catch {
      return keyringType;
    }
  }

  return keyringType;
};

/**
 * Properties for QR Code Viewed tracking.
 *
 * @property location - Entry point in kebab-case (e.g. address-list)
 * @property account_type - Account type from getQrCodeViewedAccountType
 * @property chain_id_caip - Optional CAIP-2 chain ID when a specific chain is shown
 */
export interface QrCodeViewedProperties extends JsonMap {
  location: string;
  account_type: string;
  chain_id_caip?: string;
}

type QrCodeViewedEventFactory<TEvent> = (event: IMetaMetricsEvent) => {
  addProperties: (properties: QrCodeViewedProperties) => {
    build: () => TEvent;
  };
};

/**
 * Track QR Code Viewed with the mobile analytics schema.
 *
 * @param trackEvent - trackEvent function from useAnalytics
 * @param createEventBuilder - createEventBuilder function from AnalyticsEventBuilder
 * @param properties - QR code view properties
 */
export const trackQrCodeViewed = <TEvent>(
  trackEvent: (event: TEvent) => void,
  createEventBuilder: QrCodeViewedEventFactory<TEvent>,
  properties: QrCodeViewedProperties,
): void => {
  const { location, account_type, chain_id_caip } = properties;

  trackEvent(
    createEventBuilder(MetaMetricsEvents.QR_CODE_VIEWED)
      .addProperties({
        location,
        account_type,
        ...(chain_id_caip !== undefined && { chain_id_caip }),
      })
      .build(),
  );
};
