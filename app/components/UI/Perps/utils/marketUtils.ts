/**
 * Market utilities for Perps components - Mobile UI layer
 *
 * Portable functions (pattern matching, display helpers, calculations)
 * live in '@metamask/perps-controller/utils/marketUtils'.
 *
 * This file contains mobile-only functions (badge types, icon URLs).
 */
import {
  HYPERLIQUID_ASSET_ICONS_BASE_URL,
  METAMASK_PERPS_ICONS_BASE_URL,
  type PerpsMarketData,
  type PerpsProviderType,
} from '@metamask/perps-controller';
import type { BadgeType } from '../components/PerpsBadge/PerpsBadge.types';

/**
 * Symbol the icon URL is built from.
 * Hyperliquid keeps the trading symbol so its CDN paths stay the same.
 * Any other venue uses `marketKey` when the row has one.
 */
export const resolvePerpsIconSymbol = (
  symbol: string,
  options?: {
    marketKey?: string;
    providerId?: PerpsProviderType | string;
  },
): string => {
  if (
    options?.providerId &&
    options.providerId !== 'hyperliquid' &&
    options.marketKey
  ) {
    return options.marketKey;
  }
  return symbol;
};

/**
 * Venue mark on a list row. Shared rows and a single selected provider
 * show no badge. A row that exists on one venue shows that venue.
 */
export const marketRowVenueBadgeProvider = (
  market: {
    providerId?: PerpsProviderType;
    venues?: readonly { providerId?: PerpsProviderType }[];
  },
  selectedProviderCount: number,
): PerpsProviderType | undefined => {
  if (selectedProviderCount < 2) {
    return undefined;
  }
  if (market.venues?.length !== 1) {
    return undefined;
  }
  return market.providerId;
};

/**
 * Per-row live prices. Offline and slow cellular skip them. A low-memory
 * device on a fast network also skips them. Unknown hardware or network
 * keeps the product default.
 */
export const shouldSubscribeToMarketRowPrices = (
  hardware: 'LOW' | 'MID' | 'HIGH' | null,
  network: 'NONE' | 'SLOW_CELLULAR' | 'FAST_CELLULAR' | 'WIFI' | null,
): boolean => {
  if (network === 'NONE' || network === 'SLOW_CELLULAR') {
    return false;
  }
  if (
    hardware === 'LOW' &&
    (network === 'WIFI' || network === 'FAST_CELLULAR')
  ) {
    return false;
  }
  return true;
};

/**
 * Determine badge type for a market based on its metadata
 * Prioritizes explicit marketType over generic experimental badge
 *
 * @param market - Market data object (only needs marketType and marketSource fields)
 * @returns Badge type to display, or undefined for no badge (main DEX)
 */
export const getMarketBadgeType = (
  market: Pick<PerpsMarketData, 'marketType' | 'marketSource'>,
): BadgeType | undefined =>
  market.marketType || (market.marketSource ? 'experimental' : undefined);

/**
 * Generate the appropriate icon URL for an asset symbol
 * Handles both regular assets and HIP-3 assets (dex:symbol format)
 *
 * @param symbol - Asset symbol (e.g., "BTC" or "xyz:TSLA")
 * @param kPrefixAssets - Optional set of assets that have a 'k' prefix to remove
 * @returns Icon URL for the asset
 */
export const getAssetIconUrl = (
  symbol: string,
  kPrefixAssets?: Set<string>,
  options?: {
    marketKey?: string;
    providerId?: PerpsProviderType | string;
  },
): string => {
  const lookup = resolvePerpsIconSymbol(symbol, options);
  if (!lookup) return '';

  if (lookup.includes(':')) {
    const [dex, assetSymbol] = lookup.split(':');
    return `${HYPERLIQUID_ASSET_ICONS_BASE_URL}${dex.toLowerCase()}:${assetSymbol.toUpperCase()}.svg`;
  }

  let processedSymbol = lookup.toUpperCase();

  if (kPrefixAssets?.has(processedSymbol)) {
    processedSymbol = processedSymbol.substring(1);
  }

  return `${HYPERLIQUID_ASSET_ICONS_BASE_URL}${processedSymbol}.svg`;
};

/**
 * Icon URLs with primary (MetaMask-hosted) and fallback (HyperLiquid) sources
 */
export interface AssetIconUrls {
  /** MetaMask contract-metadata repo (preferred source) */
  primary: string;
  /** HyperLiquid CDN (fallback source) */
  fallback: string;
}

/**
 * Generate icon URLs for an asset symbol with fallback support
 *
 * @param symbol - Asset symbol (e.g., "BTC" or "xyz:TSLA")
 * @param kPrefixAssets - Optional set of assets that have a 'k' prefix to remove
 * @returns Object with primary and fallback URLs, or null if no symbol
 */
export const getAssetIconUrls = (
  symbol: string,
  kPrefixAssets?: Set<string>,
  options?: {
    marketKey?: string;
    providerId?: PerpsProviderType | string;
  },
): AssetIconUrls | null => {
  const lookup = resolvePerpsIconSymbol(symbol, options);
  if (!lookup) return null;

  if (lookup.includes(':')) {
    const [dex, assetSymbol] = lookup.split(':');
    const hyperliquidFormat = `${dex.toLowerCase()}:${assetSymbol.toUpperCase()}`;
    const metamaskFormat = `hip3:${dex.toLowerCase()}_${assetSymbol.toUpperCase()}`;
    return {
      primary: `${METAMASK_PERPS_ICONS_BASE_URL}${metamaskFormat}.svg`,
      fallback: `${HYPERLIQUID_ASSET_ICONS_BASE_URL}${hyperliquidFormat}.svg`,
    };
  }

  let processedSymbol = lookup.toUpperCase();

  if (kPrefixAssets?.has(processedSymbol)) {
    processedSymbol = processedSymbol.substring(1);
  }

  return {
    primary: `${METAMASK_PERPS_ICONS_BASE_URL}${processedSymbol}.svg`,
    fallback: `${HYPERLIQUID_ASSET_ICONS_BASE_URL}${processedSymbol}.svg`,
  };
};

/** How many markets to offer as suggestions before watchlist exclusions. */
export const SUGGESTED_WATCHLIST_LIMIT = 5;

/** Maximum number of markets a user can add to their watchlist. */
export const WATCHLIST_LIMIT = 100;

/**
 * Returns suggested watchlist markets shown beneath the user's watchlist.
 *
 * Target count shrinks with the watchlist size so that watchlist + suggestions
 * always sums to `limit`, with a floor of one suggestion:
 * 0 watchlisted → limit suggestions
 * 1 watchlisted → limit - 1 suggestions
 * …
 *
 * limit+ watchlisted → 1 suggestion
 *
 * Returns [] only when every available market is already watchlisted.
 */
export const getSuggestedWatchlistMarkets = (
  markets: PerpsMarketData[],
  watchlistSymbols: string[],
  limit = SUGGESTED_WATCHLIST_LIMIT,
  isWatchlisted: (market: PerpsMarketData) => boolean = (market) =>
    watchlistSymbols.includes(market.symbol),
): PerpsMarketData[] => {
  const targetCount = Math.max(1, limit - watchlistSymbols.length);
  const nonWatchlisted = markets.filter((market) => !isWatchlisted(market));
  return nonWatchlisted.slice(0, targetCount);
};
