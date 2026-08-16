import type { CaipAssetId, CaipChainId } from "@metamask/utils";
import type { MarketType } from "../types/index.cjs";
import type { HyperLiquidEndpoints, HyperLiquidAssetConfigs, BridgeContractConfig, HyperLiquidBridgeContracts, HyperLiquidTransportConfig, TradingDefaultsConfig, FeeRatesConfig } from "../types/perps-types.cjs";
export declare const ARBITRUM_MAINNET_CHAIN_ID_HEX: "0xa4b1";
export declare const ARBITRUM_MAINNET_CHAIN_ID = "42161";
export declare const ARBITRUM_TESTNET_CHAIN_ID = "421614";
export declare const ARBITRUM_MAINNET_CAIP_CHAIN_ID = "eip155:42161";
export declare const ARBITRUM_TESTNET_CAIP_CHAIN_ID = "eip155:421614";
export declare const HYPERLIQUID_MAINNET_CHAIN_ID = "0x3e7";
export declare const HYPERLIQUID_TESTNET_CHAIN_ID = "0x3e6";
export declare const HYPERLIQUID_MAINNET_CAIP_CHAIN_ID: `${string}:${string}`;
export declare const HYPERLIQUID_TESTNET_CAIP_CHAIN_ID: `${string}:${string}`;
export declare const HYPERLIQUID_NETWORK_NAME = "Hyperliquid";
/**
 * Return the canonical snapshot identity: main first, then unique DEX ids.
 *
 * @param dexes - DEX identifiers to canonicalize.
 * @returns The canonical DEX identifiers.
 */
export declare function canonicalizeHyperLiquidDexes(dexes: Iterable<string>): string[];
export declare const USDC_SYMBOL = "USDC";
export declare const USDC_NAME = "USD Coin";
export declare const USDC_DECIMALS = 6;
export declare const TOKEN_DECIMALS = 18;
export declare const ARBITRUM_SEPOLIA_CHAIN_ID = "0x66eee";
export declare const USDC_ETHEREUM_MAINNET_ADDRESS = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
export declare const USDC_ARBITRUM_MAINNET_ADDRESS = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
export declare const USDC_ARBITRUM_TESTNET_ADDRESS = "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d";
export declare const USDC_TOKEN_ICON_URL = "https://static.cx.metamask.io/api/v1/tokenIcons/1/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png";
export declare const HYPERLIQUID_ENDPOINTS: HyperLiquidEndpoints;
export declare const HYPERLIQUID_ASSET_ICONS_BASE_URL = "https://app.hyperliquid.xyz/coins/";
export declare const METAMASK_PERPS_ICONS_BASE_URL = "https://raw.githubusercontent.com/MetaMask/contract-metadata/master/icons/eip155:999/";
export declare const HYPERLIQUID_ASSET_CONFIGS: HyperLiquidAssetConfigs;
export declare const HYPERLIQUID_BRIDGE_CONTRACTS: HyperLiquidBridgeContracts;
export declare const HYPERLIQUID_TRANSPORT_CONFIG: HyperLiquidTransportConfig;
export declare const TRADING_DEFAULTS: TradingDefaultsConfig;
export declare const FEE_RATES: FeeRatesConfig;
/**
 * HIP-3 dynamic fee calculation configuration
 *
 * HIP-3 (builder-deployed) perpetual markets have variable fees based on:
 * 1. deployerFeeScale - Per-DEX fee multiplier (fetched from perpDexs API)
 * 2. growthMode - Per-asset 90% fee reduction (fetched from meta API)
 *
 * Fee Formula (from HyperLiquid docs):
 * - scaleIfHip3 = deployerFeeScale < 1 ? deployerFeeScale + 1 : deployerFeeScale * 2
 * - growthModeScale = growthMode ? 0.1 : 1
 * - finalRate = baseRate * scaleIfHip3 * growthModeScale
 *
 * Example: For xyz:TSLA with deployerFeeScale=1.0 and growthMode="enabled":
 * - scaleIfHip3 = 1.0 * 2 = 2.0
 * - growthModeScale = 0.1 (90% reduction)
 * - Final multiplier = 2.0 * 0.1 = 0.2 (effectively 80% off standard 2x HIP-3 fees)
 *
 * @see https://hyperliquid.gitbook.io/hyperliquid-docs/trading/fees#fee-formula-for-developers
 * @see parseAssetName() in HyperLiquidProvider for HIP-3 asset detection
 */
