/**
 * Market search ranking (TAT-2413).
 *
 * Provisional, standalone helper layered on the same match semantics as
 * `filterMarketsByQuery` (case-insensitive substring on a market's ticker symbol
 * and human-readable name). It adds the one thing `filterMarketsByQuery` does
 * not: relevance ranking — exact matches first, then prefix, then substring;
 * ties keep their input order (stable). No fuzzy/phonetic matching (out of scope
 * for v1).
 *
 * Kept in its own file so it can be promoted or relocated later without touching
 * the shared `marketUtils`. A market matches here (rank !== null) iff
 * `filterMarketsByQuery` would include it, so the two stay behaviorally aligned.
 *
 * Portable: no platform-specific imports.
 */
import type { PerpsMarketData } from "../types/index.mjs";
/**
 * Relevance tier for a market/query match. Lower values sort first.
 */
export declare enum MarketMatchRank {
    Exact = 0,
    Prefix = 1,
    Substring = 2
}
/**
 * Compute the best (lowest) relevance rank for a market against a search query,
 * considering its ticker symbol, human-readable name, and optional keywords
 * from Terminal API metadata.
 *
 * @param market - Market to score (uses `symbol`, `name`, and optional `keywords`).
 * @param searchQuery - User search text (trimmed/cased internally).
 * @returns The match rank, or null when the market does not match (or the query
 * is empty/whitespace).
 */
export declare function getMarketMatchRank(market: Pick<PerpsMarketData, 'symbol' | 'name' | 'keywords'>, searchQuery: string): MarketMatchRank | null;
/**
 * Filter and rank markets by a search query, matching the human-readable name or
 * ticker symbol. Exact matches sort first, then prefix, then substring; markets
 * sharing a rank keep their input order (stable). An empty/whitespace query
 * returns the markets unchanged (no filtering), matching `filterMarketsByQuery`.
 *
 * @param markets - Markets to search.
 * @param searchQuery - User search text.
 * @returns Matching markets ordered by relevance.
 */
export declare function rankMarketsByQuery(markets: PerpsMarketData[], searchQuery: string): PerpsMarketData[];
//# sourceMappingURL=marketSearch.d.mts.map