/**
 * Test result states for SDK validation
 */
import { CandlePeriod } from "../constants/chartConfig.mjs";
/**
 * Order type enumeration (placement type).
 *
 * - `market` / `limit`: immediate placement.
 * - `stop_*` / `take_profit_*`: trigger placement — the order rests off-book until
 *   `OrderParams.triggerPrice` is reached, then executes as a market or limit order
 *   according to the suffix.
 * - `twap` / `scale` / `chase`: strategy placement — one request expands into an
 *   execution schedule rather than a single resting order. See `StrategyOrderType`.
 *
 * Provider-agnostic by design: no protocol vocabulary (HyperLiquid's `tpsl`,
 * `triggerPx`, `isMarket`) appears in the params model.
 */
export type OrderType = 'market' | 'limit' | 'stop_market' | 'stop_limit' | 'take_profit_market' | 'take_profit_limit' | 'twap' | 'scale' | 'chase';
/**
 * The subset of `OrderType` values that require a trigger price.
 *
 * Spelled out rather than derived with `Exclude`: every order type added to
 * `OrderType` that is neither `market` nor `limit` would otherwise be pulled in
 * here automatically and start demanding a trigger price it has no concept of.
 */
export type TriggerOrderType = 'stop_market' | 'stop_limit' | 'take_profit_market' | 'take_profit_limit';
/**
 * The subset of `OrderType` values that describe an execution *strategy* rather
 * than a single order.
 *
 * - `twap`: slice the size over `OrderParams.twapDuration` minutes. Placed and
 *   cancelled through the venue's own TWAP endpoints, not the order book.
 * - `scale`: fan out `OrderParams.scaleNumOrders` limit orders evenly between
 *   `OrderParams.scaleMinPrice` and `OrderParams.scaleMaxPrice`.
 * - `chase`: rest a post-only order at the near touch and re-price it as the
 *   touch moves, until it fills or the chase window closes.
 *
 * A strategy placement returns a *handle* in `OrderResult.orderId` — a venue
 * TWAP id, or a client-generated group/session id — which is what
 * `CancelOrderParams` takes together with the matching `orderType`.
 */
export type StrategyOrderType = 'twap' | 'scale' | 'chase';
/**
 * Every `OrderType` that resolves to a single order the exchange can be handed
 * directly — market, limit, and the four trigger placements.
 *
 * Derived with `Exclude` on purpose, the safe direction: it *shrinks* as
 * `StrategyOrderType` grows, so a strategy added later is kept out of the
 * single-order helpers automatically rather than silently falling through them.
 */
export type OrdinaryOrderType = Exclude<OrderType, StrategyOrderType>;
/**
 * Whether a triggered order executes as a market or a limit order.
 */
export type OrderExecution = 'market' | 'limit';
/**
 * How an attached TP/SL relates to what it protects.
 *
 * - `none`: the order carries no attached TP/SL.
 * - `order`: the TP/SL belongs to this order and is cancelled with it.
 * - `position`: the TP/SL belongs to the resulting position and covers all of it.
 *
 * Provider-agnostic replacement for the HyperLiquid-shaped `OrderParams.grouping`.
 */
export type TpslLinkage = 'none' | 'order' | 'position';
/**
 * Which side of the mark price a trigger order fires on.
 * `stop` protects against adverse moves, `take_profit` realizes gains.
 */
export type TriggerDirection = 'stop' | 'take_profit';
export type TestResultStatus = 'idle' | 'loading' | 'success' | 'warning' | 'error';
/**
 * Test result data structure
 */
export type TestResult = {
    status: TestResultStatus;
    message: string;
    data?: Record<string, unknown>;
};
/**
 * SDK test types
 */
export type SDKTestType = 'connection' | 'asset-listing' | 'websocket';
/**
 * Hyperliquid asset interface (basic structure)
 */
export type HyperliquidAsset = {
    name: string;
    [key: string]: unknown;
};
/**
 * Represents a single candlestick data point
 */
export type CandleStick = {
    time: number;
    open: string;
    high: string;
    low: string;
    close: string;
    volume: string;
};
/**
 * Represents historical candlestick data for a specific symbol and interval
 */
export type CandleData = {
    /** Asset identifier (e.g., 'BTC', 'ETH'). Protocol-agnostic terminology for multi-provider support. */
    symbol: string;
    interval: CandlePeriod;
    candles: CandleStick[];
};
export type { HyperLiquidEndpoints, AssetNetworkConfig, HyperLiquidAssetConfigs, BridgeContractConfig, HyperLiquidBridgeContracts, TransportReconnectConfig, TransportKeepAliveConfig, HyperLiquidTransportConfig, TradingAmountConfig, TradingDefaultsConfig, FeeRatesConfig, HyperLiquidNetwork, } from "./config.mjs";
export type { PerpsToken } from "./token.mjs";
/**
 * Order form state for the Perps order view
 */
export type OrderFormState = {
    asset: string;
    direction: 'long' | 'short';
    amount: string;
    leverage: number;
    balancePercent: number;
    takeProfitPrice?: string;
    stopLossPrice?: string;
    limitPrice?: string;
    type: OrderType;
};
export type OrderDirection = 'long' | 'short';
/**
 * Options for reconnecting the Perps connection
 */
export type ReconnectOptions = {
    /**
     * If true, forces immediate disconnect and cancels all pending operations.
     * Use for user-initiated retry actions.
     * If false (default), waits for pending operations to complete.
     * Use for automatic reconnections like account switches.
     */
    force?: boolean;
};
/**
 * Extended asset metadata including Growth Mode fields not in SDK types.
 * The HyperLiquid API returns these fields but the SDK doesn't type them.
 *
 * @see https://hyperliquid.gitbook.io/hyperliquid-docs/trading/fees#fee-formula-for-developers
 */
export type ExtendedAssetMeta = {
    name: string;
    szDecimals: number;
    maxLeverage: number;
    /** Per-asset Growth Mode status - "enabled" means 90% fee reduction */
    growthMode?: 'enabled' | null;
    /** ISO timestamp of last Growth Mode change */
    lastGrowthModeChangeTime?: string;
};
/**
 * Extended perp DEX info including fee scale fields not in SDK types.
 * The HyperLiquid API returns these fields but the SDK doesn't type them.
 *
 * @see https://hyperliquid.gitbook.io/hyperliquid-docs/trading/fees#fee-formula-for-developers
 */
export type ExtendedPerpDex = {
    name: string;
    fullName?: string;
    deployer?: string;
    /** DEX-level fee scale (e.g., "1.0" for xyz DEX) - determines HIP-3 multiplier */
    deployerFeeScale?: string;
    /** ISO timestamp of last fee scale change */
    lastDeployerFeeScaleChangeTime?: string;
};
/**
 * Unified DEX discovery state — single source of truth for all perpDexs() derivatives.
 * Replaces three separate caches (#cachedAllPerpDexs, #cachedValidatedDexs, #perpDexsCache)
 * to eliminate desync bugs by construction.
 */
export type DexDiscoveryState = {
    /** perpDexs() API response (raw objects with deployerFeeScale etc.) */
    raw: (ExtendedPerpDex | null)[];
    /** Feature-flag-filtered DEX names (null = main DEX, strings = HIP-3 DEXs) */
    validated: (string | null)[];
    /** When raw was fetched — used for fee-scale TTL checks */
    timestamp: number;
};
//# sourceMappingURL=perps-types.d.mts.map