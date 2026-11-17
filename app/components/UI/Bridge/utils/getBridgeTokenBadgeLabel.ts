import type { BridgeToken } from '../types';
import { isStockRwaBridgeToken } from './isStockRwaBridgeToken';

const STOCK_BADGE_LABEL = 'Stock';

/**
 * Badge label to show next to a token in the Bridge token selector.
 * Prefers the API-provided `badgeLabel`; falls back to "Stock" for stock RWA tokens
 * that come from sources without `badgeLabel` (e.g. wallet balances).
 *
 * @param token - The token to resolve a badge label for.
 * @param isRwaFeatureEnabled - Whether the RWA feature flag is enabled.
 * @returns The badge label, or `undefined` when no badge should be shown.
 */
export function getBridgeTokenBadgeLabel(
  token: BridgeToken,
  isRwaFeatureEnabled: boolean,
): string | undefined {
  if (!isRwaFeatureEnabled) {
    return undefined;
  }
  if (token.badgeLabel?.trim()) {
    return token.badgeLabel;
  }
  return isStockRwaBridgeToken(token, isRwaFeatureEnabled)
    ? STOCK_BADGE_LABEL
    : undefined;
}
