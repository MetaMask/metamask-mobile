import type { CaipAssetId, CaipChainId, Hex } from '@metamask/utils';
import type {
  MYXNetwork,
  MYXEndpoints,
  MYXAssetConfigs,
  MYXBridgeContracts,
  BridgeContractConfig,
  MYXTransportConfig,
  TradingDefaultsConfig,
  FeeRatesConfig,
} from '../types/myx-types';

// ============================================================================
// Network Constants
// ============================================================================

// BNB Chain constants (MYX's primary network)
export const BNB_MAINNET_CHAIN_ID_HEX = '0x38' as const;
export const BNB_MAINNET_CHAIN_ID = '56' as const;
export const BNB_TESTNET_CHAIN_ID = '97' as const;
export const BNB_MAINNET_CAIP_CHAIN_ID =
  `eip155:${BNB_MAINNET_CHAIN_ID}` as CaipChainId;
export const BNB_TESTNET_CAIP_CHAIN_ID =
  `eip155:${BNB_TESTNET_CHAIN_ID}` as CaipChainId;

// Arbitrum Sepolia for MYX testnet
export const ARBITRUM_SEPOLIA_CHAIN_ID = '421614' as const;
export const ARBITRUM_SEPOLIA_CAIP_CHAIN_ID =
  `eip155:${ARBITRUM_SEPOLIA_CHAIN_ID}` as CaipChainId;

export const MYX_NETWORK_NAME = 'MYX Protocol' as const;

// ============================================================================
// Token Constants
// ============================================================================

// USDT is MYX's primary collateral (different from HyperLiquid's USDC)
export const USDT_SYMBOL = 'USDT' as const;
export const USDT_NAME = 'Tether USD' as const;
export const USDT_DECIMALS = 18; // BNB Chain USDT has 18 decimals

// Token decimals used in MYX protocol
export const MYX_PRICE_DECIMALS = 30; // MYX uses 30 decimals for prices
export const MYX_SIZE_DECIMALS = 18; // Position sizes in 18 decimals
export const MYX_COLLATERAL_DECIMALS = 18; // Collateral amounts in 18 decimals

export const ZERO_ADDRESS =
  '0x0000000000000000000000000000000000000000' as const;
export const ZERO_BALANCE = '0x0' as const;

// USDT token addresses by chain
export const USDT_BNB_MAINNET_ADDRESS =
  '0x55d398326f99059ff775485246999027b3197955' as const;
export const USDT_BNB_TESTNET_ADDRESS =
  '0x337610d27c682e347c9cd60bd4b3b107c9d34ddd' as const;
export const USDT_ARBITRUM_SEPOLIA_ADDRESS =
  '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d' as const;

// USDT token icon URL using MetaMask's Token Icons API
export const USDT_TOKEN_ICON_URL = `https://static.cx.metamask.io/api/v1/tokenIcons/1/0xdAC17F958D2ee523a2206206994597C13D831ec7.png`;

// ============================================================================
// API Endpoints
// ============================================================================

export const MYX_ENDPOINTS: MYXEndpoints = {
  mainnet: {
    http: 'https://api.myx.finance',
    ws: 'wss://ws.myx.finance',
  },
  testnet: {
    http: 'https://api-testnet.myx.finance',
    ws: 'wss://ws-testnet.myx.finance',
  },
};

// ============================================================================
// Asset Icons
// ============================================================================

// MYX asset icons base URL (fallback source)
export const MYX_ASSET_ICONS_BASE_URL = 'https://app.myx.finance/assets/coins/';

// MetaMask-hosted MYX asset icons (primary source when available)
export const METAMASK_MYX_ICONS_BASE_URL =
  'https://raw.githubusercontent.com/MetaMask/contract-metadata/master/icons/myx/';

// ============================================================================
// Asset Configurations
// ============================================================================

export const MYX_ASSET_CONFIGS: MYXAssetConfigs = {
  USDT: {
    mainnet: `${BNB_MAINNET_CAIP_CHAIN_ID}/erc20:${USDT_BNB_MAINNET_ADDRESS}/default`,
    testnet: `${ARBITRUM_SEPOLIA_CAIP_CHAIN_ID}/erc20:${USDT_ARBITRUM_SEPOLIA_ADDRESS}/default`,
  },
};

// ============================================================================
// Bridge/Deposit Contract Addresses
// ============================================================================