export declare const HIP3_FEE_CONFIG: {
    /**
     * Growth Mode multiplier - 90% fee reduction for assets in growth phase
     * This is a protocol constant from HyperLiquid's fee formula
     */
    readonly GrowthModeScale: 0.1;
    /**
     * Default deployerFeeScale when API is unavailable
     * Most HIP-3 DEXs use 1.0, which results in 2x base fees
     */
    readonly DefaultDeployerFeeScale: 1;
    /**
     * Cache TTL for perpDexs data (5 minutes)
     * Fee scales rarely change, so longer cache is acceptable
     */
    readonly PerpDexsCacheTtlMs: number;
    /**
     * @deprecated Use dynamic calculation via calculateHip3FeeMultiplier()
     * Kept for backwards compatibility during migration
     */
    readonly FeeMultiplier: 2;
};
export declare const BUILDER_FEE_CONFIG: {
    TestnetBuilder: `0x${string}`;
    MainnetBuilder: `0x${string}`;
    MaxFeeDecimal: number;
    MaxFeeTenthsBps: number;
    MaxFeeRate: string;
};
export declare const REFERRAL_CONFIG: {
    MainnetCode: string;
    TestnetCode: string;
};
export declare const DEPOSIT_CONFIG: {
    EstimatedGasLimit: number;
    DefaultSlippage: number;
    BridgeQuoteTimeout: number;
    RefreshRate: number;
    EstimatedTime: {
        DirectDeposit: string;
        SameChainSwap: string;
    };
};
export declare const HYPERLIQUID_WITHDRAWAL_MINUTES = 5;
export type SupportedAsset = keyof typeof HYPERLIQUID_ASSET_CONFIGS;
export declare function getWebSocketEndpoint(isTestnet: boolean): string;
export declare function getChainId(isTestnet: boolean): string;
export declare function getCaipChainId(isTestnet: boolean): CaipChainId;
export declare function getBridgeInfo(isTestnet: boolean): BridgeContractConfig;
export declare function getSupportedAssets(isTestnet?: boolean): CaipAssetId[];
export declare const CAIP_ASSET_NAMESPACES: {
    readonly Erc20: "erc20";
};
/**
 * HyperLiquid protocol-specific configuration
 * Contains constants specific to HyperLiquid's perps exchange
 */
export declare const HYPERLIQUID_CONFIG: {
    readonly ExchangeName: "HlPerp";
    readonly OraclePriceDeviationLimit: 0.95;
};
/**
 * HIP-3 multi-DEX asset ID calculation constants
 * Per HIP-3-IMPLEMENTATION.md:
 * - Main DEX: assetId = index (0, 1, 2, ...)
 * - HIP-3 DEX: assetId = BASE_ASSET_ID + (perpDexIndex × DEX_MULTIPLIER) + index
 *
 * This formula enables proper order routing across multiple DEXs:
 * - Main DEX (perpDexIndex=0): Uses index directly (BTC=0, ETH=1, SOL=2, etc.)
 * - xyz DEX (perpDexIndex=1): 100000 + (1 × 10000) + index = 110000-110999
 * - abc DEX (perpDexIndex=2): 100000 + (2 × 10000) + index = 120000-120999
 *
 * Supports up to 10 HIP-3 DEXs with 10000 assets each.
 */
export declare const HIP3_ASSET_ID_CONFIG: {
    readonly BaseAssetId: 100000;
    readonly DexMultiplier: 10000;
};
/**
 * Basis points conversion constant
 * 1 basis point (bp) = 0.01% = 0.0001 as decimal
 * Used for fee discount calculations (e.g., 6500 bps = 65%)
 */
export declare const BASIS_POINTS_DIVISOR = 10000;
/**
 * Offset added to spot market pair index to derive the spot asset ID
 * used in HyperLiquid order routing.
 * Per HyperLiquid protocol: spotAssetId = SPOT_ASSET_ID_OFFSET + pairIndex
 */
export declare const SPOT_ASSET_ID_OFFSET = 10000;
/**
 * HIP-3 asset market type classifications (PRODUCTION DEFAULT)
 *
 * This is the production default configuration, can be overridden via feature flag
 * (remoteFeatureFlags.perpsAssetMarketTypes) for dynamic control.
 *
 * Maps asset symbols (e.g., "xyz:TSLA") to their market type for badge display.
 *
 * Market type determines the badge shown in the UI:
 * - 'stock': Individual stocks (TSLA, NVDA, AAPL, etc.)
 * - 'pre-ipo': Pre-IPO assets not yet publicly listed
 * - 'index': Market indices (SP500, JP225, VIX, etc.)
 * - 'etf': Exchange-traded funds (EWY, EWJ, USAR, etc.)
 * - 'commodity': Commodities (GOLD, SILVER, CL, etc.)
 * - 'forex': Forex pairs (EUR, JPY, DXY)
 * - 'crypto': Explicitly categorized crypto assets
 * - undefined: No badge for unmapped assets
 *
 * Format: 'dex:SYMBOL' → MarketType
 * This allows flexible per-asset classification.
 * Assets not listed here will have no market type (undefined).
 */
