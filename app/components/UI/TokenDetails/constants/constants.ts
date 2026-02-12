import type { TokenI } from '../../Tokens/types';

/**
 * Source of navigation to Token Details page
 */
export enum TokenDetailsSource {
  /** Token list on main wallet screen (compact view) */
  MobileTokenList = 'mobile-token-list',
  /** Token list in full page view */
  MobileTokenListPage = 'mobile-token-list-page',
  /** Trending tokens section */
  Trending = 'trending',
  /** Swap/Bridge token selector */
  Swap = 'swap',
  /** Fallback when source cannot be determined */
  Unknown = 'unknown',
}

/**
 * Extended route params for Token Details page
 * Includes source tracking for analytics
 */
export interface TokenDetailsRouteParams extends TokenI {
  source?: TokenDetailsSource;
}
