import type { CandleData, CandleStick } from '../types/perps-types';
import type { PerpsMarketData } from '../controllers/types';
import type { BadgeType } from '../components/PerpsBadge/PerpsBadge.types';
import {
  HYPERLIQUID_ASSET_ICONS_BASE_URL,
  HIP3_ASSET_ICONS_BASE_URL,
} from '../constants/hyperLiquidConfig';

/**
 * Maximum length for market filter patterns (prevents DoS attacks)
 */
const MAX_MARKET_PATTERN_LENGTH = 100;

/**
 * Pattern matcher type - either string (exact match) or RegExp (wildcard)
 */
export type MarketPatternMatcher = RegExp | string;

/**
 * Pre-compiled pattern with original pattern string and matcher
 */
export interface CompiledMarketPattern {
  pattern: string;
  matcher: MarketPatternMatcher;
}

/**
 * Escape special regex characters in a string
 * @param str - String to escape
 * @returns Escaped string safe for regex
 */
export const escapeRegex = (str: string): string =>
  str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Validate market filter pattern for safety
 * Prevents regex DoS attacks from malicious patterns
 *
 * @param pattern - Pattern to validate
 * @returns true if pattern is safe
 * @throws Error if pattern is unsafe
 *
 * @example Valid patterns
 * validateMarketPattern("BTC") // → true
 * validateMarketPattern("xyz:TSLA") // → true
 * validateMarketPattern("xyz:*") // → true
 *
 * @example Invalid patterns
 * validateMarketPattern("") // → throws Error
 * validateMarketPattern("xyz:.*") // → throws Error (regex chars)
 * validateMarketPattern("BTC#SCAM") // → throws Error (invalid char)
 */
export const validateMarketPattern = (pattern: string): boolean => {
  // Reject empty patterns
  if (!pattern || pattern.trim().length === 0) {
    throw new Error('Market pattern cannot be empty');
  }

  // Reject patterns that are too long (potential DoS)
  if (pattern.length > MAX_MARKET_PATTERN_LENGTH) {
    throw new Error(
      `Market pattern exceeds maximum length (${MAX_MARKET_PATTERN_LENGTH} chars): ${pattern}`,
    );
  }

  // Reject patterns with suspicious regex control characters
  // Allow only colon and asterisk for our pattern syntax
  const dangerousChars = /[\\()[\]{}^$+?.|]/;
  if (dangerousChars.test(pattern)) {
    throw new Error(
      `Market pattern contains invalid regex characters: ${pattern}`,
    );
  }

  // Allow only: alphanumeric, colon, hyphen, underscore, asterisk
  const validPattern = /^[a-zA-Z0-9:_\-*]+$/;
  if (!validPattern.test(pattern)) {
    throw new Error(`Market pattern contains invalid characters: ${pattern}`);
  }

  return true;
};

/**
 * Compile market filter pattern into optimized matcher
 * Supports wildcards ("xyz:*"), DEX shorthand ("xyz"), and exact matches ("xyz:TSLA")
 *
 * Note: Main DEX markets (no prefix) don't need filtering - they're always included.
 * Patterns without colons are treated as HIP-3 DEX shorthand.
 *
 * @param pattern - Pattern string (e.g., "xyz:*", "xyz:TSLA", "xyz")
 * @returns Compiled matcher (RegExp for wildcards/shorthand, string for exact match)
 *
 * @example Wildcard - matches all markets from a DEX
 * compileMarketPattern("xyz:*") // → /^xyz:/
 *
 * @example DEX shorthand - equivalent to wildcard
 * compileMarketPattern("xyz") // → /^xyz:/ (matches all xyz markets)
 *
 * @example Exact match - matches specific market
 * compileMarketPattern("xyz:TSLA") // → "xyz:TSLA"
 */
export const compileMarketPattern = (pattern: string): MarketPatternMatcher => {
  // Validate pattern before compilation to prevent regex DoS
  validateMarketPattern(pattern);

  if (pattern.endsWith(':*')) {
    // Wildcard: "xyz:*" → regex /^xyz:/
    const prefix = pattern.slice(0, -2);
    return new RegExp(`^${escapeRegex(prefix)}:`);
  }

  if (!pattern.includes(':')) {
    // DEX shorthand: "xyz" → regex /^xyz:/
    return new RegExp(`^${escapeRegex(pattern)}:`);
  }

  // Exact match: just use string (fastest)
  return pattern;
};

