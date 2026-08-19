"use strict";
/**
 * Lighter Protocol Configuration Constants
 *
 * Endpoints, chain ids, transaction type codes and signer defaults for the
 * zkLighter integration. Values verified against the public API
 * (https://apidocs.lighter.xyz) and lighter-python `endpoint_profiles.py`.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LIGHTER_UNSUPPORTED_CAPABILITY_PREFIX = exports.LIGHTER_MARGIN_MODE_ISOLATED = exports.LIGHTER_MARGIN_MODE_CROSS = exports.LIGHTER_BRIDGE_CONFIG = exports.computeLighterMinOrderSize = exports.fromLighterInteger = exports.toLighterInteger = exports.parseLighterStrictDecimal = exports.LIGHTER_DATA_INTEGRITY_PREFIX = exports.LIGHTER_MARGIN_METADATA_TTL_MS = exports.LIGHTER_MAX_LEVERAGE = exports.LIGHTER_PRICE_POLLING_INTERVAL_MS = exports.LIGHTER_HTTP_TIMEOUT_MS = exports.LIGHTER_DEFAULT_API_KEY_INDEX = exports.buildLighterKeyDerivationMessage = exports.LIGHTER_KEY_DERIVATION_MESSAGE_TEMPLATE = exports.LIGHTER_NO_TRIGGER_PRICE = exports.LIGHTER_ORDER_EXPIRY_NONE = exports.LIGHTER_TIME_IN_FORCE_POST_ONLY = exports.LIGHTER_TIME_IN_FORCE_GOOD_TILL_TIME = exports.LIGHTER_TIME_IN_FORCE_IMMEDIATE_OR_CANCEL = exports.LIGHTER_TX_TYPE_UPDATE_LEVERAGE = exports.LIGHTER_TX_TYPE_UPDATE_MARGIN = exports.LIGHTER_TX_TYPE_CREATE_GROUPED_ORDERS = exports.LIGHTER_GROUPING_ONE_CANCELS_THE_OTHER = exports.LIGHTER_ORDER_TYPE_TAKE_PROFIT = exports.LIGHTER_ORDER_TYPE_STOP_LOSS = exports.LIGHTER_ORDER_TYPE_MARKET = exports.LIGHTER_ORDER_TYPE_LIMIT = exports.LIGHTER_TX_TYPE_CANCEL_ALL_ORDERS = exports.LIGHTER_TX_TYPE_CANCEL_ORDER = exports.LIGHTER_TX_TYPE_CREATE_ORDER = exports.LIGHTER_TX_TYPE_CHANGE_PUB_KEY = exports.LIGHTER_RESOLUTION_MS = exports.LIGHTER_SUPPORTED_RESOLUTIONS = exports.LIGHTER_USDC_ASSET_INDEX = exports.LIGHTER_TX_TYPE_MODIFY_ORDER = exports.LIGHTER_TX_TYPE_WITHDRAW = exports.getLighterWsEndpoint = exports.getLighterHttpEndpoint = exports.LIGHTER_ENDPOINTS = exports.getLighterChainId = exports.LIGHTER_TESTNET_CHAIN_ID = exports.LIGHTER_MAINNET_CHAIN_ID = void 0;
// ============================================================================
// Network Constants
// ============================================================================
/**
 * zkLighter L2 chain ids (protocol-level, not EVM chain ids).
 */
exports.LIGHTER_MAINNET_CHAIN_ID = 304;
exports.LIGHTER_TESTNET_CHAIN_ID = 300;
/**
 * Get the zkLighter chain id for a network.
 *
 * @param network - The Lighter network environment (mainnet or testnet).
 * @returns The zkLighter chain id for the specified network.
 */
function getLighterChainId(network) {
    return network === 'testnet'
        ? exports.LIGHTER_TESTNET_CHAIN_ID
        : exports.LIGHTER_MAINNET_CHAIN_ID;
}
exports.getLighterChainId = getLighterChainId;
// ============================================================================
// API Endpoints
// ============================================================================
/**
 * Lighter REST and WebSocket endpoints
 */
