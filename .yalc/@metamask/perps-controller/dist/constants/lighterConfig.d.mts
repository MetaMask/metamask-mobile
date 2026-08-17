/**
 * Lighter Protocol Configuration Constants
 *
 * Endpoints, chain ids, transaction type codes and signer defaults for the
 * zkLighter integration. Values verified against the public API
 * (https://apidocs.lighter.xyz) and lighter-python `endpoint_profiles.py`.
 */
import type { LighterEndpoints, LighterNetwork, LighterOrderBookMeta } from "../types/lighter-types.mjs";
/**
 * zkLighter L2 chain ids (protocol-level, not EVM chain ids).
 */
export declare const LIGHTER_MAINNET_CHAIN_ID = 304;
export declare const LIGHTER_TESTNET_CHAIN_ID = 300;
/**
 * Get the zkLighter chain id for a network.
 *
 * @param network - The Lighter network environment (mainnet or testnet).
 * @returns The zkLighter chain id for the specified network.
 */
export declare function getLighterChainId(network: LighterNetwork): number;
/**
 * Lighter REST and WebSocket endpoints
 */
export declare const LIGHTER_ENDPOINTS: LighterEndpoints;
/**
 * Get HTTP endpoint for a network.
 *
 * @param network - The Lighter network environment (mainnet or testnet).
 * @returns The HTTP API base URL for the specified network.
 */
export declare function getLighterHttpEndpoint(network: LighterNetwork): string;
/**
 * Get the WebSocket stream endpoint for a network.
 *
 * @param network - The Lighter network environment (mainnet or testnet).
 * @returns The WebSocket stream URL for the specified network.
 */
export declare function getLighterWsEndpoint(network: LighterNetwork): string;
/** L2 transaction type: Withdraw (funds exit to L1). */
export declare const LIGHTER_TX_TYPE_WITHDRAW = 13;
/** L2 transaction type: ModifyOrder (reprice/resize a resting order). */
export declare const LIGHTER_TX_TYPE_MODIFY_ORDER = 17;
/** USDC collateral asset index on zkLighter (asset indexing starts at 1). */
export declare const LIGHTER_USDC_ASSET_INDEX = 1;
/**
 * Candle resolutions Lighter serves natively (subset of CandlePeriod values).
 */
export declare const LIGHTER_SUPPORTED_RESOLUTIONS: ReadonlySet<string>;
/**
 * Millisecond span per supported resolution (range computation for candles).
 */
export declare const LIGHTER_RESOLUTION_MS: Record<string, number>;
export declare const LIGHTER_TX_TYPE_CHANGE_PUB_KEY = 8;
export declare const LIGHTER_TX_TYPE_CREATE_ORDER = 14;
export declare const LIGHTER_TX_TYPE_CANCEL_ORDER = 15;
export declare const LIGHTER_TX_TYPE_CANCEL_ALL_ORDERS = 16;
export declare const LIGHTER_ORDER_TYPE_LIMIT = 0;
export declare const LIGHTER_ORDER_TYPE_MARKET = 1;
export declare const LIGHTER_ORDER_TYPE_STOP_LOSS = 2;
export declare const LIGHTER_ORDER_TYPE_TAKE_PROFIT = 4;
/** Grouped-orders grouping type: one-cancels-the-other (OCO). */
export declare const LIGHTER_GROUPING_ONE_CANCELS_THE_OTHER = 2;
/** L2 transaction type: CreateGroupedOrders (e.g. OCO TP/SL pairs). */
export declare const LIGHTER_TX_TYPE_CREATE_GROUPED_ORDERS = 28;
/** L2 transaction type: UpdateMargin (isolated margin add/remove). */
export declare const LIGHTER_TX_TYPE_UPDATE_MARGIN = 29;
/** L2 transaction type: UpdateLeverage (per-market IMF + margin mode). */
export declare const LIGHTER_TX_TYPE_UPDATE_LEVERAGE = 20;
export declare const LIGHTER_TIME_IN_FORCE_IMMEDIATE_OR_CANCEL = 0;
export declare const LIGHTER_TIME_IN_FORCE_GOOD_TILL_TIME = 1;
export declare const LIGHTER_TIME_IN_FORCE_POST_ONLY = 2;
/** Sentinel for "no expiry" on GTT orders (per lighter SDKs). */
export declare const LIGHTER_ORDER_EXPIRY_NONE = -1;
/** Sentinel for "no trigger price". */
export declare const LIGHTER_NO_TRIGGER_PRICE = 0;
/**
 * Fixed EIP-191 message signed by the user's L1 account to derive the
 * Lighter venue key seed. The signature (deterministic per RFC 6979) is
 * hashed into the seed, so the same wallet always derives the same venue
 * key — recoverable across devices and compatible with hardware wallets.
 *
 * `{address}`, `{chainId}` and `{apiKeyIndex}` are substituted before
 * signing so a seed is bound to one account, network and key slot.
 */
export declare const LIGHTER_KEY_DERIVATION_MESSAGE_TEMPLATE: string;
/**
 * Build the key-derivation message for an account/network/key-slot triple.
 *
 * @param params - Substitution values.
 * @param params.address - L1 address owning the Lighter account.
 * @param params.chainId - zkLighter chain id (binds testnet/mainnet).
 * @param params.apiKeyIndex - API key slot being derived.
 * @returns The message to personal_sign.
 */