/**
 * Check if a symbol matches a compiled pattern matcher
 * @param symbol - Market symbol (e.g., "BTC", "xyz:TSLA")
 * @param matcher - Compiled matcher (string or RegExp)
 * @returns true if symbol matches the pattern
 */
export const matchesMarketPattern = (
  symbol: string,
  matcher: MarketPatternMatcher,
): boolean => {
  if (typeof matcher === 'string') {
    // Exact match - fastest
    return symbol === matcher;
  }

  // RegExp match - still very fast
  return matcher.test(symbol);
};

/**
 * Check if a market should be included based on HIP-3 master switch and whitelist/blacklist patterns
 * Main DEX markets (null dex) are ALWAYS included (no filtering)
 *
 * Logic: Check master switch → apply whitelist (if non-empty) → apply blacklist
 *
 * @param symbol - Market symbol (e.g., "BTC", "xyz:TSLA")
 * @param dex - DEX identifier (null for main DEX, "xyz" for HIP-3 DEX)
 * @param hip3Enabled - Master switch for HIP-3 markets (false = block all HIP-3)
 * @param compiledEnabledPatterns - Pre-compiled whitelist patterns (empty = allow all)
 * @param compiledBlockedPatterns - Pre-compiled blacklist patterns (empty = block none)
 * @returns true if market should be shown to users
 *
 * @example Main DEX market (always included)
 * shouldIncludeMarket("BTC", null, true, [...], [...]) // → true
 *
 * @example HIP-3 when master switch is OFF
 * shouldIncludeMarket("xyz:TSLA", "xyz", false, [...], [...]) // → false (HIP-3 disabled)
 *
 * @example HIP-3 with empty whitelist (discovery mode)
 * shouldIncludeMarket("xyz:TSLA", "xyz", true, [], []) // → true (allow all)
 *
 * @example HIP-3 with whitelist
 * shouldIncludeMarket("xyz:TSLA", "xyz", true,
 *   [{pattern: "xyz:*", matcher: /^xyz:/}], []) // → true (matches whitelist)
 *
 * @example HIP-3 with blacklist
 * shouldIncludeMarket("xyz:SCAM", "xyz", true, [],
 *   [{pattern: "xyz:SCAM", matcher: "xyz:SCAM"}]) // → false (blocked)
 */
export const shouldIncludeMarket = (
  symbol: string,
  dex: string | null,
  hip3Enabled: boolean,
  compiledEnabledPatterns: CompiledMarketPattern[],
  compiledBlockedPatterns: CompiledMarketPattern[],
): boolean => {
  // ALWAYS include main DEX markets (no filtering)
  if (dex === null) {
    return true;
  }

  // Enforce HIP-3 master switch: if disabled, block ALL HIP-3 markets
  if (!hip3Enabled) {
    return false;
  }

  // Step 1: Apply whitelist only if non-empty
  if (compiledEnabledPatterns.length > 0) {
    const whitelisted = compiledEnabledPatterns.some(({ matcher }) =>
      matchesMarketPattern(symbol, matcher),
    );
    if (!whitelisted) {
      return false;
    }
  }

  // Step 2: Apply blacklist ONLY if non-empty (early return optimization)
  if (compiledBlockedPatterns.length === 0) {
    return true; // No blacklist to check - accept immediately
  }

  // Only reach here if blacklist has values
  const blacklisted = compiledBlockedPatterns.some(({ matcher }) =>
    matchesMarketPattern(symbol, matcher),
  );

  return !blacklisted;
};

/**
 * Extract the display symbol from a full symbol string
 * Strips DEX prefix for HIP-3 markets (e.g., "xyz:XYZ100" -> "XYZ100")
 * Returns the symbol unchanged if no DEX prefix is present
 *
 * @param symbol - Full symbol (e.g., "BTC" or "xyz:XYZ100")
 * @returns Display symbol without DEX prefix (e.g., "BTC" or "XYZ100")
 */
export const getPerpsDisplaySymbol = (symbol: string): string => {
  if (!symbol || typeof symbol !== 'string') {
    return symbol;
  }

  // Check for DEX prefix pattern (dex:symbol)
  const colonIndex = symbol.indexOf(':');
  if (colonIndex > 0 && colonIndex < symbol.length - 1) {
    // Return everything after the colon
    return symbol.substring(colonIndex + 1);
  }

  // No DEX prefix found, return original symbol
  return symbol;
};

