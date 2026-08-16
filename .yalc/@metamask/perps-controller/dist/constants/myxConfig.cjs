"use strict";
/**
 * MYX Protocol Configuration Constants
 *
 * Configuration for market display, price fetching, and trading.
 * Based on MYX SDK patterns.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MYX_EXECUTION_FEE_TOKEN = exports.MYX_PROTOCOL_FEE_RATE = exports.MYX_FEE_RATE = exports.MYX_MINIMUM_ORDER_SIZE_USD = exports.MYX_MAX_LEVERAGE = exports.MYX_DEFAULT_SLIPPAGE_BPS = exports.MYX_MAX_RETRIES = exports.MYX_HTTP_TIMEOUT_MS = exports.MYX_PRICE_POLLING_INTERVAL_MS = exports.fromMYXCollateral = exports.toMYXSize = exports.fromMYXSize = exports.toMYXPrice = exports.fromMYXPrice = exports.MYX_ASSET_CONFIGS = exports.USDT_BNB_MAINNET = exports.USDT_BNB_TESTNET = exports.MYX_COLLATERAL_TOKEN_MAINNET = exports.MYX_COLLATERAL_TOKEN_TESTNET = exports.MYX_COLLATERAL_DECIMALS = exports.MYX_SIZE_DECIMALS = exports.MYX_PRICE_DECIMALS = exports.getMYXHttpEndpoint = exports.MYX_ENDPOINTS = exports.getMYXChainId = exports.MYX_TESTNET_CAIP_CHAIN_ID = exports.MYX_MAINNET_CAIP_CHAIN_ID = exports.MYX_TESTNET_CHAIN_ID = exports.MYX_MAINNET_CHAIN_ID = void 0;
const bignumber_js_1 = require("bignumber.js");
// ============================================================================
// Network Constants
// ============================================================================
/**
 * MYX Chain IDs
 * Mainnet: BNB Chain (56)
 * Testnet: Linea Sepolia (59141) — primary testnet chain with most active pools.
 * The testnet API also has one pool on Arbitrum Sepolia (421614) but it has no
 * ticker data, so Linea Sepolia is the effective testnet chain.
 */
exports.MYX_MAINNET_CHAIN_ID = '56';
exports.MYX_TESTNET_CHAIN_ID = '59141';
exports.MYX_MAINNET_CAIP_CHAIN_ID = `eip155:${exports.MYX_MAINNET_CHAIN_ID}`;
exports.MYX_TESTNET_CAIP_CHAIN_ID = `eip155:${exports.MYX_TESTNET_CHAIN_ID}`;
/**
 * Get numeric chain ID for MYX network
 *
 * @param network - The MYX network environment (mainnet or testnet).
 * @returns The numeric chain ID for the specified network.
 */
function getMYXChainId(network) {
    return network === 'testnet'
        ? parseInt(exports.MYX_TESTNET_CHAIN_ID, 10)
        : parseInt(exports.MYX_MAINNET_CHAIN_ID, 10);
}
exports.getMYXChainId = getMYXChainId;
// ============================================================================
// API Endpoints
// ============================================================================
/**
 * MYX REST and WebSocket endpoints
 */
exports.MYX_ENDPOINTS = {
    mainnet: {
        http: 'https://api.myx.finance',
        ws: 'wss://oapi.myx.finance/ws',
    },
    testnet: {
        http: 'https://api-test.myx.cash',
        ws: 'wss://oapi-test.myx.cash/ws',
    },
};
/**
 * Get HTTP endpoint for network
 *
 * @param network - The MYX network environment (mainnet or testnet).
 * @returns The HTTP API endpoint URL for the specified network.
 */
function getMYXHttpEndpoint(network) {
    return exports.MYX_ENDPOINTS[network].http;
}
exports.getMYXHttpEndpoint = getMYXHttpEndpoint;
// ============================================================================
// Decimal Constants
// ============================================================================
/**
 * MYX API returns prices as normal floating-point strings (e.g. "64854.76").
 * No decimal scaling is needed for prices from the REST/WS API.
 *
 * Note: The SDK's internal contract layer uses 30 decimals, but the API
 * endpoints (tickers, candles, order history) return human-readable values.
 */
exports.MYX_PRICE_DECIMALS = 0;
/**
 * MYX uses 18 decimals for position sizes
 */
exports.MYX_SIZE_DECIMALS = 18;
/**
 * MYX uses 18 decimals for collateral amounts (USDT on BNB)
 */
exports.MYX_COLLATERAL_DECIMALS = 18;
// ============================================================================
// Token Addresses
// ============================================================================
/**
 * Collateral token address — testnet (USDC on Linea Sepolia)
 * From SDK: LINEA_SEPOLIA.USDC
 */
exports.MYX_COLLATERAL_TOKEN_TESTNET = '0xD984fd34f91F92DA0586e1bE82E262fF27DC431b';
/**
 * Collateral token address — mainnet (BUSD on BNB, per pool quoteToken)
 * Note: individual pools may use different quote tokens
 */
exports.MYX_COLLATERAL_TOKEN_MAINNET = '0x8bfc51e1928e91e47c6734983ac018b2fc0adf4e';
/** @deprecated Use MYX_COLLATERAL_TOKEN_TESTNET */
exports.USDT_BNB_TESTNET = exports.MYX_COLLATERAL_TOKEN_TESTNET;
/** @deprecated Use MYX_COLLATERAL_TOKEN_MAINNET */
exports.USDT_BNB_MAINNET = exports.MYX_COLLATERAL_TOKEN_MAINNET;
/**
 * Collateral token configuration by network
 */
