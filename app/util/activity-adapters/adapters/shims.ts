/**
 * Mobile shims for Extension-only constants used by the vendored adapters.
 * Each shim maps to the equivalent Mobile constant or provides a minimal inline definition.
 * TODO: Remove when shared @metamask/activity-adapters package is published.
 */
import { TransactionStatus } from '@metamask/transaction-controller';
import {
  KnownCaipNamespace,
  toCaipChainId,
  type CaipChainId,
  type CaipAssetType,
  isCaipAssetType,
} from '@metamask/utils';
import {
  getNativeAssetForChainId,
  isNativeAddress,
} from '@metamask/bridge-controller';
import { toChecksumHexAddress } from '@metamask/controller-utils';
import { equalsIgnoreCase as mobileEqualsIgnoreCase } from '../../string';
import { parseStandardTokenTransactionData as mobileParseStandardTokenTransactionData } from '../../../components/Views/confirmations/utils/transaction';

// ---------------------------------------------------------------------------
// Transaction status constants (Extension: shared/constants/transaction.ts)
// ---------------------------------------------------------------------------

export const IN_PROGRESS_TRANSACTION_STATUSES = [
  TransactionStatus.unapproved,
  TransactionStatus.approved,
  TransactionStatus.signed,
  TransactionStatus.submitted,
] as const;

/** Matches Extension's SmartTransactionStatus enum values (lowercase). */
export const SmartTransactionStatus = {
  cancelled: 'cancelled',
  pending: 'pending',
  success: 'success',
} as const;

/** Matches Extension's TransactionGroupStatus enum. */
export const TransactionGroupStatus = {
  cancelled: 'cancelled',
  pending: 'pending',
} as const;

/** Zero address used as the "native token" sentinel (matches Extension). */
export const NATIVE_TOKEN_ADDRESS = '0x0'.padEnd(42, '0');

// ---------------------------------------------------------------------------
// ERC-20 Transfer log topic hash (Extension: shared/lib/transactions-controller-utils.ts)
// ---------------------------------------------------------------------------

export const TOKEN_TRANSFER_LOG_TOPIC_HASH =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

// ---------------------------------------------------------------------------
// Small dependency shims for Extension shared utilities.
// Keep Mobile-specific imports centralized here so adapter files remain close to
// the future shared package surface.
// ---------------------------------------------------------------------------

export const equalsIgnoreCase = mobileEqualsIgnoreCase;
export const parseStandardTokenTransactionData =
  mobileParseStandardTokenTransactionData;

// ---------------------------------------------------------------------------
// Wrapped-token addresses per EVM chain (Extension: shared/constants/swaps.ts)
// Only chains where wrap/unwrap detection is needed.
// ---------------------------------------------------------------------------

export const SWAPS_WRAPPED_TOKENS_ADDRESSES: Record<string, string> = {
  '0x1': '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH (mainnet)
  '0x38': '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // WBNB (BSC)
  '0x89': '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', // WMATIC (Polygon)
  '0xa': '0x4200000000000000000000000000000000000006', // WETH (Optimism)
  '0xa4b1': '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // WETH (Arbitrum)
  '0x2105': '0x4200000000000000000000000000000000000006', // WETH (Base)
  '0xe708': '0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34', // WETH (Linea)
  '0xa86a': '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', // WAVAX (Avalanche)
  '0x144': '0x5AEa5775959fBC2557Cc8789bC1bf90A239D9a91', // WETH (zkSync Era)
};

// ---------------------------------------------------------------------------
// Known token metadata (Extension: shared/constants/tokens.ts STATIC_MAINNET_TOKEN_LIST)
// Minimal known-token fallback used by Extension adapter tests and common
// mainnet approvals/transfers where transaction metadata omits token details.
// TODO: Replace with Mobile's TokensController/token-list data once the
// adapters move to a shared package.
// ---------------------------------------------------------------------------

export const STATIC_MAINNET_TOKEN_LIST: Record<
  string,
  { symbol: string; decimals: number; assetId?: string }
> = {
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': {
    symbol: 'USDC',
    decimals: 6,
    assetId: 'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  },
  '0xdac17f958d2ee523a2206206994597c13d831ec7': {
    symbol: 'USDT',
    decimals: 6,
    assetId: 'eip155:1/erc20:0xdAC17F958D2ee523a2206206994597C13D831ec7',
  },
  '0x6b175474e89094c44da98b954eedeac495271d0f': {
    symbol: 'DAI',
    decimals: 18,
    assetId: 'eip155:1/erc20:0x6B175474E89094C44Da98b954EedeAC495271d0F',
  },
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': {
    symbol: 'WETH',
    decimals: 18,
    assetId: 'eip155:1/erc20:0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  },
};