/**
 * Extract the DEX identifier from a full symbol string
 * Returns the DEX prefix for HIP-3 markets (e.g., "xyz:XYZ100" -> "xyz")
 * Returns null if no DEX prefix is present (main DEX market)
 *
 * @param symbol - Full symbol (e.g., "BTC" or "xyz:XYZ100")
 * @returns DEX identifier or null if main DEX (e.g., "xyz" or null)
 */
export const getPerpsDexFromSymbol = (symbol: string): string | null => {
  if (!symbol || typeof symbol !== 'string') {
    return null;
  }

  // Check for DEX prefix pattern (dex:symbol)
  const colonIndex = symbol.indexOf(':');
  if (colonIndex > 0 && colonIndex < symbol.length - 1) {
    // Return the DEX prefix (everything before the colon)
    return symbol.substring(0, colonIndex);
  }

  // No DEX prefix found, this is a main DEX market
  return null;
};

interface FundingCountdownParams {
  /**
   * Next funding time in milliseconds since epoch (optional, market-specific)
   */
  nextFundingTime?: number;
  /**
   * Funding interval in hours (optional, market-specific)
   * Default is 1 hour for HyperLiquid (funding is paid every hour)
   */
  fundingIntervalHours?: number;
}

/**
 * Calculate the time until the next funding period
 * Supports market-specific funding times when provided
 * Falls back to default HyperLiquid 1-hour periods (funding paid every hour)
 */
export const calculateFundingCountdown = (
  params?: FundingCountdownParams,
): string => {
  const now = new Date();
  const nowMs = now.getTime();

  // If we have a specific next funding time, check if it's reasonable for HyperLiquid's hourly funding
  if (params?.nextFundingTime && params.nextFundingTime > nowMs) {
    const msUntilFunding = params.nextFundingTime - nowMs;
    const hoursUntilFunding = msUntilFunding / (1000 * 60 * 60);

    // If API shows >1.1 hours, it's likely incorrect for HyperLiquid's hourly funding
    // Use fallback calculation instead to show time until next hour
    if (hoursUntilFunding <= 1.1) {
      const totalSeconds = Math.floor(msUntilFunding / 1000);

      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      // Format as HH:MM:SS
      const formattedHours = String(hours).padStart(2, '0');
      const formattedMinutes = String(minutes).padStart(2, '0');
      const formattedSeconds = String(seconds).padStart(2, '0');

      return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
    }
    // If >1.1 hours, fall through to use hourly calculation instead
  }

  // Fall back to default calculation for HyperLiquid (1-hour periods)
  // HyperLiquid pays funding every hour, so next funding is at the next hour
  const utcMinutes = now.getUTCMinutes();
  const utcSeconds = now.getUTCSeconds();

  // Calculate time remaining until next hour (next funding time)
  const minutesUntilNextHour = 59 - utcMinutes;
  const secondsUntilNextHour = 60 - utcSeconds;

  // Handle edge case where seconds equals 60
  const finalSeconds = secondsUntilNextHour === 60 ? 0 : secondsUntilNextHour;
  const finalMinutes =
    secondsUntilNextHour === 60
      ? minutesUntilNextHour + 1
      : minutesUntilNextHour;

  // For HyperLiquid 1-hour funding, hours should always be 0
  // (countdown should never exceed 59:59 since funding happens every hour)
  const finalHours = finalMinutes === 60 ? 1 : 0;
  const adjustedMinutes = finalMinutes === 60 ? 0 : finalMinutes;

  // Format as HH:MM:SS
  const formattedHours = String(finalHours).padStart(2, '0');
  const formattedMinutes = String(adjustedMinutes).padStart(2, '0');
  const formattedSeconds = String(finalSeconds).padStart(2, '0');

  return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
};

/**
 * Calculate 24h high and low from candlestick data
 */
export const calculate24hHighLow = (
  candleData: CandleData | null,
): { high: number; low: number } => {
  if (!candleData?.candles || candleData.candles.length === 0) {
    return { high: 0, low: 0 };
  }

  // Get candles from last 24 hours
  const now = Date.now();
  const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;

  let last24hCandles = candleData.candles.filter(
    (candle: CandleStick) => candle.time >= twentyFourHoursAgo,
  );

  if (last24hCandles.length === 0) {
    // If no 24h data, use all available candles
    last24hCandles = [...candleData.candles];
  }

  const highs = last24hCandles.map((candle: CandleStick) =>
    parseFloat(candle.high),
  );
  const lows = last24hCandles.map((candle: CandleStick) =>
    parseFloat(candle.low),
  );

  return {
    high: Math.max(...highs),
    low: Math.min(...lows),
  };
};

