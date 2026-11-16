import type { CaipChainId } from '@metamask/utils';
import { IconName } from '@metamask/design-system-react-native';
import { NetworkToCaipChainId } from '../../../../UI/NetworkMultiSelector/NetworkMultiSelector.constants';
import { MULTI_CHAIN_BASELINE_THRESHOLDS } from '../../../../UI/Trending/hooks/useTrendingRequest/useTrendingRequest';
import type { CryptoPillRequestParams } from './cryptoPillApi';
import type { ExploreSectionName } from '../../search/analytics';

export type CryptoPillKey =
  | 'watchlist'
  | 'trending'
  | 'top_gainers'
  | 'top_losers'
  | 'most_traded'
  | 'robinhood';

export type CryptoChainPillKey = Extract<CryptoPillKey, 'robinhood'>;

/** Definition for a pill rendered in the Explore crypto pill row. */
export interface CryptoPillDefinition {
  key: CryptoPillKey;
  labelKey: string;
  sectionName: ExploreSectionName;
  /** Minimum filtered items for the pill to stay visible once loaded. */
  minItems: number;
  /** Optional leading pill icon. */
  iconName?: IconName;
  /** Token API request; omitted for the watchlist pill. */
  request?: CryptoPillRequestParams;
}

/**
 * Chain-scoped pill. `trending` is the primary request scoped to the pill's
 * chain; when it returns no tokens, `popularFallback` is used instead.
 */
export interface CryptoChainPillDefinition {
  key: CryptoChainPillKey;
  chainId: CaipChainId;
  labelKey: string;
  sectionName: ExploreSectionName;
  trending: CryptoPillRequestParams;
  popularFallback: CryptoPillRequestParams;
}

export const CRYPTO_WATCHLIST_PILL: CryptoPillDefinition = {
  key: 'watchlist',
  labelKey: 'trending.crypto_pills.watchlist',
  sectionName: 'tokens_watchlist',
  minItems: 0,
  iconName: IconName.StarFilled,
};

export const CRYPTO_TOKEN_PILLS: readonly CryptoPillDefinition[] = [
  {
    key: 'trending',
    labelKey: 'trending.crypto_pills.trending',
    sectionName: 'tokens_trending',
    minItems: 1,
    request: {
      path: '/v3/tokens/trending',
      sort: 'h24_trending',
      minLiquidity: MULTI_CHAIN_BASELINE_THRESHOLDS.minLiquidity,
      minVolume24hUsd: MULTI_CHAIN_BASELINE_THRESHOLDS.minVolume24h,
      excludeLabels: ['stable_coin', 'blue_chip'],
    },
  },
  {
    key: 'top_gainers',
    labelKey: 'trending.crypto_pills.top_gainers',
    sectionName: 'tokens_top_gainers',
    minItems: 1,
    request: {
      path: '/v3/tokens/top-gainers',
      sort: 'h24_price_change_percentage_desc',
      minLiquidity: 100000,
      minVolume24hUsd: 100000,
      excludeLabels: ['stable_coin', 'blue_chip'],
    },
  },
  {
    key: 'top_losers',
    labelKey: 'trending.crypto_pills.top_losers',
    sectionName: 'tokens_top_losers',
    minItems: 3,
    request: {
      path: '/v3/tokens/top-gainers',
      sort: 'h24_price_change_percentage_asc',
      minLiquidity: 50000,
      minVolume24hUsd: 25000,
      excludeLabels: ['stable_coin', 'blue_chip'],
    },
  },
  {
    key: 'most_traded',
    labelKey: 'trending.crypto_pills.most_traded',
    sectionName: 'tokens_most_traded',
    minItems: 1,
    request: {
      path: '/v3/tokens/popular',
      sort: 'h24_volume_usd_desc',
      minLiquidity: 100000,
      minVolume24hUsd: 100000,
      excludeLabels: ['stable_coin'],
    },
  },
];

/**
 * Chain pills appended after the token pills. Adding an entry here is the
 * only change needed to surface another chain.
 */
export const CRYPTO_CHAIN_PILLS: readonly CryptoChainPillDefinition[] = [
  {
    key: 'robinhood',
    chainId: NetworkToCaipChainId.ROBINHOOD,
    labelKey: 'trending.crypto_pills.robinhood',
    sectionName: 'tokens_robinhood',
    trending: {
      path: '/v3/tokens/trending',
      sort: 'h24_trending',
      minLiquidity: 100000,
      minVolume24hUsd: 25000,
    },
    popularFallback: {
      path: '/v3/tokens/popular',
      sort: 'h24_volume_usd_desc',
      minLiquidity: 100000,
      minVolume24hUsd: 25000,
      excludeLabels: ['stable_coin'],
    },
  },
];

/** Ordered pill definitions for the UI; the watchlist pill is flag-gated. */
export const getCryptoPillOrder = (
  isWatchlistEnabled: boolean,
): readonly CryptoPillDefinition[] => [
  ...(isWatchlistEnabled ? [CRYPTO_WATCHLIST_PILL] : []),
  ...CRYPTO_TOKEN_PILLS,
  ...CRYPTO_CHAIN_PILLS.map(
    ({ key, labelKey, sectionName }): CryptoPillDefinition => ({
      key,
      labelKey,
      sectionName,
      minItems: 1,
    }),
  ),
];
