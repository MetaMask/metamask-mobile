"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sortMarkets = exports.parseVolume = void 0;
const perpsConfig_js_1 = require("../constants/perpsConfig.cjs");
const VOLUME_SUFFIX_REGEX = /\$?([\d.,]+)([KMBT])?/u;
const multipliers = {
    K: 1e3,
    M: 1e6,
    B: 1e9,
    T: 1e12,
};
const removeCommas = (str) => str.replace(/,/gu, '');
/**
 * Parse a formatted volume string (e.g., "$1.5M", "$2.3B") to a numeric value.
 * Extracted from hooks/usePerpsMarkets.ts for portability.
 *
 * @param volumeStr - The formatted volume string to parse.
 * @returns The numeric volume value, or -1 if unparseable.
 */
const parseVolume = (volumeStr) => {
    if (!volumeStr) {
        return -1;
    }
    if (volumeStr === perpsConfig_js_1.PERPS_CONSTANTS.FallbackPriceDisplay) {
        return -1;
    }
    if (volumeStr === '$<1') {
        return 0.5;
    }
    const suffixMatch = VOLUME_SUFFIX_REGEX.exec(volumeStr);
    if (suffixMatch) {
        const [, numberPart, suffix] = suffixMatch;
        const baseValue = Number.parseFloat(removeCommas(numberPart));
        if (Number.isNaN(baseValue)) {
            return -1;
        }
        return suffix ? baseValue * multipliers[suffix] : baseValue;
    }
    // Fallback: try to parse as plain number
    const cleaned = volumeStr.replace(/[$,]/gu, '');
    const parsed = Number.parseFloat(cleaned);
    return Number.isNaN(parsed) ? -1 : parsed;
};
exports.parseVolume = parseVolume;
/**
 * Sorts markets based on the specified criteria.
 *
 * @param options0 - The sorting configuration.
 * @param options0.markets - The array of market data to sort.
 * @param options0.sortBy - The field to sort by (volume, priceChange, fundingRate, or openInterest).
 * @param options0.direction - The sort direction (asc or desc).
 * @returns A new sorted array of market data.
 */
const sortMarkets = ({ markets, sortBy, direction = perpsConfig_js_1.MARKET_SORTING_CONFIG.DefaultDirection, }) => {
    const sortedMarkets = [...markets];
    sortedMarkets.sort((a, b) => {
        let compareValue = 0;
        switch (sortBy) {
            case perpsConfig_js_1.MARKET_SORTING_CONFIG.SortFields.Volume: {
                const volumeA = (0, exports.parseVolume)(a.volume);
                const volumeB = (0, exports.parseVolume)(b.volume);
                compareValue = volumeA - volumeB;
                break;
            }
            case perpsConfig_js_1.MARKET_SORTING_CONFIG.SortFields.PriceChange: {
                const changeA = parseFloat(a.change24hPercent?.replace(/[%+]/gu, '') || '0');
                const changeB = parseFloat(b.change24hPercent?.replace(/[%+]/gu, '') || '0');
                compareValue = changeA - changeB;
                break;
            }
            case perpsConfig_js_1.MARKET_SORTING_CONFIG.SortFields.FundingRate: {
                const fundingA = a.fundingRate ?? 0;
                const fundingB = b.fundingRate ?? 0;
                compareValue = fundingA - fundingB;
                break;
            }
            case perpsConfig_js_1.MARKET_SORTING_CONFIG.SortFields.OpenInterest: {
                const openInterestA = (0, exports.parseVolume)(a.openInterest);
                const openInterestB = (0, exports.parseVolume)(b.openInterest);
                compareValue = openInterestA - openInterestB;
                break;
            }
            default:
                break;
        }
        return direction === perpsConfig_js_1.MARKET_SORTING_CONFIG.DefaultDirection
            ? compareValue * -1
            : compareValue;
    });
    return sortedMarkets;
};
exports.sortMarkets = sortMarkets;
//# sourceMappingURL=sortMarkets.cjs.map