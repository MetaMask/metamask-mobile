import type { CaipAssetId, CaipChainId, Hex } from '@metamask/utils';
import type {
  HyperLiquidNetwork,
  HyperLiquidEndpoints,
  HyperLiquidAssetConfigs,
  BridgeContractConfig,
  HyperLiquidBridgeContracts,
  HyperLiquidTransportConfig,
  TradingDefaultsConfig,
  FeeRatesConfig,
} from '../types/perps-types';

// Network constants
export const ARBITRUM_MAINNET_CHAIN_ID_HEX = '0xa4b1';
export const ARBITRUM_MAINNET_CHAIN_ID = '42161';
export const ARBITRUM_TESTNET_CHAIN_ID = '421614';
export const ARBITRUM_MAINNET_CAIP_CHAIN_ID = `eip155:${ARBITRUM_MAINNET_CHAIN_ID}`;
export const ARBITRUM_TESTNET_CAIP_CHAIN_ID = `eip155:${ARBITRUM_TESTNET_CHAIN_ID}`;

// Hyperliquid chain constants
export const HYPERLIQUID_MAINNET_CHAIN_ID = '0x3e7'; // 999 in decimal
export const HYPERLIQUID_TESTNET_CHAIN_ID = '0x3e6'; // 998 in decimal (assumed)
export const HYPERLIQUID_MAINNET_CAIP_CHAIN_ID = 'eip155:999' as CaipChainId;
export const HYPERLIQUID_TESTNET_CAIP_CHAIN_ID = 'eip155:998' as CaipChainId;
export const HYPERLIQUID_NETWORK_NAME = 'Hyperliquid';

// Token constants
export const USDC_SYMBOL = 'USDC';
export const USDC_NAME = 'USD Coin';
export const USDC_DECIMALS = 6;
export const TOKEN_DECIMALS = 18;
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
export const ZERO_BALANCE = '0x0';

// Network constants
export const ARBITRUM_SEPOLIA_CHAIN_ID = '0x66eee'; // 421614 in decimal

// USDC token addresses
export const USDC_ETHEREUM_MAINNET_ADDRESS =
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
export const USDC_ARBITRUM_MAINNET_ADDRESS =
  '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
export const USDC_ARBITRUM_TESTNET_ADDRESS =
  '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d';

// USDC token icon URL using MetaMask's official Token Icons API
// Format: https://static.cx.metamask.io/api/v1/tokenIcons/{chainId}/{contractAddress}.png
// This URL follows the same pattern used throughout MetaMask (bridges, swaps, etc.)
export const USDC_TOKEN_ICON_URL = `https://static.cx.metamask.io/api/v1/tokenIcons/1/${USDC_ETHEREUM_MAINNET_ADDRESS}.png`;

// WebSocket endpoints
export const HYPERLIQUID_ENDPOINTS: HyperLiquidEndpoints = {
  mainnet: 'wss://api.hyperliquid.xyz/ws',
  testnet: 'wss://api.hyperliquid-testnet.xyz/ws',
};

// Asset icons base URL
export const HYPERLIQUID_ASSET_ICONS_BASE_URL =
  'https://app.hyperliquid.xyz/coins/';

// HIP-3 asset icons base URL (for assets with dex:symbol format)
export const HIP3_ASSET_ICONS_BASE_URL =
  'https://raw.githubusercontent.com/MetaMask/contract-metadata/master/icons/eip155%3A999/';

// Asset configurations for multichain abstraction
export const HYPERLIQUID_ASSET_CONFIGS: HyperLiquidAssetConfigs = {
  USDC: {
    mainnet: `${ARBITRUM_MAINNET_CAIP_CHAIN_ID}/erc20:0xaf88d065e77c8cC2239327C5EDb3A432268e5831/default`,
    testnet: `${ARBITRUM_TESTNET_CAIP_CHAIN_ID}/erc20:0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d/default`,
  },
};

// HyperLiquid bridge contract addresses for direct USDC deposits
// These are the official bridge contracts where USDC must be sent to credit user's HyperLiquid account
export const HYPERLIQUID_BRIDGE_CONTRACTS: HyperLiquidBridgeContracts = {
  mainnet: {
    chainId: ARBITRUM_MAINNET_CAIP_CHAIN_ID,
    contractAddress: '0x2df1c51e09aecf9cacb7bc98cb1742757f163df7',
  },
  testnet: {
    chainId: ARBITRUM_TESTNET_CAIP_CHAIN_ID,
    contractAddress: '0x08cfc1B6b2dCF36A1480b99353A354AA8AC56f89',
  },
};

// SDK transport configuration
export const HYPERLIQUID_TRANSPORT_CONFIG: HyperLiquidTransportConfig = {
  timeout: 10_000,
  keepAlive: { interval: 30_000 },
  reconnect: {
    maxRetries: 5,
    connectionTimeout: 10_000,
  },
};

