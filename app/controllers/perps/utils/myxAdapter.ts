/**
 * MYX SDK Adapter Utilities
 *
 * Stage 1 adapters for transforming between MetaMask Perps API types and MYX SDK types.
 * Only includes adapters needed for market display and price fetching.
 *
 * Portable: no mobile-specific imports.
 * Formatters are injected via MarketDataFormatters interface (same pattern as marketDataTransform.ts).
 *
 * Key differences from HyperLiquid:
 * - Prices use 30 decimals
 * - Sizes use 18 decimals (vs HyperLiquid's szDecimals per asset)
 * - Multiple pools can exist per symbol (MPM model)
 * - USDT collateral (vs USDC)
 */

import { fromMYXPrice } from '../constants/myxConfig';
import type {
  MarketInfo,
  PerpsMarketData,
  MarketDataFormatters,
} from '../types';
import { MYX_HL_OVERLAPPING_MARKETS } from '../types/myx-types';
import type { MYXPoolSymbol, MYXTicker } from '../types/myx-types';

/**
 * Format a price change value with sign prefix.
 * Uses injected formatters (same pattern as marketDataTransform.ts formatChange).
 *
 * @param change - The price change value to format.
 * @param formatters - Injectable formatters for platform-agnostic formatting.
 * @returns The formatted change string with sign and dollar symbol.
 */
function formatChange(
  change: number,
  formatters: MarketDataFormatters,
): string {
  if (isNaN(change) || !isFinite(change)) {
    return '$0.00';
  }
  if (change === 0) {
    return '$0.00';
  }

  const formatted = formatters.formatPerpsFiat(Math.abs(change), {
    ranges: formatters.priceRangesUniversal,
  });

  const valueWithoutDollar = formatted.replace('$', '');
  return change > 0 ? `+$${valueWithoutDollar}` : `-$${valueWithoutDollar}`;
}

// ============================================================================
// Market Transformation
// ============================================================================

/**
 * Transform MYX Pool/Market info to MetaMask Perps API MarketInfo format
 *
 * @param pool - Pool symbol data from MYX SDK (PoolSymbolAllResponse)
 * @returns MetaMask Perps API market info object
 */
export function adaptMarketFromMYX(pool: MYXPoolSymbol): MarketInfo {
  // Extract base symbol from pool data
  const symbol = pool.baseSymbol || extractSymbolFromPoolId(pool.poolId);

  // MYX uses fixed 18 decimals for sizes
  const szDecimals = 18;

  // Default max leverage - MYX supports up to 100x on most markets
  // Will be refined when pool level config is fetched
  const maxLeverage = 100;

  return {
    name: symbol,
    szDecimals,
    maxLeverage,
    marginTableId: 0, // MYX doesn't use margin tables like HyperLiquid
    minimumOrderSize: 10, // MYX minimum order size is $10
    providerId: 'myx',
  };
}

/**
 * Convert MYX ticker data to price and change values
 *
 * @param ticker - Ticker data from MYX SDK
 * @returns Object with price string and 24h change percentage
 */
export function adaptPriceFromMYX(ticker: MYXTicker): {
  price: string;
  change24h: number;
} {
  // MYX ticker prices are in 30-decimal format
  const priceNum = fromMYXPrice(ticker.price);

  // Change is provided as a percentage string (e.g., "2.5" means 2.5%)
  const change24h = ticker.change ? parseFloat(ticker.change) : 0;

  return {
    price: priceNum.toString(),
    change24h,
  };
}

/**
 * Transform MYX pool and ticker to PerpsMarketData for UI display
 *
 * @param pool - Pool symbol data from MYX SDK
 * @param ticker - Optional ticker data for price info
 * @param formatters - Injectable formatters for platform-agnostic formatting
 * @returns Formatted market data for UI display
 */
