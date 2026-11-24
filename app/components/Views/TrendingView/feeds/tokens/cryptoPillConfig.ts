import type { CaipChainId } from '@metamask/utils';
import { IconName } from '@metamask/design-system-react-native';
import { NetworkToCaipChainId } from '../../../../UI/NetworkMultiSelector/NetworkMultiSelector.constants';
import { MULTI_CHAIN_BASELINE_THRESHOLDS } from '../../../../UI/Trending/hooks/useTrendingRequest/useTrendingRequest';
import type { CryptoPillRequestParams } from './cryptoPillApi';
import type { ExploreSectionName } from '../../search/analytics';

export type CryptoPillKey =
  | 'watchlist'
  | 'trending'
  | 'gainers'
  | 'losers'
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
  iconOnly?: boolean;
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
  labelKey: 'perps.watchlist.filter_badge_label',
  sectionName: 'tokens_watchlist',
  minItems: 0,
  iconName: IconName.StarFilled,
  iconOnly: true,
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
      includeTokenSecurityData: true,
      usePriceApiData: true,
      includeRwaData: true,
    },
  },
  {
    key: 'gainers',
    labelKey: 'trending.perps_movers_pill_gainers',
    sectionName: 'tokens_gainers',
    minItems: 1,
    request: {
      path: '/v3/tokens/top-gainers',
      sort: 'h24_price_change_percentage_desc',
      minLiquidity: 100000,
      minVolume24hUsd: 100000,
      excludeLabels: ['stable_coin', 'blue_chip'],
      includeTokenSecurityData: true,
    },
  },
  {
    key: 'losers',
    labelKey: 'trending.perps_movers_pill_losers',
    sectionName: 'tokens_losers',
    minItems: 3,
    request: {
      path: '/v3/tokens/top-gainers',
      sort: 'h24_price_change_percentage_asc',
      minLiquidity: 50000,
      minVolume24hUsd: 25000,
      excludeLabels: ['stable_coin', 'blue_chip'],
      includeTokenSecurityData: true,
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
      includeTokenSecurityData: true,
    },
  },
];

/**
 * Chain pills appended after the token pills. Surfacing another chain
 * additionally requires extending CryptoPillKey, adding a `tokens_<key>`
 * member to ExploreSectionName, and adding the label under
 * `trending.crypto_pills` in en.json.
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
      includeTokenSecurityData: true,
      usePriceApiData: true,
      includeRwaData: true,
    },
    popularFallback: {
      path: '/v3/tokens/popular',
      sort: 'h24_volume_usd_desc',
      minLiquidity: 100000,
      minVolume24hUsd: 25000,
      excludeLabels: ['stable_coin'],
      includeTokenSecurityData: true,
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