// Trading configuration constants
export const TRADING_DEFAULTS: TradingDefaultsConfig = {
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
export const FEE_RATES: FeeRatesConfig = {
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
export const HIP3_FEE_CONFIG = {
  /**
   * Growth Mode multiplier - 90% fee reduction for assets in growth phase
   * This is a protocol constant from HyperLiquid's fee formula
   */
  GROWTH_MODE_SCALE: 0.1,

  /**
   * Default deployerFeeScale when API is unavailable
   * Most HIP-3 DEXs use 1.0, which results in 2x base fees
   */
  DEFAULT_DEPLOYER_FEE_SCALE: 1.0,

  /**
   * Cache TTL for perpDexs data (5 minutes)
   * Fee scales rarely change, so longer cache is acceptable
   */
  PERP_DEXS_CACHE_TTL_MS: 5 * 60 * 1000,

  /**
   * @deprecated Use dynamic calculation via calculateHip3FeeMultiplier()
   * Kept for backwards compatibility during migration
   */
  FEE_MULTIPLIER: 2,
} as const;

const BUILDER_FEE_MAX_FEE_DECIMAL = 0.001;

// Builder fee configuration
export const BUILDER_FEE_CONFIG = {
  // Test builder wallet
  testnetBuilder: '0x724e57771ba749650875bd8adb2e29a85d0cacfa' as Hex,
  // Production builder wallet
  mainnetBuilder: '0xe95a5e31904e005066614247d309e00d8ad753aa' as Hex,
  // Fee in decimal (10 bp = 0.1%)
  maxFeeDecimal: BUILDER_FEE_MAX_FEE_DECIMAL,
  maxFeeTenthsBps: BUILDER_FEE_MAX_FEE_DECIMAL * 100000,
  maxFeeRate: `${(BUILDER_FEE_MAX_FEE_DECIMAL * 100)
    .toFixed(4)
    .replace(/\.?0+$/, '')}%`,
};

// Referral code configuration
export const REFERRAL_CONFIG = {
  // Production referral code
  mainnetCode: 'MMCSI',
  // Development/testnet referral code
  testnetCode: 'MMCSITEST',
};

// MetaMask fee for deposits (temporary placeholder)
export const METAMASK_DEPOSIT_FEE = '$0.00';

// Withdrawal fees
export const HYPERLIQUID_WITHDRAWAL_FEE = 1; // $1 USD fixed fee
export const METAMASK_WITHDRAWAL_FEE = 0; // $0 - no MM fee for withdrawals
export const METAMASK_WITHDRAWAL_FEE_PLACEHOLDER = '$0.00'; // Display format

// Withdrawal timing
export const WITHDRAWAL_ESTIMATED_TIME = '5 minutes';

// Order book spread constants
export const ORDER_BOOK_SPREAD = {
  // Default bid/ask spread when real order book data is not available
  // This represents a 0.02% spread (2 basis points) which is typical for liquid markets
  DEFAULT_BID_MULTIPLIER: 0.9999, // Bid price is 0.01% below current price
  DEFAULT_ASK_MULTIPLIER: 1.0001, // Ask price is 0.01% above current price
};

// Deposit constants
export const DEPOSIT_CONFIG = {
  estimatedGasLimit: 150000, // Estimated gas limit for bridge deposit
  defaultSlippage: 1, // 1% default slippage for bridge quotes
  bridgeQuoteTimeout: 1000, // 1 second timeout for bridge quotes
  refreshRate: 30000, // 30 seconds quote refresh rate
  estimatedTime: {
    directDeposit: '3-5 seconds', // Direct USDC deposit on Arbitrum
    sameChainSwap: '30-60 seconds', // Swap on same chain before deposit
  },
};

// Withdrawal constants (HyperLiquid-specific)
export const HYPERLIQUID_WITHDRAWAL_MINUTES = 5; // HyperLiquid withdrawal processing time in minutes
export const HYPERLIQUID_WITHDRAWAL_PROGRESS_INTERVAL_MS = 30000; // 30 seconds progress update interval

// Type helpers
export type SupportedAsset = keyof typeof HYPERLIQUID_ASSET_CONFIGS;

// Configuration helpers
export function getWebSocketEndpoint(isTestnet: boolean): string {
  return isTestnet
    ? HYPERLIQUID_ENDPOINTS.testnet
    : HYPERLIQUID_ENDPOINTS.mainnet;
}

export function getChainId(isTestnet: boolean): string {
  return isTestnet ? ARBITRUM_TESTNET_CHAIN_ID : ARBITRUM_MAINNET_CHAIN_ID;
}

export function getCaipChainId(isTestnet: boolean): CaipChainId {
  const network: HyperLiquidNetwork = isTestnet ? 'testnet' : 'mainnet';
  return HYPERLIQUID_BRIDGE_CONTRACTS[network].chainId;
}

export function getBridgeInfo(isTestnet: boolean): BridgeContractConfig {
  const network: HyperLiquidNetwork = isTestnet ? 'testnet' : 'mainnet';
  return HYPERLIQUID_BRIDGE_CONTRACTS[network];
}

export function getSupportedAssets(isTestnet?: boolean): CaipAssetId[] {
  const network = isTestnet ? 'testnet' : 'mainnet';
  return Object.values(HYPERLIQUID_ASSET_CONFIGS).map(
    (config) => config[network],
  );
}

// CAIP asset namespace constants
export const CAIP_ASSET_NAMESPACES = {
  ERC20: 'erc20',
} as const;

/**
 * HyperLiquid protocol-specific configuration
 * Contains constants specific to HyperLiquid's perps exchange
 */
export const HYPERLIQUID_CONFIG = {
  // Exchange name used in predicted funding data
  // HyperLiquid uses 'HlPerp' as their perps exchange identifier
  EXCHANGE_NAME: 'HlPerp',
} as const;

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
export const HIP3_ASSET_ID_CONFIG = {
  // Base offset for HIP-3 asset IDs (100000)
  // Ensures HIP-3 asset IDs don't conflict with main DEX indices
  BASE_ASSET_ID: 100000,

  // Multiplier for DEX index in asset ID calculation (10000)
  // Allocates 10000 asset ID slots per DEX (0-9999)
  DEX_MULTIPLIER: 10000,
} as const;

/**
 * Basis points conversion constant
 * 1 basis point (bp) = 0.01% = 0.0001 as decimal
 * Used for fee discount calculations (e.g., 6500 bps = 65%)
 */
export const BASIS_POINTS_DIVISOR = 10000;

/**
 * HIP-3 asset market type classifications (PRODUCTION DEFAULT)
 *
 * This is the production default configuration, can be overridden via feature flag
 * (remoteFeatureFlags.perpsAssetMarketTypes) for dynamic control.
 *
 * Maps asset symbols (e.g., "xyz:TSLA") to their market type for badge display.
 *
 * Market type determines the badge shown in the UI:
 * - 'equity': STOCK badge (stocks like TSLA, NVDA)
 * - 'commodity': COMMODITY badge (commodities like GOLD)
 * - 'forex': FOREX badge (forex pairs)
 * - undefined: No badge for crypto or unmapped assets
 *
 * Format: 'dex:SYMBOL' → MarketType
 * This allows flexible per-asset classification.
 * Assets not listed here will have no market type (undefined).
 */
export const HIP3_ASSET_MARKET_TYPES: Record<
  string,
  'equity' | 'commodity' | 'forex' | 'crypto'
> = {
  // xyz DEX - Equities
  'xyz:TSLA': 'equity',
  'xyz:NVDA': 'equity',
  'xyz:XYZ100': 'equity',

  // xyz DEX - Commodities
  'xyz:GOLD': 'commodity',

  // Future asset mappings as xyz adds more markets
} as const;

/**
 * HIP-3 margin management configuration
 * Controls margin buffers and auto-rebalance behavior for HIP-3 DEXes with isolated margin
 *
 * Background: HyperLiquid validates availableBalance >= totalRequiredMargin BEFORE reallocating
 * existing locked margin. This requires temporary over-funding when increasing positions,
 * followed by automatic cleanup to minimize locked capital.
 */
export const HIP3_MARGIN_CONFIG = {
  /**
   * Margin buffer multiplier for fees and slippage (0.3% = multiply by 1.003)
   * Covers HyperLiquid's max taker fee (0.035%) with comfortable margin
   */
  BUFFER_MULTIPLIER: 1.003,

  /**
   * Desired buffer to keep on HIP-3 DEX after auto-rebalance (USDC amount)
   * Small buffer allows quick follow-up orders without transfers
   */
  REBALANCE_DESIRED_BUFFER: 0.1,

  /**
   * Minimum excess threshold to trigger auto-rebalance (USDC amount)
   * Prevents unnecessary transfers for tiny amounts
   */
  REBALANCE_MIN_THRESHOLD: 0.1,
} as const;

/**
 * Configuration for USDH collateral handling on HIP-3 DEXs
 * Per HyperLiquid docs: USDH DEXs pull collateral from spot balance automatically
 *
 * USDH is HyperLiquid's native stablecoin pegged 1:1 to USDC
 */
export const USDH_CONFIG = {
  /** Token name for USDH collateral */
  TOKEN_NAME: 'USDH',

  /**
   * Maximum slippage for USDC→USDH spot swap in basis points
   * USDH is pegged 1:1 to USDC so slippage should be minimal
   * 10 bps (0.1%) provides small buffer for spread
   */
  SWAP_SLIPPAGE_BPS: 10,
} as const;

// Progress bar constants
export const INITIAL_AMOUNT_UI_PROGRESS = 10;
export const WITHDRAWAL_PROGRESS_STAGES = [
  25, 35, 45, 55, 65, 75, 85, 90, 95, 98,
];
export const PROGRESS_BAR_COMPLETION_DELAY_MS = 500;