// ---------------------------------------------------------------------------
// Bridge chain common token pairs (Extension: shared/constants/bridge.ts)
// Common bridge output tokens used as fallback metadata by the Extension
// adapters for approvals without value-transfer metadata.
// ---------------------------------------------------------------------------

export const BRIDGE_CHAINID_COMMON_TOKEN_PAIR: Record<
  string,
  { symbol: string; decimals: number; assetId?: string } | undefined
> = {
  'eip155:1': {
    symbol: 'mUSD',
    decimals: 6,
    assetId: 'eip155:1/erc20:0xACa92e438df0B2401fF60Da7E4337B687a2435dA',
  },
  'eip155:10': {
    symbol: 'USDC',
    decimals: 6,
    assetId: 'eip155:10/erc20:0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
  },
  'eip155:56': {
    symbol: 'USDT',
    decimals: 18,
    assetId: 'eip155:56/erc20:0x55d398326f99059fF775485246999027B3197955',
  },
  'eip155:137': {
    symbol: 'USDT',
    decimals: 6,
    assetId: 'eip155:137/erc20:0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
  },
  'eip155:8453': {
    symbol: 'USDC',
    decimals: 6,
    assetId: 'eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  },
  'eip155:42161': {
    symbol: 'USDC',
    decimals: 6,
    assetId: 'eip155:42161/erc20:0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  },
  'eip155:43114': {
    symbol: 'USDC',
    decimals: 6,
    assetId: 'eip155:43114/erc20:0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
  },
  'eip155:59144': {
    symbol: 'mUSD',
    decimals: 6,
    assetId: 'eip155:59144/erc20:0xACa92e438df0B2401fF60Da7E4337B687a2435dA',
  },
  'eip155:324': {
    symbol: 'USDT',
    decimals: 6,
    assetId: 'eip155:324/erc20:0x493257fD37EDB34451f62EDf8D2a0C418852bA4C',
  },
  'eip155:4663': {
    symbol: 'USDG',
    decimals: 6,
    assetId: 'eip155:4663/erc20:0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168',
  },
};

// ---------------------------------------------------------------------------
// toAssetId — simplified EVM implementation of Extension shared/lib/asset-utils.ts
// Handles the EVM ERC-20 and native-token cases used by the adapters.
// ---------------------------------------------------------------------------

export function toAssetId(
  address: string,
  chainId: string | undefined,
): CaipAssetType | undefined {
  if (!chainId || !address) {
    return undefined;
  }

  // Already CAIP-19 — pass through.
  if (isCaipAssetType(address)) {
    return address as CaipAssetType;
  }

  // Resolve hex chainId → CAIP-2
  let caipChainId: CaipChainId;
  try {
    caipChainId = chainId.includes(':')
      ? (chainId as CaipChainId)
      : toCaipChainId(
          KnownCaipNamespace.Eip155,
          parseInt(chainId, 16).toString(),
        );
  } catch {
    return undefined;
  }

  const lowerAddress = address.toLowerCase();

  // Native token (zero address) → use bridge-controller's native asset registry.
  if (isNativeAddress(lowerAddress)) {
    try {
      return getNativeAssetForChainId(caipChainId)?.assetId as
        | CaipAssetType
        | undefined;
    } catch {
      return undefined;
    }
  }

  // EVM ERC-20 (strict hex address).
  if (/^0x[0-9a-f]{40}$/i.test(address)) {
    const checksummed = toChecksumHexAddress(address) ?? address;
    return `${caipChainId}/erc20:${checksummed}` as CaipAssetType;
  }

  return undefined;
}

// ---------------------------------------------------------------------------
// formatUnits — pure bigint implementation matching Extension shared/lib/unit.ts
// ---------------------------------------------------------------------------

export function formatUnits(value: bigint, decimals: number): string {
  let display = value.toString();
  const negative = display.startsWith('-');

  if (negative) {
    display = display.slice(1);
  }

  display = display.padStart(decimals, '0');

  const integer = display.slice(0, display.length - decimals);
  const rawFraction = display.slice(display.length - decimals);
  const fraction = rawFraction.replace(/(0+)$/u, '');

  return `${negative ? '-' : ''}${integer || '0'}${fraction ? `.${fraction}` : ''}`;
}
