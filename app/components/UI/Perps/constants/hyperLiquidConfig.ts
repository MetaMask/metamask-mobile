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
} from '../types';

// Network constants
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
export const USDC_ARBITRUM_MAINNET_ADDRESS =
  '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
export const USDC_ARBITRUM_TESTNET_ADDRESS =
  '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d';

// WebSocket endpoints
export const HYPERLIQUID_ENDPOINTS: HyperLiquidEndpoints = {
  mainnet: 'wss://api.hyperliquid.xyz/ws',
  testnet: 'wss://api.hyperliquid-testnet.xyz/ws',
};

// Asset icons base URL
export const HYPERLIQUID_ASSET_ICONS_BASE_URL =
  'https://app.hyperliquid.xyz/coins/';

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
  slippage: 0.05, // 5% max slippage protection
  amount: {
    mainnet: 6, // $6 minimum order size (normally 5 but adding 1 for fees)
    testnet: 11, // $11 minimum order size (normally 10 but adding 1 for fees)
  },
};

// Fee configuration
// Note: These are base rates (Tier 0, no discounts)
// Actual fees will be calculated based on user's volume tier and staking
export const FEE_RATES: FeeRatesConfig = {
  taker: 0.00045, // 0.045% - Market orders and aggressive limit orders
  maker: 0.00015, // 0.015% - Limit orders that add liquidity
};

const BUILDER_FEE_MAX_FEE_DECIMAL = 0.001;

// Builder fee configuration
export const BUILDER_FEE_CONFIG = {
  // Test wallet address for builder fees, currently staking test wallet
  // FIXME: use official testnetBuilder as soon as available
  testnetBuilder: '0x316BDE155acd07609872a56Bc32CcfB0B13201fA' as Hex,
  // Production builder wallet
  mainnetBuilder: '0xe95a5e31904e005066614247d309e00d8ad753aa' as Hex,
  // Fee in decimal (10 bp = 0.1%)
  maxFeeDecimal: BUILDER_FEE_MAX_FEE_DECIMAL,
  maxFeeTenthsBps: BUILDER_FEE_MAX_FEE_DECIMAL * 100000,
  maxFeeRate: `${(BUILDER_FEE_MAX_FEE_DECIMAL * 100)
    .toFixed(4)
    .replace(/\.?0+$/, '')}%` as `${string}%`,
};

// Referral code configuration
export const REFERRAL_CONFIG = {
  // Production referral code
  mainnetCode: 'MMCSI',
  // Development/testnet referral code
  // FIXME: use official testnetCode as soon as available
  testnetCode: 'MSO',
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
