import { BRIDGE_API_BASE_URL } from '../../../../constants/bridge';
import { selectBridgeRecurringBuyBaseUrl } from '../../../../selectors/bridge/featureFlags';
import { store } from '../../../../store';

/**
 * Reads the recurring orders API base URL from the `swapsRecurringBuy` remote
 * feature flag, falling back to `BRIDGE_API_BASE_URL` when the flag carries no
 * `baseUrl`. Read on every request so recurring order requests pick up flag
 * changes.
 *
 * @returns The base URL, without a trailing slash.
 */
export const getRecurringOrdersBaseUrl = (): string => {
  const baseUrl =
    selectBridgeRecurringBuyBaseUrl(store.getState()) || BRIDGE_API_BASE_URL;

  return baseUrl.replace(/\/+$/, '');
};
