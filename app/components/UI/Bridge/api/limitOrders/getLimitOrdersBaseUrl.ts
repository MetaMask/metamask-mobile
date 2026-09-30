import { BRIDGE_API_BASE_URL } from '../../../../../constants/bridge';
import { store } from '../../../../../store';
import { selectBridgeLimitOrderBaseUrl } from '../../../../../selectors/bridge/featureFlags';

/**
 * Reads the limit orders API base URL from the `swapsLimitOrder` remote
 * feature flag, falling back to `BRIDGE_API_BASE_URL` when the flag carries no
 * `baseUrl`. Read on every request, outside React, so the requests made by
 * plain functions and by `LimitOrdersDataService` pick up flag changes.
 *
 * @returns The base URL, without a trailing slash.
 */
export const getLimitOrdersBaseUrl = (): string => {
  const baseUrl =
    selectBridgeLimitOrderBaseUrl(store.getState()) || BRIDGE_API_BASE_URL;

  return baseUrl.replace(/\/+$/, '');
};