export declare function buildLighterKeyDerivationMessage(params: {
    address: string;
    chainId: number;
    apiKeyIndex: number;
}): string;
/**
 * Default API key slot used by the MetaMask integration.
 * Slots 0-2 are commonly used by Lighter's own frontends; a dedicated
 * slot avoids clobbering keys registered by other clients.
 */
export declare const LIGHTER_DEFAULT_API_KEY_INDEX = 7;
/**
 * HTTP request timeout in milliseconds
 */
export declare const LIGHTER_HTTP_TIMEOUT_MS = 10000;
/**
 * Interval for polling REST prices (no WS subscription in the POC)
 */
export declare const LIGHTER_PRICE_POLLING_INTERVAL_MS = 5000;
/**
 * Maximum leverage placeholder until per-market margin fractions are wired.
 */
export declare const LIGHTER_MAX_LEVERAGE = 50;
/**
 * TTL for the authoritative per-market margin-metadata cache used by
 * explicit leverage validation. Without expiry, metadata fetched once
 * (e.g. an older, higher max) would keep validating later-overlimit
 * leverage for the whole session; the venue cap remains the final
 * enforcement either way.
 */
export declare const LIGHTER_MARGIN_METADATA_TTL_MS = 60000;
/**
 * Prefix marking venue-data integrity failures (malformed numeric fields
 * in venue payloads). These must fail closed and surface — never degrade
 * into silently-coerced values or empty reads.
 */
export declare const LIGHTER_DATA_INTEGRITY_PREFIX = "Invalid Lighter venue data:";
/**
 * Parse a numeric string STRICTLY: the entire trimmed string must be a
 * decimal/scientific literal. parseFloat prefix-parses, so '0.1oops'
 * would silently become 0.1.
 *
 * Accepts unknown because venue REST payloads are type-cast without
 * runtime validation: a missing/null/numeric field must yield null (for
 * the caller's explicit error path), never a TypeError that generic
 * catches misclassify as an ordinary read failure.
 *
 * Note: '1e999' matches the literal pattern and parses to Infinity —
 * callers own the finiteness check.
 *
 * @param value - Raw value from params or a venue payload.
 * @returns The parsed number, or null when the value is not a string
 * containing a pure numeric literal.
 */
export declare function parseLighterStrictDecimal(value: unknown): number | null;
/**
 * Convert a human-readable amount to the integer representation expected by
 * the Lighter signer for a given number of supported decimals.
 *
 * @param value - Human-readable amount (e.g. 0.05 SOL, 187.25 USDC).
 * @param decimals - `supportedSizeDecimals` / `supportedPriceDecimals`
 * from the market metadata.
 * @returns Integer wire value (e.g. 0.05 @ 5 decimals -> 5000).
 */
export declare function toLighterInteger(value: number, decimals: number): number;
/**
 * Convert an integer wire value back to a human-readable amount.
 *
 * @param value - Integer wire value.
 * @param decimals - Supported decimals from the market metadata.
 * @returns Human-readable amount.
 */
export declare function fromLighterInteger(value: number, decimals: number): number;
/**
 * Compute the minimum order base size for a market that satisfies both
 * `minBaseAmount` and `minQuoteAmount` at a given price.
 *
 * @param market - Market metadata from `orderBooks`.
 * @param price - Order price (human units).
 * @returns Base size in human units, rounded up to the market's size step.
 */
export declare function computeLighterMinOrderSize(market: Pick<LighterOrderBookMeta, 'minBaseAmount' | 'minQuoteAmount' | 'supportedSizeDecimals'>, price: number): number;
/**
 * L1 bridge facts per network, as reported live by
 * `GET /api/v1/layer1BasicInfo` (contract addresses) and the venue docs
 * (minimums). Mainnet settles against Ethereum L1; testnet runs on a
 * venue-hosted devnet L1 (chain id 123456), so its route is informational.
 */
export declare const LIGHTER_BRIDGE_CONFIG: {
    readonly mainnet: {
        /** CAIP-2 chain the bridge contract lives on (Ethereum mainnet). */
        readonly chainId: "eip155:1";
        /** ZkLighter L1 contract (deposits via `deposit`, selector 0x8a857083). */
        readonly bridgeContract: "0x3B4D794a66304F130a4Db8F2551B0070dfCf5ca7";
        /** Canonical Ethereum USDC. */
        readonly usdcContract: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
        /** Venue-documented USDC minimums. */
        readonly minDepositUsdc: "1";
        readonly minWithdrawUsdc: "1";
    };
    readonly testnet: {
        readonly chainId: "eip155:123456";
        readonly bridgeContract: "0xe034801BC49cCDC79FB683022dA0591C86077261";
        readonly usdcContract: "0x57382a12EC72eBb1e717b7BB76c78CdDAfE3A396";
        readonly minDepositUsdc: "1";
        readonly minWithdrawUsdc: "1";
    };
};
/** UpdateLeverage margin-mode codes (types/txtypes constants). */
export declare const LIGHTER_MARGIN_MODE_CROSS = 0;
export declare const LIGHTER_MARGIN_MODE_ISOLATED = 1;
/**
 * Marker prefix for capability-gate errors (unsupported account tier /
 * unverified fee semantics). Callers use it to surface these explicitly
 * instead of degrading them into empty state.
 */
export declare const LIGHTER_UNSUPPORTED_CAPABILITY_PREFIX = "Unsupported Lighter capability:";
//# sourceMappingURL=lighterConfig.d.mts.map