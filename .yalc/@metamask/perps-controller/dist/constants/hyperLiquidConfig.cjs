"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.INITIAL_AMOUNT_UI_PROGRESS = exports.HIP3_MARGIN_CONFIG = exports.MAINNET_HIP3_CONFIG = exports.TESTNET_HIP3_CONFIG = exports.getHyperLiquidAssetName = exports.HYPERLIQUID_ASSET_NAMES = exports.HIP3_ASSET_MARKET_TYPES = exports.SPOT_ASSET_ID_OFFSET = exports.BASIS_POINTS_DIVISOR = exports.HIP3_ASSET_ID_CONFIG = exports.HYPERLIQUID_CONFIG = exports.CAIP_ASSET_NAMESPACES = exports.getSupportedAssets = exports.getBridgeInfo = exports.getCaipChainId = exports.getChainId = exports.getWebSocketEndpoint = exports.HYPERLIQUID_WITHDRAWAL_MINUTES = exports.DEPOSIT_CONFIG = exports.REFERRAL_CONFIG = exports.BUILDER_FEE_CONFIG = exports.HIP3_FEE_CONFIG = exports.FEE_RATES = exports.TRADING_DEFAULTS = exports.HYPERLIQUID_TRANSPORT_CONFIG = exports.HYPERLIQUID_BRIDGE_CONTRACTS = exports.HYPERLIQUID_ASSET_CONFIGS = exports.METAMASK_PERPS_ICONS_BASE_URL = exports.HYPERLIQUID_ASSET_ICONS_BASE_URL = exports.HYPERLIQUID_ENDPOINTS = exports.USDC_TOKEN_ICON_URL = exports.USDC_ARBITRUM_TESTNET_ADDRESS = exports.USDC_ARBITRUM_MAINNET_ADDRESS = exports.USDC_ETHEREUM_MAINNET_ADDRESS = exports.ARBITRUM_SEPOLIA_CHAIN_ID = exports.TOKEN_DECIMALS = exports.USDC_DECIMALS = exports.USDC_NAME = exports.USDC_SYMBOL = exports.canonicalizeHyperLiquidDexes = exports.HYPERLIQUID_NETWORK_NAME = exports.HYPERLIQUID_TESTNET_CAIP_CHAIN_ID = exports.HYPERLIQUID_MAINNET_CAIP_CHAIN_ID = exports.HYPERLIQUID_TESTNET_CHAIN_ID = exports.HYPERLIQUID_MAINNET_CHAIN_ID = exports.ARBITRUM_TESTNET_CAIP_CHAIN_ID = exports.ARBITRUM_MAINNET_CAIP_CHAIN_ID = exports.ARBITRUM_TESTNET_CHAIN_ID = exports.ARBITRUM_MAINNET_CHAIN_ID = exports.ARBITRUM_MAINNET_CHAIN_ID_HEX = void 0;
exports.PROGRESS_BAR_COMPLETION_DELAY_MS = exports.WITHDRAWAL_PROGRESS_STAGES = void 0;
const index_js_1 = require("../types/index.cjs");
// Network constants
exports.ARBITRUM_MAINNET_CHAIN_ID_HEX = '0xa4b1';
exports.ARBITRUM_MAINNET_CHAIN_ID = '42161';
exports.ARBITRUM_TESTNET_CHAIN_ID = '421614';
exports.ARBITRUM_MAINNET_CAIP_CHAIN_ID = `eip155:${exports.ARBITRUM_MAINNET_CHAIN_ID}`;
exports.ARBITRUM_TESTNET_CAIP_CHAIN_ID = `eip155:${exports.ARBITRUM_TESTNET_CHAIN_ID}`;
// Hyperliquid chain constants
exports.HYPERLIQUID_MAINNET_CHAIN_ID = '0x3e7'; // 999 in decimal
exports.HYPERLIQUID_TESTNET_CHAIN_ID = '0x3e6'; // 998 in decimal (assumed)
exports.HYPERLIQUID_MAINNET_CAIP_CHAIN_ID = 'eip155:999';
exports.HYPERLIQUID_TESTNET_CAIP_CHAIN_ID = 'eip155:998';
exports.HYPERLIQUID_NETWORK_NAME = 'Hyperliquid';
/**
 * Return the canonical snapshot identity: main first, then unique DEX ids.
 *
 * @param dexes - DEX identifiers to canonicalize.
 * @returns The canonical DEX identifiers.
 */
