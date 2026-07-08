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
  /** Explore omni-search result tap */
  ExploreSearch = 'explore_search',
  /** Trending tokens section on the Swaps / Bridge view */
  TrendingSwaps = 'trending-swaps',
  /** Swap discovery feed — hot tokens / movers pills */
  MoversSwaps = 'movers-swaps',
  /** Swap discovery feed — stocks section */
  RwasStocksSwaps = 'rwas_stocks-swaps',
  /** Dedicated homepage trending-tokens section (A/B treatment layout) */
  HomepageTrending = 'homepage-trending',
  /** Swap/Bridge token selector */
  Swap = 'swap',
  /** Price alert notification deeplink */
  PriceAlertNotification = 'price_alert_notification',
  /** Fallback when source cannot be determined */
  Unknown = 'unknown',
}

const EXPLORE_TOKEN_DETAILS_SOURCES = new Set<TokenDetailsSource>([
  TokenDetailsSource.ExploreNowMovers,
  TokenDetailsSource.ExploreNowStocks,
  TokenDetailsSource.ExploreCryptoTrending,
  TokenDetailsSource.ExploreRwasStocks,
  TokenDetailsSource.ExploreSearch,
  TokenDetailsSource.Trending,
]);

/**
 * Whether Token Details was opened from the Explore tab (or Explore search).
 * Used to attribute swap/bridge sessions as Trending Explore instead of Token View.
 */
export const isExploreTokenDetailsSource = (
  source?: TokenDetailsSource,
): boolean => Boolean(source && EXPLORE_TOKEN_DETAILS_SOURCES.has(source));

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

/**
 * Exit actions tracked by TOKEN_DETAILS_CLOSED event.
 */
export type TokenDetailsExitAction =
  | 'back_navigation'
  | 'cta_clicked'
  | 'app_backgrounded';

/**
 * Technical indicators that occupy a sub-pane below the main chart.
 * Keep in sync with SUB_PANE_INDICATOR_NAMES in chartLogic.js.
 */
export const SUB_PANE_INDICATORS = ['MACD', 'RSI'] as const;
