import type { BridgeToken } from '../types';

/**
 * Whether the token is a stock-class RWA asset and the RWA feature is enabled.
 * Same rule as {@link useRWAToken} `isStockToken`, for use outside React (e.g. Redux selectors).
 */
export function isStockRwaBridgeToken(
  token: BridgeToken | undefined,
  isRwaFeatureEnabled: boolean,
): boolean {
  if (!isRwaFeatureEnabled) {
    return false;
  }
  return token?.rwaData?.instrumentType === 'stock';
}