function canonicalizeHyperLiquidDexes(dexes) {
    const additionalDexes = new Set(dexes);
    additionalDexes.delete('main');
    return ['main', ...Array.from(additionalDexes).sort()];
}
exports.canonicalizeHyperLiquidDexes = canonicalizeHyperLiquidDexes;
// Token constants
exports.USDC_SYMBOL = 'USDC';
exports.USDC_NAME = 'USD Coin';
exports.USDC_DECIMALS = 6;
exports.TOKEN_DECIMALS = 18;
// Network constants
exports.ARBITRUM_SEPOLIA_CHAIN_ID = '0x66eee'; // 421614 in decimal
// USDC token addresses
exports.USDC_ETHEREUM_MAINNET_ADDRESS = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
exports.USDC_ARBITRUM_MAINNET_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
exports.USDC_ARBITRUM_TESTNET_ADDRESS = '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d';
// USDC token icon URL using MetaMask's official Token Icons API
// Format: https://static.cx.metamask.io/api/v1/tokenIcons/{chainId}/{contractAddress}.png
// This URL follows the same pattern used throughout MetaMask (bridges, swaps, etc.)
exports.USDC_TOKEN_ICON_URL = `https://static.cx.metamask.io/api/v1/tokenIcons/1/${exports.USDC_ETHEREUM_MAINNET_ADDRESS}.png`;
// WebSocket endpoints
exports.HYPERLIQUID_ENDPOINTS = {
    mainnet: 'wss://api.hyperliquid.xyz/ws',
    testnet: 'wss://api.hyperliquid-testnet.xyz/ws',
};
// Asset icons base URL (HyperLiquid CDN - fallback source)
exports.HYPERLIQUID_ASSET_ICONS_BASE_URL = 'https://app.hyperliquid.xyz/coins/';
// MetaMask-hosted Perps asset icons (primary source)
// Assets uploaded to: https://github.com/MetaMask/contract-metadata/tree/master/icons/eip155:999
// HIP-3 assets use format: hip3:dex_SYMBOL.svg (e.g., hip3:xyz_AAPL.svg)
// Regular assets use format: SYMBOL.svg (e.g., BTC.svg)
exports.METAMASK_PERPS_ICONS_BASE_URL = 'https://raw.githubusercontent.com/MetaMask/contract-metadata/master/icons/eip155:999/';
// Asset configurations for multichain abstraction
exports.HYPERLIQUID_ASSET_CONFIGS = {
    usdc: {
        mainnet: `${exports.ARBITRUM_MAINNET_CAIP_CHAIN_ID}/erc20:0xaf88d065e77c8cC2239327C5EDb3A432268e5831/default`,
        testnet: `${exports.ARBITRUM_TESTNET_CAIP_CHAIN_ID}/erc20:0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d/default`,
    },
};
// HyperLiquid bridge contract addresses for direct USDC deposits
// These are the official bridge contracts where USDC must be sent to credit user's HyperLiquid account
exports.HYPERLIQUID_BRIDGE_CONTRACTS = {
    mainnet: {
        chainId: exports.ARBITRUM_MAINNET_CAIP_CHAIN_ID,
        contractAddress: '0x2df1c51e09aecf9cacb7bc98cb1742757f163df7',
    },
    testnet: {
        chainId: exports.ARBITRUM_TESTNET_CAIP_CHAIN_ID,
        contractAddress: '0x08cfc1B6b2dCF36A1480b99353A354AA8AC56f89',
    },
};
// SDK transport configuration
exports.HYPERLIQUID_TRANSPORT_CONFIG = {
    timeout: 10000,
    keepAlive: { interval: 30000 },
    reconnect: {
        maxRetries: 5,
        connectionTimeout: 10000,
    },
};
// Trading configuration constants
exports.TRADING_DEFAULTS = {
    leverage: 3, // 3x default leverage
    marginPercent: 10, // 10% fixed margin default
    takeProfitPercent: 0.3, // 30% take profit
    stopLossPercent: 0.1, // 10% stop loss
    amount: {
        mainnet: 10, // $10 minimum order size
        testnet: 10, // $10 minimum order size
    },
};
// Fee configuration
// Note: These are base rates (Tier 0, no discounts)
// Actual fees will be calculated based on user's volume tier and staking
exports.FEE_RATES = {
    taker: 0.00045, // 0.045% - Market orders and aggressive limit orders
    maker: 0.00015, // 0.015% - Limit orders that add liquidity
};
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
exports.HIP3_FEE_CONFIG = {
    /**
     * Growth Mode multiplier - 90% fee reduction for assets in growth phase
     * This is a protocol constant from HyperLiquid's fee formula
     */
    GrowthModeScale: 0.1,
    /**
     * Default deployerFeeScale when API is unavailable
     * Most HIP-3 DEXs use 1.0, which results in 2x base fees
     */
    DefaultDeployerFeeScale: 1.0,
    /**
     * Cache TTL for perpDexs data (5 minutes)
     * Fee scales rarely change, so longer cache is acceptable
     */
    PerpDexsCacheTtlMs: 5 * 60 * 1000,
    /**
     * @deprecated Use dynamic calculation via calculateHip3FeeMultiplier()
     * Kept for backwards compatibility during migration
     */
    FeeMultiplier: 2,
};
const BUILDER_FEE_MAX_FEE_DECIMAL = 0.001;
// Builder fee configuration
exports.BUILDER_FEE_CONFIG = {
    // Test builder wallet
    TestnetBuilder: '0x724e57771ba749650875bd8adb2e29a85d0cacfa',
    // Production builder wallet
    MainnetBuilder: '0xe95a5e31904e005066614247d309e00d8ad753aa',
    // Fee in decimal (10 bp = 0.1%)
    MaxFeeDecimal: BUILDER_FEE_MAX_FEE_DECIMAL,
    MaxFeeTenthsBps: BUILDER_FEE_MAX_FEE_DECIMAL * 100000,
    MaxFeeRate: `${(BUILDER_FEE_MAX_FEE_DECIMAL * 100)
        .toFixed(4)
        .replace(/\.?0+$/u, '')}%`,
};
// Referral code configuration
exports.REFERRAL_CONFIG = {
    // Production referral code
    MainnetCode: 'MMCSI',
    // Development/testnet referral code
    TestnetCode: 'MMCSITEST',
};
// Deposit constants
exports.DEPOSIT_CONFIG = {
    EstimatedGasLimit: 100000, // Estimated gas limit for bridge deposit
    DefaultSlippage: 1, // 1% default slippage for bridge quotes
    BridgeQuoteTimeout: 1000, // 1 second timeout for bridge quotes
    RefreshRate: 30000, // 30 seconds quote refresh rate
    EstimatedTime: {
        DirectDeposit: '3-5 seconds', // Direct USDC deposit on Arbitrum
        SameChainSwap: '30-60 seconds', // Swap on same chain before deposit
    },
};
// Withdrawal constants (HyperLiquid-specific)
exports.HYPERLIQUID_WITHDRAWAL_MINUTES = 5; // HyperLiquid withdrawal processing time in minutes
// Configuration helpers
function getWebSocketEndpoint(isTestnet) {
    return isTestnet
        ? exports.HYPERLIQUID_ENDPOINTS.testnet
        : exports.HYPERLIQUID_ENDPOINTS.mainnet;
}
exports.getWebSocketEndpoint = getWebSocketEndpoint;
function getChainId(isTestnet) {
    return isTestnet ? exports.ARBITRUM_TESTNET_CHAIN_ID : exports.ARBITRUM_MAINNET_CHAIN_ID;
}
exports.getChainId = getChainId;
function getCaipChainId(isTestnet) {
    const network = isTestnet ? 'testnet' : 'mainnet';
    return exports.HYPERLIQUID_BRIDGE_CONTRACTS[network].chainId;
}
exports.getCaipChainId = getCaipChainId;
function getBridgeInfo(isTestnet) {
    const network = isTestnet ? 'testnet' : 'mainnet';
    return exports.HYPERLIQUID_BRIDGE_CONTRACTS[network];
}
exports.getBridgeInfo = getBridgeInfo;
function getSupportedAssets(isTestnet) {
    const network = isTestnet ? 'testnet' : 'mainnet';
    return Object.values(exports.HYPERLIQUID_ASSET_CONFIGS).map((config) => config[network]);
}
exports.getSupportedAssets = getSupportedAssets;
// CAIP asset namespace constants
exports.CAIP_ASSET_NAMESPACES = {
    Erc20: 'erc20',
};
/**
 * HyperLiquid protocol-specific configuration
 * Contains constants specific to HyperLiquid's perps exchange
 */