exports.LIGHTER_ENDPOINTS = {
    mainnet: {
        http: 'https://mainnet.zklighter.elliot.ai',
        ws: 'wss://mainnet.zklighter.elliot.ai/stream',
    },
    testnet: {
        http: 'https://testnet.zklighter.elliot.ai',
        ws: 'wss://testnet.zklighter.elliot.ai/stream',
    },
};
/**
 * Get HTTP endpoint for a network.
 *
 * @param network - The Lighter network environment (mainnet or testnet).
 * @returns The HTTP API base URL for the specified network.
 */
function getLighterHttpEndpoint(network) {
    return exports.LIGHTER_ENDPOINTS[network].http;
}
exports.getLighterHttpEndpoint = getLighterHttpEndpoint;
/**
 * Get the WebSocket stream endpoint for a network.
 *
 * @param network - The Lighter network environment (mainnet or testnet).
 * @returns The WebSocket stream URL for the specified network.
 */
function getLighterWsEndpoint(network) {
    return exports.LIGHTER_ENDPOINTS[network].ws;
}
exports.getLighterWsEndpoint = getLighterWsEndpoint;
/** L2 transaction type: Withdraw (funds exit to L1). */
exports.LIGHTER_TX_TYPE_WITHDRAW = 13;
/** L2 transaction type: ModifyOrder (reprice/resize a resting order). */
exports.LIGHTER_TX_TYPE_MODIFY_ORDER = 17;
/** USDC collateral asset index on zkLighter (asset indexing starts at 1). */
exports.LIGHTER_USDC_ASSET_INDEX = 1;
/**
 * Candle resolutions Lighter serves natively (subset of CandlePeriod values).
 */
exports.LIGHTER_SUPPORTED_RESOLUTIONS = new Set([
    '1m',
    '5m',
    '15m',
    '30m',
    '1h',
    '4h',
    '12h',
    '1d',
]);
/**
 * Millisecond span per supported resolution (range computation for candles).
 */
exports.LIGHTER_RESOLUTION_MS = {
    '1m': 60000,
    '5m': 300000,
    '15m': 900000,
    '30m': 1800000,
    '1h': 3600000,
    '4h': 14400000,
    '12h': 43200000,
    '1d': 86400000,
};
// ============================================================================
// L2 Transaction Types (types/txtypes/constants.go)
// ============================================================================
exports.LIGHTER_TX_TYPE_CHANGE_PUB_KEY = 8;
exports.LIGHTER_TX_TYPE_CREATE_ORDER = 14;
exports.LIGHTER_TX_TYPE_CANCEL_ORDER = 15;
exports.LIGHTER_TX_TYPE_CANCEL_ALL_ORDERS = 16;
// ============================================================================
// Order enums (wire values expected by `_signCreateOrder`)
// ============================================================================
exports.LIGHTER_ORDER_TYPE_LIMIT = 0;
exports.LIGHTER_ORDER_TYPE_MARKET = 1;
exports.LIGHTER_ORDER_TYPE_STOP_LOSS = 2;
exports.LIGHTER_ORDER_TYPE_TAKE_PROFIT = 4;
/** Grouped-orders grouping type: one-cancels-the-other (OCO). */
exports.LIGHTER_GROUPING_ONE_CANCELS_THE_OTHER = 2;
/** L2 transaction type: CreateGroupedOrders (e.g. OCO TP/SL pairs). */
exports.LIGHTER_TX_TYPE_CREATE_GROUPED_ORDERS = 28;
/** L2 transaction type: UpdateMargin (isolated margin add/remove). */
exports.LIGHTER_TX_TYPE_UPDATE_MARGIN = 29;
/** L2 transaction type: UpdateLeverage (per-market IMF + margin mode). */
exports.LIGHTER_TX_TYPE_UPDATE_LEVERAGE = 20;
exports.LIGHTER_TIME_IN_FORCE_IMMEDIATE_OR_CANCEL = 0;
exports.LIGHTER_TIME_IN_FORCE_GOOD_TILL_TIME = 1;
exports.LIGHTER_TIME_IN_FORCE_POST_ONLY = 2;
/** Sentinel for "no expiry" on GTT orders (per lighter SDKs). */
exports.LIGHTER_ORDER_EXPIRY_NONE = -1;
/** Sentinel for "no trigger price". */
exports.LIGHTER_NO_TRIGGER_PRICE = 0;
// ============================================================================
// Signer / key derivation
// ============================================================================
/**
 * Fixed EIP-191 message signed by the user's L1 account to derive the
 * Lighter venue key seed. The signature (deterministic per RFC 6979) is
 * hashed into the seed, so the same wallet always derives the same venue
 * key — recoverable across devices and compatible with hardware wallets.
 *
 * `{address}`, `{chainId}` and `{apiKeyIndex}` are substituted before
 * signing so a seed is bound to one account, network and key slot.
 */
