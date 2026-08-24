import { USDC_MAINNET } from '../../constants/musd-mainnet.ts';

const NATIVE_ADDRESS = '0x0000000000000000000000000000000000000000';

/**
 * Static descriptor for a token on a specific chain. `usdValue` is the price of
 * one whole token, so total fiat is derived as `amount * usdValue`.
 */
export interface PredefinedToken {
  symbol: string;
  address: string;
  decimals: number;
  chainId: string;
  isNative: boolean;
  usdValue: number;
}

/**
 * A predefined token plus the amount to seed onto an account. Spread a
 * `PREDEFINED_TOKENS` entry and supply only `amount` (and optional `account`).
 */
export interface TokenHolding extends PredefinedToken {
  amount: string;
  account?: string;
}

const ETHEREUM_CHAIN_ID = '0x1';
const POLYGON_CHAIN_ID = '0x89';
const ARBITRUM_CHAIN_ID = '0xa4b1';

export const PREDEFINED_TOKENS = {
  ETHEREUM: {
    ETH: {
      symbol: 'ETH',
      address: NATIVE_ADDRESS,
      decimals: 18,
      chainId: ETHEREUM_CHAIN_ID,
      isNative: true,
      usdValue: 3000,
    },
    USDC: {
      symbol: 'USDC',
      address: USDC_MAINNET,
      decimals: 6,
      chainId: ETHEREUM_CHAIN_ID,
      isNative: false,
      usdValue: 1,
    },
  },
  POLYGON: {
    POL: {
      symbol: 'POL',
      address: NATIVE_ADDRESS,
      decimals: 18,
      chainId: POLYGON_CHAIN_ID,
      isNative: true,
      usdValue: 0.5,
    },
    USDC: {
      symbol: 'USDC',
      address: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
      decimals: 6,
      chainId: POLYGON_CHAIN_ID,
      isNative: false,
      usdValue: 1,
    },
    PUSD: {
      symbol: 'pUSD',
      address: '0xc011a7e12a19f7b1f670d46f03b03f3342e82dfb',
      decimals: 6,
      chainId: POLYGON_CHAIN_ID,
      isNative: false,
      usdValue: 1,
    },
  },
  ARBITRUM: {
    ETH: {
      symbol: 'ETH',
      address: NATIVE_ADDRESS,
      decimals: 18,
      chainId: ARBITRUM_CHAIN_ID,
      isNative: true,
      usdValue: 3000,
    },
    USDC: {
      symbol: 'USDC',
      address: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
      decimals: 6,
      chainId: ARBITRUM_CHAIN_ID,
      isNative: false,
      usdValue: 1,
    },
  },
} as const satisfies Record<string, Record<string, PredefinedToken>>;

/**
 * Converts a human token amount to a 0x-prefixed hex integer in base units
 * (e.g. toWeiHex('1', 18) -> '0xde0b6b3a7640000').
 */
export function toWeiHex(amountHuman: string, decimals: number): string {
  const [whole, fraction = ''] = amountHuman.split('.');
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
  const value = BigInt(`${whole}${paddedFraction}`);
  return `0x${value.toString(16)}`;
}

/**
 * Resolves a mocked RPC URL to its EVM chain id, or null when unrecognized.
 */
export function chainIdForRpcUrl(url: string): string | null {
  const lower = url.toLowerCase();
  if (lower.includes('polygon')) return POLYGON_CHAIN_ID;
  if (lower.includes('arbitrum')) return ARBITRUM_CHAIN_ID;
  if (lower.includes('mainnet') || lower.includes('ethereum')) {
    return ETHEREUM_CHAIN_ID;
  }
  return null;
}