exports.HYPERLIQUID_CONFIG = {
    // Exchange name used in predicted funding data
    // HyperLiquid uses 'HlPerp' as their perps exchange identifier
    ExchangeName: 'HlPerp',
    // Maximum allowed deviation of the market (mid) price from the oracle (reference)
    // price before HyperLiquid rejects orders. HyperLiquid enforces "Order price cannot
    // be more than 95% away from the reference price", which makes markets — most often
    // HIP-3 builder-deployed ones — temporarily untradable when the mid price drifts past
    // this limit. Expressed as a decimal fraction (0.95 = 95%).
    // Protocol rule, not a UI warning threshold (see VALIDATION_THRESHOLDS.PriceDeviation).
    OraclePriceDeviationLimit: 0.95,
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
exports.HIP3_ASSET_ID_CONFIG = {
    // Base offset for HIP-3 asset IDs (100000)
    // Ensures HIP-3 asset IDs don't conflict with main DEX indices
    BaseAssetId: 100000,
    // Multiplier for DEX index in asset ID calculation (10000)
    // Allocates 10000 asset ID slots per DEX (0-9999)
    DexMultiplier: 10000,
};
/**
 * Basis points conversion constant
 * 1 basis point (bp) = 0.01% = 0.0001 as decimal
 * Used for fee discount calculations (e.g., 6500 bps = 65%)
 */
exports.BASIS_POINTS_DIVISOR = 10000;
/**
 * Offset added to spot market pair index to derive the spot asset ID
 * used in HyperLiquid order routing.
 * Per HyperLiquid protocol: spotAssetId = SPOT_ASSET_ID_OFFSET + pairIndex
 */
exports.SPOT_ASSET_ID_OFFSET = 10000;
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
exports.HIP3_ASSET_MARKET_TYPES = {
    // xyz DEX - Stocks (US)
    'xyz:TSLA': index_js_1.MarketCategory.Stock,
    'xyz:NVDA': index_js_1.MarketCategory.Stock,
    'xyz:INTC': index_js_1.MarketCategory.Stock,
    'xyz:MU': index_js_1.MarketCategory.Stock,
    'xyz:CRCL': index_js_1.MarketCategory.Stock,
    'xyz:HOOD': index_js_1.MarketCategory.Stock,
    'xyz:SNDK': index_js_1.MarketCategory.Stock,
    'xyz:GOOGL': index_js_1.MarketCategory.Stock,
    'xyz:COIN': index_js_1.MarketCategory.Stock,
    'xyz:ORCL': index_js_1.MarketCategory.Stock,
    'xyz:AMZN': index_js_1.MarketCategory.Stock,
    'xyz:PLTR': index_js_1.MarketCategory.Stock,
    'xyz:AAPL': index_js_1.MarketCategory.Stock,
    'xyz:META': index_js_1.MarketCategory.Stock,
    'xyz:AMD': index_js_1.MarketCategory.Stock,
    'xyz:MSFT': index_js_1.MarketCategory.Stock,
    'xyz:BABA': index_js_1.MarketCategory.Stock,
    'xyz:RIVN': index_js_1.MarketCategory.Stock,
    'xyz:NFLX': index_js_1.MarketCategory.Stock,
    'xyz:COST': index_js_1.MarketCategory.Stock,
    'xyz:LLY': index_js_1.MarketCategory.Stock,
    'xyz:TSM': index_js_1.MarketCategory.Stock,
    'xyz:MSTR': index_js_1.MarketCategory.Stock,
    'xyz:CRWV': index_js_1.MarketCategory.Stock,
    'xyz:GME': index_js_1.MarketCategory.Stock,
    'xyz:HIMS': index_js_1.MarketCategory.Stock,
    'xyz:USAR': index_js_1.MarketCategory.Stock,
    'xyz:DKNG': index_js_1.MarketCategory.Stock,
    'xyz:BIRD': index_js_1.MarketCategory.Stock,
    'xyz:RKLB': index_js_1.MarketCategory.Stock,
    'xyz:MRVL': index_js_1.MarketCategory.Stock,
    'xyz:ZM': index_js_1.MarketCategory.Stock,
    'xyz:EBAY': index_js_1.MarketCategory.Stock,
    'xyz:PURRDAT': index_js_1.MarketCategory.Stock,
    'xyz:ARM': index_js_1.MarketCategory.Stock,
    'xyz:BX': index_js_1.MarketCategory.Stock,
    'xyz:LITE': index_js_1.MarketCategory.Stock,
    // xyz DEX - Stocks (Korea)
    'xyz:SKHX': index_js_1.MarketCategory.Stock,
    'xyz:SMSN': index_js_1.MarketCategory.Stock,
    'xyz:HYUNDAI': index_js_1.MarketCategory.Stock,
    // xyz DEX - Stocks (Japan)
    'xyz:SOFTBANK': index_js_1.MarketCategory.Stock,
    'xyz:KIOXIA': index_js_1.MarketCategory.Stock,
    // xyz DEX - Pre-IPO
    'xyz:CBRS': index_js_1.MarketCategory.PreIpo,
    'xyz:SPCX': index_js_1.MarketCategory.PreIpo,
    'xyz:IPOP': index_js_1.MarketCategory.PreIpo,
    // xyz DEX - Indices
    'xyz:SP500': index_js_1.MarketCategory.Index,
    'xyz:XYZ100': index_js_1.MarketCategory.Index,
    'xyz:JP225': index_js_1.MarketCategory.Index,
    'xyz:KR200': index_js_1.MarketCategory.Index,
    'xyz:VIX': index_js_1.MarketCategory.Index,
    // xyz DEX - ETFs
    'xyz:EWY': index_js_1.MarketCategory.Etf,
    'xyz:EWJ': index_js_1.MarketCategory.Etf,
    'xyz:EWT': index_js_1.MarketCategory.Etf,
    'xyz:EWZ': index_js_1.MarketCategory.Etf,
    'xyz:URNM': index_js_1.MarketCategory.Etf,
    'xyz:DRAM': index_js_1.MarketCategory.Etf,
    'xyz:XLE': index_js_1.MarketCategory.Etf,
    // xyz DEX - Commodities
    'xyz:GOLD': index_js_1.MarketCategory.Commodity,
    'xyz:SILVER': index_js_1.MarketCategory.Commodity,
    'xyz:CL': index_js_1.MarketCategory.Commodity,
    'xyz:WTIOIL': index_js_1.MarketCategory.Commodity,
    'xyz:COPPER': index_js_1.MarketCategory.Commodity,
    'xyz:ALUMINIUM': index_js_1.MarketCategory.Commodity,
    'xyz:URANIUM': index_js_1.MarketCategory.Commodity,
    'xyz:NATGAS': index_js_1.MarketCategory.Commodity,
    'xyz:PLATINUM': index_js_1.MarketCategory.Commodity,
    'xyz:PALLADIUM': index_js_1.MarketCategory.Commodity,
    'xyz:BRENTOIL': index_js_1.MarketCategory.Commodity,
    // xyz DEX - Forex
    'xyz:EUR': index_js_1.MarketCategory.Forex,
    'xyz:JPY': index_js_1.MarketCategory.Forex,
    'xyz:GBP': index_js_1.MarketCategory.Forex,
    'xyz:DXY': index_js_1.MarketCategory.Forex,
};
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
exports.HYPERLIQUID_ASSET_NAMES = {
    // Main DEX - Crypto majors
    BTC: 'Bitcoin',
    ETH: 'Ethereum',
    SOL: 'Solana',
    XRP: 'XRP',
    BNB: 'BNB',
    DOGE: 'Dogecoin',
    ADA: 'Cardano',
    AVAX: 'Avalanche',
    LINK: 'Chainlink',
    LTC: 'Litecoin',
    DOT: 'Polkadot',
    BCH: 'Bitcoin Cash',
    TRX: 'TRON',
    MATIC: 'Polygon',
    ARB: 'Arbitrum',
    OP: 'Optimism',
    SUI: 'Sui',
    APT: 'Aptos',
    ATOM: 'Cosmos',
    NEAR: 'NEAR Protocol',
    INJ: 'Injective',
    TIA: 'Celestia',
    SEI: 'Sei',
    UNI: 'Uniswap',
    AAVE: 'Aave',
    MKR: 'Maker',
    CRV: 'Curve DAO',
    LDO: 'Lido DAO',
    PEPE: 'Pepe',
    WIF: 'dogwifhat',
    BONK: 'Bonk',
    SHIB: 'Shiba Inu',
    ETC: 'Ethereum Classic',
    FIL: 'Filecoin',
    HBAR: 'Hedera',
    ICP: 'Internet Computer',
    STX: 'Stacks',
    RUNE: 'THORChain',
    TON: 'Toncoin',
    KAS: 'Kaspa',
    FET: 'Fetch.ai',
    ENA: 'Ethena',
    JUP: 'Jupiter',
    PYTH: 'Pyth Network',
    JTO: 'Jito',
    STRK: 'Starknet',
    BLUR: 'Blur',
    GMX: 'GMX',
    DYDX: 'dYdX',
    HYPE: 'Hyperliquid',
    // xyz DEX - Stocks (US)
    'xyz:TSLA': 'Tesla',
    'xyz:NVDA': 'NVIDIA',
    'xyz:INTC': 'Intel',
    'xyz:MU': 'Micron Technology',
    'xyz:CRCL': 'Circle',
    'xyz:HOOD': 'Robinhood',
    'xyz:SNDK': 'SanDisk',
    'xyz:GOOGL': 'Alphabet (Google)',
    'xyz:COIN': 'Coinbase',
    'xyz:ORCL': 'Oracle',
    'xyz:AMZN': 'Amazon',
    'xyz:PLTR': 'Palantir',
    'xyz:AAPL': 'Apple',
    'xyz:META': 'Meta Platforms',
    'xyz:AMD': 'AMD',
    'xyz:MSFT': 'Microsoft',
    'xyz:BABA': 'Alibaba',
    'xyz:RIVN': 'Rivian',
    'xyz:NFLX': 'Netflix',
    'xyz:COST': 'Costco',
    'xyz:LLY': 'Eli Lilly',
    'xyz:TSM': 'Taiwan Semiconductor',
    'xyz:MSTR': 'Strategy (MicroStrategy)',
    'xyz:CRWV': 'CoreWeave',
    'xyz:GME': 'GameStop',
    'xyz:HIMS': 'Hims & Hers',
    'xyz:USAR': 'USA Rare Earth',
    'xyz:DKNG': 'DraftKings',
    'xyz:RKLB': 'Rocket Lab',
    'xyz:MRVL': 'Marvell',
    'xyz:ZM': 'Zoom',
    'xyz:EBAY': 'eBay',
    'xyz:ARM': 'Arm Holdings',
    'xyz:BX': 'Blackstone',
    'xyz:LITE': 'Lumentum',
    // xyz DEX - Stocks (Korea)
    'xyz:SKHX': 'SK Hynix',
    'xyz:SMSN': 'Samsung Electronics',
    'xyz:HYUNDAI': 'Hyundai Motor',
    // xyz DEX - Stocks (Japan)
    'xyz:SOFTBANK': 'SoftBank Group',
    'xyz:KIOXIA': 'Kioxia',
    // xyz DEX - Pre-IPO
    'xyz:SPCX': 'SpaceX',
    'xyz:CBRS': 'Cerebras',
    'xyz:IPOP': 'Quantinuum',
    // xyz DEX - Indices
    'xyz:SP500': 'S&P 500',
    'xyz:JP225': 'Nikkei 225',
    'xyz:KR200': 'KOSPI 200',
    'xyz:VIX': 'CBOE Volatility Index',
    // xyz DEX - ETFs
    'xyz:EWY': 'iShares MSCI South Korea ETF',
    'xyz:EWJ': 'iShares MSCI Japan ETF',
    'xyz:EWT': 'iShares MSCI Taiwan ETF',
    'xyz:EWZ': 'iShares MSCI Brazil ETF',
    'xyz:URNM': 'Sprott Uranium Miners ETF',
    'xyz:XLE': 'Energy Select Sector SPDR Fund',
    // xyz DEX - Commodities
    'xyz:GOLD': 'Gold',
    'xyz:SILVER': 'Silver',
    'xyz:CL': 'Crude Oil',
    'xyz:WTIOIL': 'WTI Crude Oil',
    'xyz:COPPER': 'Copper',
    'xyz:ALUMINIUM': 'Aluminium',
    'xyz:URANIUM': 'Uranium',
    'xyz:NATGAS': 'Natural Gas',
    'xyz:PLATINUM': 'Platinum',
    'xyz:PALLADIUM': 'Palladium',
    'xyz:BRENTOIL': 'Brent Crude Oil',
    // xyz DEX - Forex
    'xyz:EUR': 'Euro',
    'xyz:JPY': 'Japanese Yen',
    'xyz:GBP': 'British Pound',
    'xyz:DXY': 'US Dollar Index',
};
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
function getHyperLiquidAssetName(symbol, names = exports.HYPERLIQUID_ASSET_NAMES) {
    return names[symbol] ?? symbol;
}
exports.getHyperLiquidAssetName = getHyperLiquidAssetName;
/**
 * Testnet-specific HIP-3 DEX configuration
 *
 * On testnet, there are many HIP-3 DEXs (test deployments from various builders).
 * Subscribing to all of them causes connection/subscription overload and instability.
 * This configuration limits which DEXs are discovered and subscribed to on testnet.
 */
exports.TESTNET_HIP3_CONFIG = {
    /**
     * Allowed DEX names for testnet
     * Empty array = main DEX only (no HIP-3 DEXs)
     * Add specific DEX names to test with particular HIP-3 DEXs: ['testdex1', 'testdex2']
     */
    EnabledDexs: ['xyz'],
    /**
     * Set to true to enable full HIP-3 discovery on testnet (not recommended)
     * When false, only DEXs in ENABLED_DEXS are used
     */
    AutoDiscoverAll: false,
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
exports.MAINNET_HIP3_CONFIG = {
    /**
     * Set to true to enable full HIP-3 discovery on mainnet
     * When false, DEXs are filtered based on the allowlist markets feature flag
     * (recommended for production to reduce subscription overhead)
     */
    AutoDiscoverAll: false,
};
/**
 * HIP-3 margin management configuration
 * Controls margin buffers and auto-rebalance behavior for HIP-3 DEXes with isolated margin
 *
 * Background: HyperLiquid validates spendableBalance >= totalRequiredMargin BEFORE reallocating
 * existing locked margin. This requires temporary over-funding when increasing positions,
 * followed by automatic cleanup to minimize locked capital.
 */
exports.HIP3_MARGIN_CONFIG = {
    /**
     * Margin buffer multiplier for fees and slippage (0.3% = multiply by 1.003)
     * Covers HyperLiquid's max taker fee (0.035%) with comfortable margin
     */
    BufferMultiplier: 1.003,
    /**
     * Desired buffer to keep on HIP-3 DEX after auto-rebalance (USDC amount)
     * Small buffer allows quick follow-up orders without transfers
     */
    RebalanceDesiredBuffer: 0.1,
    /**
     * Minimum excess threshold to trigger auto-rebalance (USDC amount)
     * Prevents unnecessary transfers for tiny amounts
     */
    RebalanceMinThreshold: 0.1,
};
// Progress bar constants
exports.INITIAL_AMOUNT_UI_PROGRESS = 10;
exports.WITHDRAWAL_PROGRESS_STAGES = [
    25, 35, 45, 55, 65, 75, 85, 90, 95, 98,
];
exports.PROGRESS_BAR_COMPLETION_DELAY_MS = 500;
//# sourceMappingURL=hyperLiquidConfig.cjs.map