import type { TokenI } from '../../Tokens/types';
import type { TokenSecurityData } from '@metamask/assets-controllers';
import type { TransactionActiveAbTestEntry } from '../../../../util/transactions/transaction-active-ab-test-attribution-registry';

/**
 * Source of navigation to Token Details page
 */
export enum TokenDetailsSource {
  /** Token list on main wallet screen (compact view) */
  MobileTokenList = 'mobile-token-list',
  /** Token list in full page view */
  MobileTokenListPage = 'mobile-token-list-page',
  /** Homepage section entry point */
  HomeSection = 'home_section',
  /** Trending tokens section (e.g. Explore tab) */
  Trending = 'trending',
  /** Trending tokens section on the Swaps / Bridge view */
  TrendingSwaps = 'trending-swaps',
  /** Dedicated homepage trending-tokens section (A/B treatment layout) */
  HomepageTrending = 'homepage-trending',
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
  securityData?: TokenSecurityData;
  /** Carried into swap / perps / predict flows for tx-scoped `active_ab_tests` */
  transactionActiveAbTests?: TransactionActiveAbTestEntry[];
}