exports.LIGHTER_KEY_DERIVATION_MESSAGE_TEMPLATE = 'MetaMask Perps: derive Lighter API key\n' +
    'Address: {address}\n' +
    'Chain ID: {chainId}\n' +
    'API key index: {apiKeyIndex}\n' +
    'Only sign this message for a trusted client!';
/**
 * Build the key-derivation message for an account/network/key-slot triple.
 *
 * @param params - Substitution values.
 * @param params.address - L1 address owning the Lighter account.
 * @param params.chainId - zkLighter chain id (binds testnet/mainnet).
 * @param params.apiKeyIndex - API key slot being derived.
 * @returns The message to personal_sign.
 */
function buildLighterKeyDerivationMessage(params) {
    return exports.LIGHTER_KEY_DERIVATION_MESSAGE_TEMPLATE.replace('{address}', params.address.toLowerCase())
        .replace('{chainId}', String(params.chainId))
        .replace('{apiKeyIndex}', String(params.apiKeyIndex));
}
exports.buildLighterKeyDerivationMessage = buildLighterKeyDerivationMessage;
/**
 * Default API key slot used by the MetaMask integration.
 * Slots 0-2 are commonly used by Lighter's own frontends; a dedicated
 * slot avoids clobbering keys registered by other clients.
 */
exports.LIGHTER_DEFAULT_API_KEY_INDEX = 7;
// ============================================================================
// REST API Configuration
// ============================================================================
/**
 * HTTP request timeout in milliseconds
 */
exports.LIGHTER_HTTP_TIMEOUT_MS = 10000;
/**
 * Interval for polling REST prices (no WS subscription in the POC)
 */
exports.LIGHTER_PRICE_POLLING_INTERVAL_MS = 5000;
/**
 * Maximum leverage placeholder until per-market margin fractions are wired.
 */
exports.LIGHTER_MAX_LEVERAGE = 50;
/**
 * TTL for the authoritative per-market margin-metadata cache used by
 * explicit leverage validation. Without expiry, metadata fetched once
 * (e.g. an older, higher max) would keep validating later-overlimit
 * leverage for the whole session; the venue cap remains the final
 * enforcement either way.
 */
exports.LIGHTER_MARGIN_METADATA_TTL_MS = 60000;
/**
 * Prefix marking venue-data integrity failures (malformed numeric fields
 * in venue payloads). These must fail closed and surface — never degrade
 * into silently-coerced values or empty reads.
 */
exports.LIGHTER_DATA_INTEGRITY_PREFIX = 'Invalid Lighter venue data:';
/** Full-string decimal/scientific literal (optional sign and exponent). */
const LIGHTER_STRICT_DECIMAL_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/u;
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
function parseLighterStrictDecimal(value) {
    if (typeof value !== 'string') {
        return null;
    }
    const trimmed = value.trim();
    return LIGHTER_STRICT_DECIMAL_PATTERN.test(trimmed)
        ? parseFloat(trimmed)
        : null;
}
exports.parseLighterStrictDecimal = parseLighterStrictDecimal;
// ============================================================================
// Size / price integerization
// ============================================================================
/**
 * Convert a human-readable amount to the integer representation expected by
 * the Lighter signer for a given number of supported decimals.
 *
 * @param value - Human-readable amount (e.g. 0.05 SOL, 187.25 USDC).
 * @param decimals - `supportedSizeDecimals` / `supportedPriceDecimals`
 * from the market metadata.
 * @returns Integer wire value (e.g. 0.05 @ 5 decimals -> 5000).
 */
