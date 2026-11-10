import type {
  TokenDetailsRouteParams,
  TokenDetailsVariant,
} from '../constants/constants';
import type { TdpVersion } from '../../../../util/analytics/analytics.types';

/**
 * Analytics `tdp_version` property value.
 *
 * Re-exported from the shared analytics types so Token Details call sites can
 * keep importing it from here, while the single source of truth lives in the
 * `util` layer (`app/util/analytics/analytics.types.ts`).
 */
export type { TdpVersion };

/** Analytics `token_category` property value. */
export type TdpTokenCategory = TokenDetailsVariant | 'standard';

/**
 * Shared Token Details page analytics properties attached to every TDP event.
 */
export interface TdpAnalyticsBase {
  tdp_version: TdpVersion;
  token_category: TdpTokenCategory;
  chain_id: TokenDetailsRouteParams['chainId'];
}

/**
 * Builds the base analytics properties shared by Token Details page events.
 *
 * `tdp_version` is `'v3'` whenever a `TokenDetailsVariant` is present (the new
 * page) and `'v2'` otherwise (the legacy page). `token_category` carries the
 * variant value (e.g. `'memecoin'`) on the new page and `'standard'` on the
 * legacy page.
 *
 * @param token - Token Details route params for the page.
 * @param variant - The resolved variant, or `null`/absent for the legacy page.
 * @returns The shared `tdp_version` / `token_category` / `chain_id` properties.
 */
export const getTdpAnalyticsBase = (
  token: TokenDetailsRouteParams,
  variant?: TokenDetailsVariant | null,
): TdpAnalyticsBase => ({
  tdp_version: variant ? 'v3' : 'v2',
  token_category: variant ?? 'standard',
  chain_id: token.chainId,
});