exports.MYX_ASSET_CONFIGS = {
    USDT: {
        mainnet: {
            chainId: exports.MYX_MAINNET_CAIP_CHAIN_ID,
            tokenAddress: exports.MYX_COLLATERAL_TOKEN_MAINNET,
        },
        testnet: {
            chainId: exports.MYX_TESTNET_CAIP_CHAIN_ID,
            tokenAddress: exports.MYX_COLLATERAL_TOKEN_TESTNET,
        },
    },
};
// ============================================================================
// Decimal Conversion Helpers
// ============================================================================
/**
 * Convert MYX API price string to standard number.
 *
 * MYX API returns normal floating-point price strings (e.g. "64854.76"),
 * NOT 30-decimal scaled integers. This is a simple parseFloat.
 *
 * @param myxPrice - Price string from MYX API (e.g. "64854.760266796727")
 * @returns Standard decimal number
 */
function fromMYXPrice(myxPrice) {
    if (!myxPrice || myxPrice === '0') {
        return 0;
    }
    const parsed = parseFloat(myxPrice);
    return isNaN(parsed) ? 0 : parsed;
}
exports.fromMYXPrice = fromMYXPrice;
/**
 * Convert standard number to MYX API price string.
 *
 * MYX API uses normal floating-point strings, so this is a simple toString.
 *
 * @param price - Standard decimal number
 * @returns Price string for MYX API
 */
function toMYXPrice(price) {
    const parsed = typeof price === 'string' ? parseFloat(price) : price;
    return isNaN(parsed) ? '0' : parsed.toString();
}
exports.toMYXPrice = toMYXPrice;
/**
 * Convert MYX SDK size (18 decimals) to standard number
 *
 * @param myxSize - Size string in 18-decimal format from SDK
 * @returns Standard decimal number
 */
function fromMYXSize(myxSize) {
    if (!myxSize || myxSize === '0') {
        return 0;
    }
    try {
        const bn = new bignumber_js_1.BigNumber(myxSize);
        if (bn.isNaN()) {
            return 0;
        }
        const divisor = new bignumber_js_1.BigNumber(10).pow(exports.MYX_SIZE_DECIMALS);
        return bn.dividedBy(divisor).toNumber();
    }
    catch {
        return 0;
    }
}
exports.fromMYXSize = fromMYXSize;
/**
 * Convert standard number to MYX SDK size format (18 decimals)
 *
 * @param size - Standard decimal number
 * @returns Size string in 18-decimal format for SDK
 */
function toMYXSize(size) {
    try {
        const bn = new bignumber_js_1.BigNumber(size);
        if (bn.isNaN()) {
            return '0';
        }
        const multiplier = new bignumber_js_1.BigNumber(10).pow(exports.MYX_SIZE_DECIMALS);
        return bn.multipliedBy(multiplier).toFixed(0);
    }
    catch {
        return '0';
    }
}
exports.toMYXSize = toMYXSize;
/**
 * Convert MYX SDK collateral (18 decimals) to standard number
 *
 * @param myxCollateral - Collateral string in 18-decimal format from SDK
 * @returns Standard decimal number
 */
function fromMYXCollateral(myxCollateral) {
    if (!myxCollateral || myxCollateral === '0') {
        return 0;
    }
    try {
        const bn = new bignumber_js_1.BigNumber(myxCollateral);
        if (bn.isNaN()) {
            return 0;
        }
        const divisor = new bignumber_js_1.BigNumber(10).pow(exports.MYX_COLLATERAL_DECIMALS);
        return bn.dividedBy(divisor).toNumber();
    }
    catch {
        return 0;
    }
}
exports.fromMYXCollateral = fromMYXCollateral;
// ============================================================================
// REST API Configuration
// ============================================================================
/**
 * Price polling interval in milliseconds
 * Using 5 seconds as a fallback for unreliable WebSocket
 */
exports.MYX_PRICE_POLLING_INTERVAL_MS = 5000;
/**
 * HTTP request timeout in milliseconds
 */
exports.MYX_HTTP_TIMEOUT_MS = 10000;
/**
 * Maximum retries for failed API requests
 */
exports.MYX_MAX_RETRIES = 3;
/**
 * Default slippage in basis points for MYX orders (1% — matches SDK default)
 */
exports.MYX_DEFAULT_SLIPPAGE_BPS = 100;
/**
 * Maximum leverage supported by MYX (most markets)
 */
exports.MYX_MAX_LEVERAGE = 100;
/**
 * Minimum order size in USD
 */
exports.MYX_MINIMUM_ORDER_SIZE_USD = 10;
/**
 * MYX fee rates (placeholder — will be replaced with per-market rates)
 */
exports.MYX_FEE_RATE = 0.0005; // 0.05% total fee rate
exports.MYX_PROTOCOL_FEE_RATE = 0.0005; // Protocol taker fee
/**
 * USDT execution fee token address per network (used for order execution fees)
 */
exports.MYX_EXECUTION_FEE_TOKEN = {
    testnet: exports.MYX_COLLATERAL_TOKEN_TESTNET,
    mainnet: exports.MYX_COLLATERAL_TOKEN_MAINNET,
};
//# sourceMappingURL=myxConfig.cjs.map