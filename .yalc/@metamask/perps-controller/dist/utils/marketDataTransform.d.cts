import type { AllMidsResponse, PerpsUniverse, PerpsAssetCtx, PredictedFunding } from "../types/hyperliquid-types.cjs";
import type { PerpsMarketData, MarketType, MarketDataFormatters } from "../types/index.cjs";
/**
 * Calculate open interest in USD
 * Open interest from HyperLiquid is in contracts/units, not USD
 * To get USD value, multiply by current price
 *
 * @param openInterest - Raw open interest value in contracts/units
 * @param currentPrice - Current price of the asset
 * @returns Open interest in USD, or NaN if invalid
 */
export declare function calculateOpenInterestUSD(openInterest: string | number | undefined, currentPrice: string | number | undefined): number;
/**
 * Determine whether a market is currently tradable based on how far its market
 * (mid) price has drifted from the oracle (reference) price.
 *
 * HyperLiquid rejects orders when the order price is more than 95% away from the
 * reference price ("Order price cannot be more than 95% away from the reference
 * price"). This most often affects HIP-3 builder-deployed markets, which can become
 * temporarily untradable when their mid price diverges far from the oracle price.
 * Clients use this signal to proactively warn the user (e.g. a "trading unavailable"
 * banner) instead of letting the order fail on submission.
 *
 * Note: the deviation limit is a HyperLiquid protocol rule. Other providers may have
 * different rules and should compute tradability accordingly.
 *
 * @param params - The parameters for the tradability check.
 * @param params.midPrice - Current market/mid price.
 * @param params.oraclePrice - Current oracle/reference price.
 * @param params.deviationLimit - Max allowed deviation as a decimal fraction
 * (defaults to HyperLiquid's 0.95). A market is untradable when
 * `abs(midPrice - oraclePrice) / oraclePrice > deviationLimit`.
 * @returns `true` when the market is tradable (or when prices are unavailable, so the
 * absence of data never blocks trading); `false` when the deviation exceeds the limit.
 */
export declare function isMarketTradable(params: {
    midPrice: number | undefined;
    oraclePrice: number | undefined;
    deviationLimit?: number;
}): boolean;
/**
 * HyperLiquid-specific market data structure
 */
export type HyperLiquidMarketData = {
    universe: PerpsUniverse[];
    assetCtxs: PerpsAssetCtx[];
    allMids: AllMidsResponse;
    predictedFundings?: PredictedFunding[];
};
/**
 * Transform raw HyperLiquid market data to UI-friendly format
 *
 * @param hyperLiquidData - Raw data from HyperLiquid API
 * @param formatters - Injectable formatters for platform-agnostic formatting
 * @param assetMarketTypes - Optional mapping of asset symbols to market types
 * @param assetNames - Optional mapping of asset symbols to human-readable names.
 * Defaults to the bundled HYPERLIQUID_ASSET_NAMES; unmapped assets fall back to
 * their ticker symbol.
 * @returns Transformed market data ready for UI consumption
 */
export declare function transformMarketData(hyperLiquidData: HyperLiquidMarketData, formatters: MarketDataFormatters, assetMarketTypes?: Record<string, MarketType>, assetNames?: Record<string, string>): PerpsMarketData[];
/**
 * Format 24h change with sign.
 * Uses more decimal places for smaller amounts to show meaningful precision.
 *
 * @param change - The price change value to format
 * @param formatters - Injectable formatters
 * @returns Formatted change string with sign and dollar symbol
 */
export declare function formatChange(change: number, formatters: MarketDataFormatters): string;
//# sourceMappingURL=marketDataTransform.d.cts.map