/**
 * Determine badge type for a market based on its metadata
 * Prioritizes explicit marketType over generic experimental badge
 *
 * @param market - Market data object (only needs marketType and marketSource fields)
 * @returns Badge type to display, or undefined for no badge (main DEX)
 *
 * @example Main DEX
 * getMarketBadgeType({ symbol: 'BTC', marketSource: null }) // → undefined
 *
 * @example Mapped HIP-3 DEX
 * getMarketBadgeType({ symbol: 'xyz:XYZ100', marketSource: 'xyz', marketType: 'equity' }) // → 'equity'
 *
 * @example Unmapped HIP-3 DEX
 * getMarketBadgeType({ symbol: 'abc:ABC100', marketSource: 'abc' }) // → 'experimental'
 */
export const getMarketBadgeType = (
  market: Pick<PerpsMarketData, 'marketType' | 'marketSource'>,
): BadgeType | undefined =>
  // Prioritize explicit marketType (e.g., 'equity' for xyz DEX)
  // Fall back to 'experimental' for unmapped HIP-3 DEXs
  // Main DEX markets without marketType show no badge
  market.marketType || (market.marketSource ? 'experimental' : undefined);

/**
 * Filter markets by search query
 * Searches through both symbol and name fields (case-insensitive)
 *
 * @param markets - Array of markets to filter
 * @param searchQuery - Search query string
 * @returns Filtered array of markets matching the query
 *
 * @example
 * filterMarketsByQuery([{ symbol: 'BTC', name: 'Bitcoin' }], 'btc') // → [{ symbol: 'BTC', name: 'Bitcoin' }]
 * filterMarketsByQuery([{ symbol: 'BTC', name: 'Bitcoin' }], 'coin') // → [{ symbol: 'BTC', name: 'Bitcoin' }]
 * filterMarketsByQuery([{ symbol: 'BTC', name: 'Bitcoin' }], '') // → [{ symbol: 'BTC', name: 'Bitcoin' }]
 */
export const filterMarketsByQuery = (
  markets: PerpsMarketData[],
  searchQuery: string,
): PerpsMarketData[] => {
  // Return all markets if query is empty
  if (!searchQuery?.trim()) {
    return markets;
  }

  const lowerQuery = searchQuery.toLowerCase().trim();

  return markets.filter(
    (market) =>
      market.symbol?.toLowerCase().includes(lowerQuery) ||
      market.name?.toLowerCase().includes(lowerQuery),
  );
};

/**
 * Generate the appropriate icon URL for an asset symbol
 * Handles both regular assets and HIP-3 assets (dex:symbol format)
 *
 * @param symbol - Asset symbol (e.g., "BTC" or "xyz:TSLA")
 * @param kPrefixAssets - Optional set of assets that have a 'k' prefix to remove
 * @returns Icon URL for the asset
 *
 * @example Regular asset
 * getAssetIconUrl('BTC') // → 'https://app.hyperliquid.xyz/coins/BTC.svg'
 *
 * @example HIP-3 asset
 * getAssetIconUrl('xyz:TSLA') // → 'https://raw.githubusercontent.com/.../hip3%3Axyz_TSLA.svg'
 *
 * @example With k-prefix handling
 * getAssetIconUrl('kBONK', new Set(['KBONK'])) // → 'https://app.hyperliquid.xyz/coins/BONK.svg'
 */
export const getAssetIconUrl = (
  symbol: string,
  kPrefixAssets?: Set<string>,
): string => {
  if (!symbol) return '';

  // Check for HIP-3 asset (contains colon) BEFORE uppercasing
  if (symbol.includes(':')) {
    const [dex, assetSymbol] = symbol.split(':');
    // Keep DEX lowercase, uppercase asset: xyz:XYZ100 -> xyz_XYZ100
    const hip3Symbol = `${dex.toLowerCase()}_${assetSymbol.toUpperCase()}`;
    return `${HIP3_ASSET_ICONS_BASE_URL}hip3%3A${hip3Symbol}.svg`;
  }

  // For regular assets, uppercase the entire symbol
  let processedSymbol = symbol.toUpperCase();

  // Remove 'k' prefix only for specific assets if provided
  if (kPrefixAssets?.has(processedSymbol)) {
    processedSymbol = processedSymbol.substring(1);
  }

  // Regular asset
  return `${HYPERLIQUID_ASSET_ICONS_BASE_URL}${processedSymbol}.svg`;
};
