/**
 * Market utilities for Perps components.
 *
 * Portable functions (pattern matching, display helpers, calculations)
 * are re-exported from controllers. Mobile-only functions (badge types,
 * icon URLs) remain here.
 */
import type { PerpsMarketData } from '../controllers/types';
import type { BadgeType } from '../components/PerpsBadge/PerpsBadge.types';
import {
  HYPERLIQUID_ASSET_ICONS_BASE_URL,
  METAMASK_PERPS_ICONS_BASE_URL,
} from '../constants/hyperLiquidConfig';

// Re-export portable functions from controllers for backward compatibility
export {
  MAX_MARKET_PATTERN_LENGTH,
  type MarketPatternMatcher,
  type CompiledMarketPattern,
  escapeRegex,
  validateMarketPattern,
  compileMarketPattern,
  matchesMarketPattern,
  shouldIncludeMarket,
  getPerpsDisplaySymbol,
  getPerpsDexFromSymbol,
  calculateFundingCountdown,
  calculate24hHighLow,
  filterMarketsByQuery,
} from '../controllers/utils/marketUtils';

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
): string => {
  if (!symbol) return '';

  if (symbol.includes(':')) {
    const [dex, assetSymbol] = symbol.split(':');
    return `${HYPERLIQUID_ASSET_ICONS_BASE_URL}${dex.toLowerCase()}:${assetSymbol.toUpperCase()}.svg`;
  }

  let processedSymbol = symbol.toUpperCase();

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
): AssetIconUrls | null => {
  if (!symbol) return null;

  if (symbol.includes(':')) {
    const [dex, assetSymbol] = symbol.split(':');
    const hyperliquidFormat = `${dex.toLowerCase()}:${assetSymbol.toUpperCase()}`;
    const metamaskFormat = `hip3:${dex.toLowerCase()}_${assetSymbol.toUpperCase()}`;
    return {
      primary: `${METAMASK_PERPS_ICONS_BASE_URL}${metamaskFormat}.svg`,
      fallback: `${HYPERLIQUID_ASSET_ICONS_BASE_URL}${hyperliquidFormat}.svg`,
    };
  }

  let processedSymbol = symbol.toUpperCase();

  if (kPrefixAssets?.has(processedSymbol)) {
    processedSymbol = processedSymbol.substring(1);
  }

  return {
    primary: `${METAMASK_PERPS_ICONS_BASE_URL}${processedSymbol}.svg`,
    fallback: `${HYPERLIQUID_ASSET_ICONS_BASE_URL}${processedSymbol}.svg`,
  };
};
