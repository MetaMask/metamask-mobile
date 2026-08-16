/**
 * Relevance tier for a market/query match. Lower values sort first.
 */
export var MarketMatchRank;
(function (MarketMatchRank) {
    MarketMatchRank[MarketMatchRank["Exact"] = 0] = "Exact";
    MarketMatchRank[MarketMatchRank["Prefix"] = 1] = "Prefix";
    MarketMatchRank[MarketMatchRank["Substring"] = 2] = "Substring";
})(MarketMatchRank || (MarketMatchRank = {}));
/**
 * Rank a single field value against a normalized query.
 *
 * @param value - Field value (e.g. symbol or name); may be undefined.
 * @param query - Already trimmed, lower-cased, non-empty query.
 * @returns The match tier, or null when the field does not match.
 */
function fieldRank(value, query) {
    if (!value) {
        return null;
    }
    const normalized = value.toLowerCase();
    if (normalized === query) {
        return MarketMatchRank.Exact;
    }
    if (normalized.startsWith(query)) {
        return MarketMatchRank.Prefix;
    }
    if (normalized.includes(query)) {
        return MarketMatchRank.Substring;
    }
    return null;
}
/**
 * Rank an array of keyword strings against a normalized query.
 * Returns the best (lowest) rank found across all keywords, or null.
 *
 * @param keywords - Array of keyword strings; may be undefined.
 * @param query - Already trimmed, lower-cased, non-empty query.
 * @returns The best match tier across all keywords, or null when none match.
 */
function keywordsRank(keywords, query) {
    if (!keywords || keywords.length === 0) {
        return null;
    }
    let best = null;
    for (const keyword of keywords) {
        const rank = fieldRank(keyword, query);
        if (rank === MarketMatchRank.Exact) {
            return rank;
        }
        if (rank !== null && (best === null || rank < best)) {
            best = rank;
        }
    }
    return best;
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
export function getMarketMatchRank(market, searchQuery) {
    if (!searchQuery?.trim()) {
        return null;
    }
    const query = searchQuery.toLowerCase().trim();
    const ranks = [
        fieldRank(market.symbol, query),
        fieldRank(market.name, query),
        keywordsRank(market.keywords, query),
    ].filter((rank) => rank !== null);
    return ranks.length > 0 ? Math.min(...ranks) : null;
}
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
export function rankMarketsByQuery(markets, searchQuery) {
    if (!searchQuery?.trim()) {
        return markets;
    }
    const query = searchQuery.toLowerCase().trim();
    const matches = [];
    markets.forEach((market) => {
        const rank = getMarketMatchRank(market, query);
        if (rank !== null) {
            matches.push({ market, rank });
        }
    });
    // Stable sort by rank only; Array.prototype.sort is stable in modern engines,
    // so equal-rank markets retain their original relative order.
    matches.sort((a, b) => a.rank - b.rank);
    return matches.map((match) => match.market);
}
//# sourceMappingURL=marketSearch.mjs.map