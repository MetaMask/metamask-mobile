import type { PerpsMarketData, SortDirection, SortField } from "../types/index.mjs";
export type SortMarketsParams = {
    markets: PerpsMarketData[];
    sortBy: SortField;
    direction?: SortDirection;
};
/**
 * Parse a formatted volume string (e.g., "$1.5M", "$2.3B") to a numeric value.
 * Extracted from hooks/usePerpsMarkets.ts for portability.
 *
 * @param volumeStr - The formatted volume string to parse.
 * @returns The numeric volume value, or -1 if unparseable.
 */
export declare const parseVolume: (volumeStr: string | undefined) => number;
/**
 * Sorts markets based on the specified criteria.
 *
 * @param options0 - The sorting configuration.
 * @param options0.markets - The array of market data to sort.
 * @param options0.sortBy - The field to sort by (volume, priceChange, fundingRate, or openInterest).
 * @param options0.direction - The sort direction (asc or desc).
 * @returns A new sorted array of market data.
 */
export declare const sortMarkets: ({ markets, sortBy, direction, }: SortMarketsParams) => PerpsMarketData[];
//# sourceMappingURL=sortMarkets.d.mts.map