// MYX uses direct smart contract interactions for deposits
// These addresses are placeholder - need confirmation from MYX team
export const MYX_BRIDGE_CONTRACTS: MYXBridgeContracts = {
  mainnet: {
    chainId: BNB_MAINNET_CAIP_CHAIN_ID,
    // TBD: Get from MYX team - this is the Router/Vault contract for deposits
    contractAddress: '0x0000000000000000000000000000000000000000',
  },
  testnet: {
    chainId: ARBITRUM_SEPOLIA_CAIP_CHAIN_ID,
    // TBD: Get from MYX team
    contractAddress: '0x0000000000000000000000000000000000000000',
  },
};

// ============================================================================
// SDK Transport Configuration
// ============================================================================

export const MYX_TRANSPORT_CONFIG: MYXTransportConfig = {
  timeout: 10_000, // 10 second timeout for HTTP requests
  keepAlive: { interval: 30_000 }, // 30 second keep-alive ping
  reconnect: {
    maxRetries: 5,
    connectionTimeout: 10_000,
    reconnectInterval: 5_000,
  },
};

// ============================================================================
// Trading Configuration
// ============================================================================

export const MYX_TRADING_DEFAULTS: TradingDefaultsConfig = {
  leverage: 3, // 3x default leverage
  marginPercent: 10, // 10% fixed margin default
  takeProfitPercent: 0.3, // 30% take profit
  stopLossPercent: 0.1, // 10% stop loss
  amount: {
    mainnet: 10, // $10 minimum order size
    testnet: 10, // $10 minimum order size
  },
};

// ============================================================================
// Fee Configuration
// ============================================================================

// MYX fee rates (base rates, may vary by pool and tier)
export const MYX_FEE_RATES: FeeRatesConfig = {
  taker: 0.0005, // 0.05% - Market orders
  maker: 0.0002, // 0.02% - Limit orders that add liquidity
};

// Builder/broker fee configuration for MetaMask
export const MYX_BUILDER_FEE_CONFIG = {
  // TBD: Get broker address from MYX team
  testnetBroker: '0x0000000000000000000000000000000000000000' as Hex,
  mainnetBroker: '0x0000000000000000000000000000000000000000' as Hex,
  // Fee in decimal (10 bp = 0.1%)
  maxFeeDecimal: 0.001,
  maxFeeTenthsBps: 100,
  maxFeeRate: '0.1%',
} as const;

// ============================================================================
// Deposit/Withdrawal Configuration
// ============================================================================

export const MYX_DEPOSIT_CONFIG = {
  estimatedGasLimit: 250_000, // Estimated gas limit for deposits
  defaultSlippage: 1, // 1% default slippage
  refreshRate: 30_000, // 30 seconds quote refresh rate
  estimatedTime: {
    directDeposit: '30-60 seconds', // Direct USDT deposit
    sameChainSwap: '1-2 minutes', // Swap on same chain before deposit
  },
};

export const MYX_WITHDRAWAL_CONFIG = {
  estimatedMinutes: 5, // Withdrawal processing time in minutes
  progressIntervalMs: 30_000, // 30 seconds progress update interval
  fixedFee: 0, // No fixed withdrawal fee (gas only)
};

// ============================================================================
// Order Book Spread Constants
// ============================================================================

export const MYX_ORDER_BOOK_SPREAD = {
  DEFAULT_BID_MULTIPLIER: 0.9999, // Bid price is 0.01% below current price
  DEFAULT_ASK_MULTIPLIER: 1.0001, // Ask price is 0.01% above current price
};

// ============================================================================
// Pool Configuration
// ============================================================================

// MYX uses Multi-Pool Model (MPM) - each market can have multiple pools
// This map tracks default pools for common symbols
export const MYX_DEFAULT_POOLS: Record<string, string> = {
  // TBD: Populate with actual pool IDs from MYX team
  // Format: symbol -> poolId
  BTC: '',
  ETH: '',
};

// ============================================================================
// Protocol-Specific Constants
// ============================================================================

export const MYX_CONFIG = {
  // Protocol identifier
  PROTOCOL_ID: 'myx' as const,
  PROTOCOL_NAME: 'MYX Protocol' as const,

  // Exchange identifier used in API responses
  EXCHANGE_NAME: 'MYX' as const,

  // Supported chains (MYX supports multiple chains)
  SUPPORTED_CHAINS: {
    mainnet: [BNB_MAINNET_CHAIN_ID],
    testnet: [ARBITRUM_SEPOLIA_CHAIN_ID],
  },
} as const;

// ============================================================================
// Type Helpers
// ============================================================================

export type SupportedMYXAsset = keyof typeof MYX_ASSET_CONFIGS;

// ============================================================================
// Configuration Helper Functions
// ============================================================================

