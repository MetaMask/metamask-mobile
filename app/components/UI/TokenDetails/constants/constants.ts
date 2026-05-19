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
  /** Explore Now tab — crypto movers pills */
  ExploreNowMovers = 'explore_now_movers',
  /** Explore Now tab — stocks list */
  ExploreNowStocks = 'explore_now_stocks',
  /** Explore Crypto tab — trending tokens list */
  ExploreCryptoTrending = 'explore_crypto_trending',
  /** Explore RWAs tab — stocks list */
  ExploreRwasStocks = 'explore_rwas_stocks',
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
 * Action types for "Token Details Action Tapped" event
 */
export enum TokenDetailsAction {
  Send = 'send',
  Receive = 'receive',
  MoreOpened = 'more_opened',
  RemoveToken = 'remove_token',
  ViewOnExplorer = 'view_on_explorer',
  CopyTokenAddress = 'copy_token_address',
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
