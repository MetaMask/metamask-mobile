import type { MarketInfo, PerpsMarketData } from '../controllers/types';
import type { PerpDex } from '../types';

/**
 * Utility functions for HIP-3 (builder-deployed perpetuals) support
 */

/**
 * Check if a market is a HIP-3 (builder-deployed) perpetual
 * @param market - Market info or market data object
 * @returns True if the market is HIP-3
 */
export function isHip3Market(market: MarketInfo | PerpsMarketData): boolean {
  return market.isHip3 === true;
}

/**
 * Check if a market belongs to a specific HIP-3 DEX
 * @param market - Market info or market data object
 * @param dexName - Name of the HIP-3 DEX to check
 * @returns True if the market belongs to the specified DEX
 */
export function isMarketFromDex(
  market: MarketInfo | PerpsMarketData,
  dexName: string,
): boolean {
  return market.dexName === dexName;
}

/**
 * Get the deployer address for a HIP-3 market
 * @param market - Market info or market data object
 * @returns Deployer address or undefined if not a HIP-3 market
 */
export function getMarketDeployer(
  market: MarketInfo | PerpsMarketData,
): string | undefined {
  return market.deployer;
}

/**
 * Get the DEX name for a market
 * @param market - Market info or market data object
 * @returns DEX name or undefined if it's a validator-operated market
 */
export function getMarketDexName(
  market: MarketInfo | PerpsMarketData,
): string | undefined {
  return market.dexName;
}

/**
 * Filter markets to only HIP-3 markets
 * @param markets - Array of market info or market data
 * @returns Array of only HIP-3 markets
 */
export function filterHip3Markets<T extends MarketInfo | PerpsMarketData>(
  markets: T[],
): T[] {
  return markets.filter(isHip3Market);
}

/**
 * Filter markets to only validator-operated (non-HIP-3) markets
 * @param markets - Array of market info or market data
 * @returns Array of only validator-operated markets
 */
export function filterValidatorMarkets<T extends MarketInfo | PerpsMarketData>(
  markets: T[],
): T[] {
  return markets.filter((market) => !isHip3Market(market));
}

/**
 * Group markets by DEX name
 * @param markets - Array of market info or market data
 * @returns Map of DEX names to their markets (undefined key = validator-operated)
 */
export function groupMarketsByDex<T extends MarketInfo | PerpsMarketData>(
  markets: T[],
): Map<string | undefined, T[]> {
  const grouped = new Map<string | undefined, T[]>();

  markets.forEach((market) => {
    const dexName = market.dexName;
    if (!grouped.has(dexName)) {
      grouped.set(dexName, []);
    }
    grouped.get(dexName)?.push(market);
  });

  return grouped;
}

/**
 * Get unique HIP-3 DEX names from a list of markets
 * @param markets - Array of market info or market data
 * @returns Array of unique DEX names
 */
export function getUniqueDexNames<T extends MarketInfo | PerpsMarketData>(
  markets: T[],
): string[] {
  const dexNames = new Set<string>();

  markets.forEach((market) => {
    if (market.dexName) {
      dexNames.add(market.dexName);
    }
  });

  return Array.from(dexNames);
}

/**
 * Create a display name for a market, including HIP-3 DEX if applicable
 * @param market - Market info or market data object
 * @returns Display name (e.g., "BTC" or "xyz100 (DEX: test)")
 */
export function getMarketDisplayName(
  market: MarketInfo | PerpsMarketData,
): string {
  const symbol = 'symbol' in market ? market.symbol : market.name;

  if (market.dexName) {
    return `${symbol} (DEX: ${market.dexName})`;
  }

  return symbol;
}

/**
 * Create a badge label for HIP-3 markets
 * @param market - Market info or market data object
 * @returns Badge text (e.g., "HIP-3" or "HIP-3: test")
 */
export function getHip3BadgeText(
  market: MarketInfo | PerpsMarketData,
): string | undefined {
  if (!isHip3Market(market)) {
    return undefined;
  }

  if (market.dexName) {
    return `HIP-3: ${market.dexName}`;
  }

  return 'HIP-3';
}

/**
 * Format a PerpDex object for display
 * @param perpDex - PerpDex metadata
 * @returns Formatted display string
 */
export function formatPerpDexInfo(perpDex: PerpDex): string {
  return `${perpDex.full_name} (${
    perpDex.name
  }) - Deployer: ${perpDex.deployer.slice(0, 10)}...`;
}

/**
 * Check if a market should show a warning (e.g., for HIP-3 markets)
 * @param market - Market info or market data object
 * @returns True if a warning should be displayed
 */
export function shouldShowHip3Warning(
  market: MarketInfo | PerpsMarketData,
): boolean {
  return isHip3Market(market);
}

/**
 * Get HIP-3 warning message for a market
 * @param market - Market info or market data object
 * @returns Warning message or undefined if no warning needed
 */
export function getHip3WarningMessage(
  market: MarketInfo | PerpsMarketData,
): string | undefined {
  if (!isHip3Market(market)) {
    return undefined;
  }

  return 'This is a HIP-3 builder-deployed perpetual. These markets are operated by independent deployers and may have different risk profiles than validator-operated markets.';
}