export function getMYXEndpoint(isTestnet: boolean): {
  http: string;
  ws: string;
} {
  return isTestnet ? MYX_ENDPOINTS.testnet : MYX_ENDPOINTS.mainnet;
}

export function getMYXChainId(isTestnet: boolean): string {
  return isTestnet ? ARBITRUM_SEPOLIA_CHAIN_ID : BNB_MAINNET_CHAIN_ID;
}

export function getMYXCaipChainId(isTestnet: boolean): CaipChainId {
  const network: MYXNetwork = isTestnet ? 'testnet' : 'mainnet';
  return MYX_BRIDGE_CONTRACTS[network].chainId;
}

export function getMYXBridgeInfo(isTestnet: boolean): BridgeContractConfig {
  const network: MYXNetwork = isTestnet ? 'testnet' : 'mainnet';
  return MYX_BRIDGE_CONTRACTS[network];
}

export function getMYXSupportedAssets(isTestnet?: boolean): CaipAssetId[] {
  const network = isTestnet ? 'testnet' : 'mainnet';
  return Object.values(MYX_ASSET_CONFIGS).map((config) => config[network]);
}

export function getMYXBrokerAddress(isTestnet: boolean): Hex {
  return isTestnet
    ? MYX_BUILDER_FEE_CONFIG.testnetBroker
    : MYX_BUILDER_FEE_CONFIG.mainnetBroker;
}

// ============================================================================
// Price/Size Conversion Utilities
// ============================================================================

/**
 * Convert a human-readable price to MYX's 30-decimal format
 * @param price - Price as number or string (e.g., "3000" for $3000)
 * @returns Price string in 30-decimal format
 */
export function toMYXPrice(price: number | string): string {
  const priceNum = typeof price === 'string' ? parseFloat(price) : price;
  // MYX uses 30 decimals for prices
  return BigInt(Math.round(priceNum * 1e30)).toString();
}

/**
 * Convert MYX's 30-decimal price format to human-readable
 * @param price - Price string in 30-decimal format
 * @returns Price as number
 */
export function fromMYXPrice(price: string): number {
  return Number(BigInt(price)) / 1e30;
}

/**
 * Convert a human-readable size to MYX's 18-decimal format
 * @param size - Size as number or string (e.g., "1.5" for 1.5 units)
 * @returns Size string in 18-decimal format
 */
export function toMYXSize(size: number | string): string {
  const sizeNum = typeof size === 'string' ? parseFloat(size) : size;
  return BigInt(Math.round(sizeNum * 1e18)).toString();
}

/**
 * Convert MYX's 18-decimal size format to human-readable
 * @param size - Size string in 18-decimal format
 * @returns Size as number
 */
export function fromMYXSize(size: string): number {
  return Number(BigInt(size)) / 1e18;
}

/**
 * Convert a human-readable collateral amount to MYX's format
 * @param amount - Amount as number or string (e.g., "100" for 100 USDT)
 * @returns Amount string in token decimals (18 for USDT on BNB)
 */
export function toMYXCollateral(amount: number | string): string {
  const amountNum = typeof amount === 'string' ? parseFloat(amount) : amount;
  return BigInt(Math.round(amountNum * 1e18)).toString();
}

/**
 * Convert MYX's collateral format to human-readable
 * @param amount - Amount string in token decimals
 * @returns Amount as number
 */
export function fromMYXCollateral(amount: string): number {
  return Number(BigInt(amount)) / 1e18;
}

// ============================================================================
// Basis Points Conversion
// ============================================================================

export const BASIS_POINTS_DIVISOR = 10000;

/**
 * Convert basis points to decimal
 * @param bps - Basis points (e.g., 100 for 1%)
 * @returns Decimal representation (e.g., 0.01)
 */
export function bpsToDecimal(bps: number): number {
  return bps / BASIS_POINTS_DIVISOR;
}

/**
 * Convert decimal to basis points
 * @param decimal - Decimal representation (e.g., 0.01 for 1%)
 * @returns Basis points (e.g., 100)
 */
export function decimalToBps(decimal: number): number {
  return Math.round(decimal * BASIS_POINTS_DIVISOR);
}

// ============================================================================
// Progress Bar Constants (for UI)
// ============================================================================

export const MYX_INITIAL_AMOUNT_UI_PROGRESS = 10;
export const MYX_WITHDRAWAL_PROGRESS_STAGES = [
  25, 35, 45, 55, 65, 75, 85, 90, 95, 98,
];
export const MYX_PROGRESS_BAR_COMPLETION_DELAY_MS = 500;
