/**
 * Lighter Protocol Configuration Constants
 *
 * Endpoints, chain ids, transaction type codes and signer defaults for the
 * zkLighter integration. Values verified against the public API
 * (https://apidocs.lighter.xyz) and lighter-python `endpoint_profiles.py`.
 */
// ============================================================================
// Network Constants
// ============================================================================
/**
 * zkLighter L2 chain ids (protocol-level, not EVM chain ids).
 */
export const LIGHTER_MAINNET_CHAIN_ID = 304;
export const LIGHTER_TESTNET_CHAIN_ID = 300;
/**
 * Get the zkLighter chain id for a network.
 *
 * @param network - The Lighter network environment (mainnet or testnet).
 * @returns The zkLighter chain id for the specified network.
 */
export function getLighterChainId(network) {
    return network === 'testnet'
        ? LIGHTER_TESTNET_CHAIN_ID
        : LIGHTER_MAINNET_CHAIN_ID;
}
// ============================================================================
// API Endpoints
// ============================================================================
/**
 * Lighter REST and WebSocket endpoints
 */
export const LIGHTER_ENDPOINTS = {
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
export function getLighterHttpEndpoint(network) {
    return LIGHTER_ENDPOINTS[network].http;
}
/**
 * Get the WebSocket stream endpoint for a network.
 *
 * @param network - The Lighter network environment (mainnet or testnet).
 * @returns The WebSocket stream URL for the specified network.
 */
export function getLighterWsEndpoint(network) {
    return LIGHTER_ENDPOINTS[network].ws;
}
/** L2 transaction type: Withdraw (funds exit to L1). */
export const LIGHTER_TX_TYPE_WITHDRAW = 13;
/** L2 transaction type: ModifyOrder (reprice/resize a resting order). */
export const LIGHTER_TX_TYPE_MODIFY_ORDER = 17;
/** USDC collateral asset index on zkLighter (asset indexing starts at 1). */
export const LIGHTER_USDC_ASSET_INDEX = 1;
/**
 * Candle resolutions Lighter serves natively (subset of CandlePeriod values).
 */
export const LIGHTER_SUPPORTED_RESOLUTIONS = new Set([
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
export const LIGHTER_RESOLUTION_MS = {
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
export const LIGHTER_TX_TYPE_CHANGE_PUB_KEY = 8;
export const LIGHTER_TX_TYPE_CREATE_ORDER = 14;
export const LIGHTER_TX_TYPE_CANCEL_ORDER = 15;
export const LIGHTER_TX_TYPE_CANCEL_ALL_ORDERS = 16;
// ============================================================================
// Order enums (wire values expected by `_signCreateOrder`)
// ============================================================================
export const LIGHTER_ORDER_TYPE_LIMIT = 0;
export const LIGHTER_ORDER_TYPE_MARKET = 1;
export const LIGHTER_ORDER_TYPE_STOP_LOSS = 2;
export const LIGHTER_ORDER_TYPE_TAKE_PROFIT = 4;
/** Grouped-orders grouping type: one-cancels-the-other (OCO). */
export const LIGHTER_GROUPING_ONE_CANCELS_THE_OTHER = 2;
/** L2 transaction type: CreateGroupedOrders (e.g. OCO TP/SL pairs). */
export const LIGHTER_TX_TYPE_CREATE_GROUPED_ORDERS = 28;
/** L2 transaction type: UpdateMargin (isolated margin add/remove). */
export const LIGHTER_TX_TYPE_UPDATE_MARGIN = 29;
/** L2 transaction type: UpdateLeverage (per-market IMF + margin mode). */
export const LIGHTER_TX_TYPE_UPDATE_LEVERAGE = 20;
export const LIGHTER_TIME_IN_FORCE_IMMEDIATE_OR_CANCEL = 0;
export const LIGHTER_TIME_IN_FORCE_GOOD_TILL_TIME = 1;
export const LIGHTER_TIME_IN_FORCE_POST_ONLY = 2;
/** Sentinel for "no expiry" on GTT orders (per lighter SDKs). */
export const LIGHTER_ORDER_EXPIRY_NONE = -1;
/** Sentinel for "no trigger price". */
export const LIGHTER_NO_TRIGGER_PRICE = 0;
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
export const LIGHTER_KEY_DERIVATION_MESSAGE_TEMPLATE = 'MetaMask Perps: derive Lighter API key\n' +
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
export function buildLighterKeyDerivationMessage(params) {
    return LIGHTER_KEY_DERIVATION_MESSAGE_TEMPLATE.replace('{address}', params.address.toLowerCase())
        .replace('{chainId}', String(params.chainId))
        .replace('{apiKeyIndex}', String(params.apiKeyIndex));
}
/**
 * Default API key slot used by the MetaMask integration.
 * Slots 0-2 are commonly used by Lighter's own frontends; a dedicated
 * slot avoids clobbering keys registered by other clients.
 */
export const LIGHTER_DEFAULT_API_KEY_INDEX = 7;
// ============================================================================
// REST API Configuration
// ============================================================================
/**
 * HTTP request timeout in milliseconds
 */
export const LIGHTER_HTTP_TIMEOUT_MS = 10000;
/**
 * Interval for polling REST prices (no WS subscription in the POC)
 */
export const LIGHTER_PRICE_POLLING_INTERVAL_MS = 5000;
/**
 * Maximum leverage placeholder until per-market margin fractions are wired.
 */
export const LIGHTER_MAX_LEVERAGE = 50;
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
export function toLighterInteger(value, decimals) {
    return Math.round(value * 10 ** decimals);
}
/**
 * Convert an integer wire value back to a human-readable amount.
 *
 * @param value - Integer wire value.
 * @param decimals - Supported decimals from the market metadata.
 * @returns Human-readable amount.
 */
export function fromLighterInteger(value, decimals) {
    return value / 10 ** decimals;
}
/**
 * Compute the minimum order base size for a market that satisfies both
 * `minBaseAmount` and `minQuoteAmount` at a given price.
 *
 * @param market - Market metadata from `orderBooks`.
 * @param price - Order price (human units).
 * @returns Base size in human units, rounded up to the market's size step.
 */
export function computeLighterMinOrderSize(market, price) {
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
/**
 * L1 bridge facts per network, as reported live by
 * `GET /api/v1/layer1BasicInfo` (contract addresses) and the venue docs
 * (minimums). Mainnet settles against Ethereum L1; testnet runs on a
 * venue-hosted devnet L1 (chain id 123456), so its route is informational.
 */
export const LIGHTER_BRIDGE_CONFIG = {
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
export const LIGHTER_MARGIN_MODE_CROSS = 0;
export const LIGHTER_MARGIN_MODE_ISOLATED = 1;
//# sourceMappingURL=lighterConfig.mjs.map