export declare const HIP3_ASSET_MARKET_TYPES: Record<string, MarketType>;
/**
 * Human-readable market names keyed by HyperLiquid asset symbol.
 *
 * HyperLiquid does NOT expose a human-readable name per market: the `meta`
 * universe only returns the ticker (`BTC`, `xyz:TSLA`), and `perpDexs` only
 * exposes a `fullName` for the DEX/venue, not the individual asset. This map is
 * therefore maintained client-side so that clients (mobile, extension) can:
 * - match markets by full name in search ("Bitcoin", "Apple", "Gold"), and
 * - display the full name alongside / instead of the ticker.
 *
 * Keys follow the same convention as {@link HIP3_ASSET_MARKET_TYPES}: bare
 * `SYMBOL` for main-DEX crypto and `dex:SYMBOL` for HIP-3 markets. Use
 * {@link getHyperLiquidAssetName} to resolve a name with a safe fallback to the
 * ticker for unmapped assets.
 *
 * This list is intentionally curated (not exhaustive): unmapped assets simply
 * fall back to their ticker, which matches prior behavior. Add entries as needed.
 */
export declare const HYPERLIQUID_ASSET_NAMES: Record<string, string>;
/**
 * Resolve the human-readable name for a HyperLiquid market.
 *
 * Falls back to the ticker symbol when the asset is not present in
 * {@link HYPERLIQUID_ASSET_NAMES}, so callers always receive a displayable
 * string and unmapped assets keep their prior behavior.
 *
 * @param symbol - HyperLiquid asset symbol (bare `SYMBOL` for main-DEX crypto,
 * `dex:SYMBOL` for HIP-3 markets).
 * @param names - Name map to look up against (defaults to the bundled
 * {@link HYPERLIQUID_ASSET_NAMES}); injectable for testing/overrides.
 * @returns The human-readable name, or the symbol itself when unmapped.
 */
export declare function getHyperLiquidAssetName(symbol: string, names?: Record<string, string>): string;
/**
 * Testnet-specific HIP-3 DEX configuration
 *
 * On testnet, there are many HIP-3 DEXs (test deployments from various builders).
 * Subscribing to all of them causes connection/subscription overload and instability.
 * This configuration limits which DEXs are discovered and subscribed to on testnet.
 */
export declare const TESTNET_HIP3_CONFIG: {
    /**
     * Allowed DEX names for testnet
     * Empty array = main DEX only (no HIP-3 DEXs)
     * Add specific DEX names to test with particular HIP-3 DEXs: ['testdex1', 'testdex2']
     */
    readonly EnabledDexs: string[];
    /**
     * Set to true to enable full HIP-3 discovery on testnet (not recommended)
     * When false, only DEXs in ENABLED_DEXS are used
     */
    readonly AutoDiscoverAll: false;
};
/**
 * Mainnet-specific HIP-3 DEX configuration
 *
 * On mainnet, DEX filtering is dynamically determined from the allowlist markets
 * feature flag. This avoids hardcoding DEX names and ensures consistency with
 * the market filtering logic.
 *
 * When AutoDiscoverAll is false and no allowlist is provided, only the main DEX is used.
 * When an allowlist is provided, DEXs are extracted from the allowlist patterns.
 */
export declare const MAINNET_HIP3_CONFIG: {
    /**
     * Set to true to enable full HIP-3 discovery on mainnet
     * When false, DEXs are filtered based on the allowlist markets feature flag
     * (recommended for production to reduce subscription overhead)
     */
    readonly AutoDiscoverAll: false;
};
/**
 * HIP-3 margin management configuration
 * Controls margin buffers and auto-rebalance behavior for HIP-3 DEXes with isolated margin
 *
 * Background: HyperLiquid validates spendableBalance >= totalRequiredMargin BEFORE reallocating
 * existing locked margin. This requires temporary over-funding when increasing positions,
 * followed by automatic cleanup to minimize locked capital.
 */
export declare const HIP3_MARGIN_CONFIG: {
    /**
     * Margin buffer multiplier for fees and slippage (0.3% = multiply by 1.003)
     * Covers HyperLiquid's max taker fee (0.035%) with comfortable margin
     */
    readonly BufferMultiplier: 1.003;
    /**
     * Desired buffer to keep on HIP-3 DEX after auto-rebalance (USDC amount)
     * Small buffer allows quick follow-up orders without transfers
     */
    readonly RebalanceDesiredBuffer: 0.1;
    /**
     * Minimum excess threshold to trigger auto-rebalance (USDC amount)
     * Prevents unnecessary transfers for tiny amounts
     */
    readonly RebalanceMinThreshold: 0.1;
};
export declare const INITIAL_AMOUNT_UI_PROGRESS = 10;
export declare const WITHDRAWAL_PROGRESS_STAGES: number[];
export declare const PROGRESS_BAR_COMPLETION_DELAY_MS = 500;
//# sourceMappingURL=hyperLiquidConfig.d.cts.map