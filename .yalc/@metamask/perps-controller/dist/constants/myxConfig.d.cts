/**
 * MYX Protocol Configuration Constants
 *
 * Configuration for market display, price fetching, and trading.
 * Based on MYX SDK patterns.
 */
import type { MYXNetwork, MYXEndpoints, MYXAssetConfigs } from "../types/myx-types.cjs";
/**
 * MYX Chain IDs
 * Mainnet: BNB Chain (56)
 * Testnet: Linea Sepolia (59141) — primary testnet chain with most active pools.
 * The testnet API also has one pool on Arbitrum Sepolia (421614) but it has no
 * ticker data, so Linea Sepolia is the effective testnet chain.
 */
export declare const MYX_MAINNET_CHAIN_ID: "56";
export declare const MYX_TESTNET_CHAIN_ID: "59141";
export declare const MYX_MAINNET_CAIP_CHAIN_ID: `${string}:${string}`;
export declare const MYX_TESTNET_CAIP_CHAIN_ID: `${string}:${string}`;
/**
 * Get numeric chain ID for MYX network
 *
 * @param network - The MYX network environment (mainnet or testnet).
 * @returns The numeric chain ID for the specified network.
 */
export declare function getMYXChainId(network: MYXNetwork): number;
/**
 * MYX REST and WebSocket endpoints
 */
export declare const MYX_ENDPOINTS: MYXEndpoints;
/**
 * Get HTTP endpoint for network
 *
 * @param network - The MYX network environment (mainnet or testnet).
 * @returns The HTTP API endpoint URL for the specified network.
 */
export declare function getMYXHttpEndpoint(network: MYXNetwork): string;
/**
 * MYX API returns prices as normal floating-point strings (e.g. "64854.76").
 * No decimal scaling is needed for prices from the REST/WS API.
 *
 * Note: The SDK's internal contract layer uses 30 decimals, but the API
 * endpoints (tickers, candles, order history) return human-readable values.
 */
export declare const MYX_PRICE_DECIMALS = 0;
/**
 * MYX uses 18 decimals for position sizes
 */
export declare const MYX_SIZE_DECIMALS = 18;
/**
 * MYX uses 18 decimals for collateral amounts (USDT on BNB)
 */
export declare const MYX_COLLATERAL_DECIMALS = 18;
/**
 * Collateral token address — testnet (USDC on Linea Sepolia)
 * From SDK: LINEA_SEPOLIA.USDC
 */
export declare const MYX_COLLATERAL_TOKEN_TESTNET: "0xD984fd34f91F92DA0586e1bE82E262fF27DC431b";
/**
 * Collateral token address — mainnet (BUSD on BNB, per pool quoteToken)
 * Note: individual pools may use different quote tokens
 */
export declare const MYX_COLLATERAL_TOKEN_MAINNET: "0x8bfc51e1928e91e47c6734983ac018b2fc0adf4e";
/** @deprecated Use MYX_COLLATERAL_TOKEN_TESTNET */
export declare const USDT_BNB_TESTNET: "0xD984fd34f91F92DA0586e1bE82E262fF27DC431b";
/** @deprecated Use MYX_COLLATERAL_TOKEN_MAINNET */
export declare const USDT_BNB_MAINNET: "0x8bfc51e1928e91e47c6734983ac018b2fc0adf4e";
/**
 * Collateral token configuration by network
 */
export declare const MYX_ASSET_CONFIGS: MYXAssetConfigs;
/**
 * Convert MYX API price string to standard number.
 *
 * MYX API returns normal floating-point price strings (e.g. "64854.76"),
 * NOT 30-decimal scaled integers. This is a simple parseFloat.
 *
 * @param myxPrice - Price string from MYX API (e.g. "64854.760266796727")
 * @returns Standard decimal number
 */
export declare function fromMYXPrice(myxPrice: string): number;
/**
 * Convert standard number to MYX API price string.
 *
 * MYX API uses normal floating-point strings, so this is a simple toString.
 *
 * @param price - Standard decimal number
 * @returns Price string for MYX API
 */
export declare function toMYXPrice(price: number | string): string;
/**
 * Convert MYX SDK size (18 decimals) to standard number
 *
 * @param myxSize - Size string in 18-decimal format from SDK
 * @returns Standard decimal number
 */
export declare function fromMYXSize(myxSize: string): number;
/**
 * Convert standard number to MYX SDK size format (18 decimals)
 *
 * @param size - Standard decimal number
 * @returns Size string in 18-decimal format for SDK
 */
export declare function toMYXSize(size: number | string): string;
/**
 * Convert MYX SDK collateral (18 decimals) to standard number
 *
 * @param myxCollateral - Collateral string in 18-decimal format from SDK
 * @returns Standard decimal number
 */
export declare function fromMYXCollateral(myxCollateral: string): number;
/**
 * Price polling interval in milliseconds
 * Using 5 seconds as a fallback for unreliable WebSocket
 */
export declare const MYX_PRICE_POLLING_INTERVAL_MS = 5000;
/**
 * HTTP request timeout in milliseconds
 */
export declare const MYX_HTTP_TIMEOUT_MS = 10000;
/**
 * Maximum retries for failed API requests
 */
export declare const MYX_MAX_RETRIES = 3;
/**
 * Default slippage in basis points for MYX orders (1% — matches SDK default)
 */
export declare const MYX_DEFAULT_SLIPPAGE_BPS = 100;
/**
 * Maximum leverage supported by MYX (most markets)
 */
export declare const MYX_MAX_LEVERAGE = 100;
/**
 * Minimum order size in USD
 */
export declare const MYX_MINIMUM_ORDER_SIZE_USD = 10;
/**
 * MYX fee rates (placeholder — will be replaced with per-market rates)
 */
export declare const MYX_FEE_RATE = 0.0005;
export declare const MYX_PROTOCOL_FEE_RATE = 0.0005;
/**
 * USDT execution fee token address per network (used for order execution fees)
 */
export declare const MYX_EXECUTION_FEE_TOKEN: Record<MYXNetwork, string>;
//# sourceMappingURL=myxConfig.d.cts.map