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
  MarketCategory,
  type PerpsMarketData,
  type MarketTypeFilter,
} from '@metamask/perps-controller';
import type { BadgeType } from '../components/PerpsBadge/PerpsBadge.types';
import { isEquityAsset } from './marketHours';

/**
 * Resolve the category filter to pre-select in the market list for a given market.
 *
 * Maps the controller's `MarketCategory` data model onto the UI `MarketTypeFilter`
 * pills. Stock-like categories (stock, pre-ipo, index, etf) collapse to the single
 * 'stocks' pill, mirroring the filtering in `usePerpsMarketListView` so the
 * magnifying glass always lands on a pill that actually contains the market.
 *
 * @param market - Market data (only needs marketType and isNewMarket)
 * @returns The market type filter to apply
 */
export const getMarketTypeFilter = (
  market: Pick<PerpsMarketData, 'marketType' | 'isNewMarket'>,
): MarketTypeFilter => {
  if (isEquityAsset(market.marketType)) {
    return 'stocks';
  }
  if (market.marketType === MarketCategory.Commodity) {
    return 'commodities';
  }
  if (market.marketType === MarketCategory.Forex) {
    return 'forex';
  }
  if (market.isNewMarket) {
    return 'all';
  }
  return 'crypto';
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