export function adaptMarketDataFromMYX(
  pool: MYXPoolSymbol,
  ticker: MYXTicker | undefined,
  formatters: MarketDataFormatters,
): PerpsMarketData {
  const symbol = pool.baseSymbol || extractSymbolFromPoolId(pool.poolId);

  // Get price data from ticker if available
  let price = '0';
  let change24h = 0;
  let volume = '0';

  if (ticker) {
    const priceData = adaptPriceFromMYX(ticker);
    price = priceData.price;
    change24h = priceData.change24h;
    // Volume is already in USD (not 30-decimal format)
    volume = ticker.volume || '0';
  }

  // Format using injected formatters (consistent with HyperLiquid via marketDataTransform.ts)
  const priceNum = parseFloat(price);
  const formattedPrice = formatters.formatPerpsFiat(priceNum);
  const priceChange = priceNum * (change24h / 100);
  const formattedChange = formatChange(priceChange, formatters);
  const formattedChangePercent = formatters.formatPercentage(change24h);
  const formattedVolume = formatters.formatVolume(parseFloat(volume));

  return {
    symbol,
    name: getTokenName(symbol),
    maxLeverage: '100x', // MYX default
    price: formattedPrice,
    change24h: formattedChange,
    change24hPercent: formattedChangePercent,
    volume: formattedVolume,
    providerId: 'myx',
  };
}

// ============================================================================
// Market Filtering
// ============================================================================

/**
 * Filter MYX markets to only include MYX-exclusive markets
 * Removes markets that overlap with HyperLiquid
 *
 * @param pools - Array of MYX pool symbols
 * @returns Filtered array with only MYX-exclusive markets
 */
export function filterMYXExclusiveMarkets(
  pools: MYXPoolSymbol[],
): MYXPoolSymbol[] {
  return pools.filter((pool) => {
    const symbol = pool.baseSymbol || extractSymbolFromPoolId(pool.poolId);
    // Exclude markets that overlap with HyperLiquid
    return !MYX_HL_OVERLAPPING_MARKETS.includes(
      symbol as (typeof MYX_HL_OVERLAPPING_MARKETS)[number],
    );
  });
}

/**
 * Check if a symbol overlaps with HyperLiquid markets
 *
 * @param symbol - Market symbol to check
 * @returns true if the symbol is available on both MYX and HyperLiquid
 */
export function isOverlappingMarket(symbol: string): boolean {
  return MYX_HL_OVERLAPPING_MARKETS.includes(
    symbol as (typeof MYX_HL_OVERLAPPING_MARKETS)[number],
  );
}

// ============================================================================
// Pool ID Utilities
// ============================================================================

/**
 * Build a map of poolId to symbol for quick lookup
 *
 * @param pools - Array of MYX pool symbols
 * @returns Map of poolId to symbol
 */
export function buildPoolSymbolMap(
  pools: MYXPoolSymbol[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const pool of pools) {
    const symbol = pool.baseSymbol || extractSymbolFromPoolId(pool.poolId);
    map.set(pool.poolId, symbol);
  }
  return map;
}

/**
 * Build a map of symbol to poolIds (for multi-pool support)
 *
 * @param pools - Array of MYX pool symbols
 * @returns Map of symbol to array of poolIds
 */
export function buildSymbolPoolsMap(
  pools: MYXPoolSymbol[],
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const pool of pools) {
    const symbol = pool.baseSymbol || extractSymbolFromPoolId(pool.poolId);
    const existing = map.get(symbol) ?? [];
    existing.push(pool.poolId);
    map.set(symbol, existing);
  }
  return map;
}

/**
 * Extract symbol from pool ID
 * Pool IDs typically contain the symbol as a suffix or can be parsed
 *
 * @param poolId - MYX pool ID string
 * @returns Extracted symbol or poolId as fallback
 */
export function extractSymbolFromPoolId(poolId: string): string {
  // Pool IDs in MYX typically look like "0x..." hex addresses
  // The actual symbol comes from the pool's baseSymbol field
  // This is a fallback when baseSymbol is not available
  return poolId;
}

/**
 * Get full token name from symbol
 * Returns the symbol as name if not found (MYX-specific tokens)
 *
 * @param symbol - The market symbol to look up.
 * @returns The human-readable token name, or the symbol itself if not found.
 */
function getTokenName(symbol: string): string {
  const tokenNames: Record<string, string> = {
    BTC: 'Bitcoin',
    ETH: 'Ethereum',
    BNB: 'BNB',
    MYX: 'MYX Protocol',
    RHEA: 'Rhea Finance',
    PARTI: 'Particle Network',
    SKYAI: 'SkyAI',
    PUMP: 'PumpFun',
    WLFI: 'World Liberty Financial',
  };

  return tokenNames[symbol] || symbol;
}