function toLighterInteger(value, decimals) {
    const scaled = Math.round(value * 10 ** decimals);
    // Fail closed on wire-format overflow: a huge-but-finite value scales to
    // an unsafe integer (or Infinity) and would stringify as '1e+305' inside
    // signer params.
    if (!Number.isSafeInteger(scaled)) {
        throw new Error(`Value ${value} is outside Lighter's integer range at ${decimals} decimals`);
    }
    // NOTE: this is a generic converter — zero and negative results are
    // valid here. Positive-intent policy for signer-bound values lives in
    // the provider's internal wire wrapper.
    return scaled;
}
exports.toLighterInteger = toLighterInteger;
/**
 * Convert an integer wire value back to a human-readable amount.
 *
 * @param value - Integer wire value.
 * @param decimals - Supported decimals from the market metadata.
 * @returns Human-readable amount.
 */
function fromLighterInteger(value, decimals) {
    return value / 10 ** decimals;
}
exports.fromLighterInteger = fromLighterInteger;
/**
 * Compute the minimum order base size for a market that satisfies both
 * `minBaseAmount` and `minQuoteAmount` at a given price.
 *
 * @param market - Market metadata from `orderBooks`.
 * @param price - Order price (human units).
 * @returns Base size in human units, rounded up to the market's size step.
 */
function computeLighterMinOrderSize(market, price) {
    const minBase = parseFloat(market.minBaseAmount);
    const minQuote = parseFloat(market.minQuoteAmount);
    const step = 10 ** -market.supportedSizeDecimals;
    const byQuote = price > 0 ? minQuote / price : minBase;
    const raw = Math.max(minBase, byQuote);
    // Small epsilon guards against float artifacts (0.1 / 1e-5 = 10000.0000002)
    // pushing the ceil one step too high.
    const units = Math.ceil(raw / step - 1e-9);
    return Number((units * step).toFixed(market.supportedSizeDecimals));
}
exports.computeLighterMinOrderSize = computeLighterMinOrderSize;
/**
 * L1 bridge facts per network, as reported live by
 * `GET /api/v1/layer1BasicInfo` (contract addresses) and the venue docs
 * (minimums). Mainnet settles against Ethereum L1; testnet runs on a
 * venue-hosted devnet L1 (chain id 123456), so its route is informational.
 */
exports.LIGHTER_BRIDGE_CONFIG = {
    mainnet: {
        /** CAIP-2 chain the bridge contract lives on (Ethereum mainnet). */
        chainId: 'eip155:1',
        /** ZkLighter L1 contract (deposits via `deposit`, selector 0x8a857083). */
        bridgeContract: '0x3B4D794a66304F130a4Db8F2551B0070dfCf5ca7',
        /** Canonical Ethereum USDC. */
        usdcContract: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        /** Venue-documented USDC minimums. */
        minDepositUsdc: '1',
        minWithdrawUsdc: '1',
    },
    testnet: {
        chainId: 'eip155:123456',
        bridgeContract: '0xe034801BC49cCDC79FB683022dA0591C86077261',
        usdcContract: '0x57382a12EC72eBb1e717b7BB76c78CdDAfE3A396',
        minDepositUsdc: '1',
        minWithdrawUsdc: '1',
    },
};
/** UpdateLeverage margin-mode codes (types/txtypes constants). */
exports.LIGHTER_MARGIN_MODE_CROSS = 0;
exports.LIGHTER_MARGIN_MODE_ISOLATED = 1;
/**
 * Marker prefix for capability-gate errors (unsupported account tier /
 * unverified fee semantics). Callers use it to surface these explicitly
 * instead of degrading them into empty state.
 */
exports.LIGHTER_UNSUPPORTED_CAPABILITY_PREFIX = 'Unsupported Lighter capability:';
//# sourceMappingURL=lighterConfig.cjs.map