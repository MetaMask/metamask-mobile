import logger from './logger';
import { analytics } from '../../../util/analytics/analytics';

// TODO: Replace this file with `@metamask/analytics` once its `Analytics`
// class supports the `mobile/sdk-connect-v2` namespace. Currently
// `Analytics.track()` is hard-typed to `MMConnectPayload` (namespace
// `metamask/connect`). The upstream work is tracked in:
// https://consensyssoftware.atlassian.net/browse/WAPI-1350

const V2_ANALYTICS_ENDPOINT =
  'https://mm-sdk-analytics.api.cx.metamask.io/v2/events';

/**
 * Event names defined in the `mobile/sdk-connect-v2` namespace of the
 * analytics OpenAPI schema. Only the connection-lifecycle subset is
 * listed here; action-level events can be added later.
 */
export type WalletConnectionEventName =
  | 'wallet_connection_request_received'
  | 'wallet_connection_request_failed';

export interface WalletEventProperties {
  anon_id: string;
  platform: 'mobile';
  sdk_version?: string;
  sdk_platform?: string;
  /** Only set on reconnect (handleSimpleDeeplink) flows. */
  found_in_store?: boolean;
}

interface MobileSDKConnectV2Payload {
  namespace: 'mobile/sdk-connect-v2';
  event_name: WalletConnectionEventName;
  properties: WalletEventProperties;
}

/**
 * Fire-and-forget POST to the V2 analytics relay.
 * Mirrors the dapp-side `@metamask/analytics` package format so both
 * sides land in the same Segment dataset and can be joined on `anon_id`.
 */
export function trackWalletEvent(
  eventName: WalletConnectionEventName,
  properties: WalletEventProperties,
): void {
  if (!analytics.isEnabled()) return;

  const payload: MobileSDKConnectV2Payload[] = [
    {
      namespace: 'mobile/sdk-connect-v2',
      event_name: eventName,
      properties,
    },
  ];

  fetch(V2_ANALYTICS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch((err) => {
    logger.error('v2-analytics: failed to send event', eventName, err);
  });
}
