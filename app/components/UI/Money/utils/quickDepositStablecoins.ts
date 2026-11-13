import { CHAIN_IDS } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import BigNumber from 'bignumber.js';
import { MUSD_TOKEN_ADDRESS } from '../../Earn/constants/musd';
import type { BlockedTokensListConfig } from '../../../../selectors/featureFlagController/confirmations';
import {
  getRelayFixedSpreadRoutesWithSymbols,
  type RelayFixedSpreadAliasRoute,
} from '../../../Views/confirmations/utils/relayFixedSpread';
import { isTokenBlocked } from '../../../Views/confirmations/utils/transaction-pay';
import { isTestNet } from '../../../../util/networks';
import { fromTokenMinimalUnitString } from '../../../../util/number/bigint';
import { toChecksumAddress } from '../../../../util/address';

/**
 * Stablecoins offered as quick deposits next to mUSD on the Add funds sheet.
 * Aave wrappers (aUSDC, aUSDT) are intentionally excluded.
 */
export const QUICK_DEPOSIT_STABLECOIN_SYMBOLS = ['USDC', 'USDT'] as const;

export type QuickDepositStablecoinSymbol =
  (typeof QUICK_DEPOSIT_STABLECOIN_SYMBOLS)[number];

export interface QuickDepositStablecoinContract {
  symbol: QuickDepositStablecoinSymbol;
  chainId: Hex;
  address: Hex;
  decimals: number;
}

export interface QuickDepositStablecoinOption {
  symbol: QuickDepositStablecoinSymbol;
  /** Sum of human balances across supported chains, as a decimal string. */
  aggregatedBalance: string;
  preferredPaymentToken: {
    address: Hex;
    chainId: Hex;
  };
}

/** Account → chain → token address → raw hex balance. */
export type AccountTokenBalances = Record<
  string,
  Record<string, string> | undefined
>;

const STANDARD_STABLECOIN_DECIMALS = 6;

/**
 * Binance-peg USDC and USDT use 18 decimals. Every other contract in the
 * Money-deposit catalog uses 6. Unknown addresses from a newer flag default
 * to 6, which is the Circle / Tether standard on the chains this flow uses.
 */
const DECIMALS_BY_ADDRESS: Record<string, number> = {
  // Binance-Peg USDC (BNB Smart Chain)
  '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d': 18,
  // Binance-Peg BSC-USD (USDT)
  '0x55d398326f99059ff775485246999027b3197955': 18,
};

/**
 * Contracts that can fund a Money account deposit when the relay fixed-spread
 * flag is missing or has no Monad mUSD deposit routes.
 *
 * Mirrors the USDC / USDT sources in the production-shaped
 * `confirmations_relay_fixed_spread` flag (routes whose output is Monad mUSD).
 * Linea and Polygon are omitted: that flag does not route their USDC or USDT
 * into Monad mUSD. Aave wrappers are omitted on purpose.
 */
export const QUICK_DEPOSIT_STABLECOIN_FALLBACK_CONTRACTS: readonly QuickDepositStablecoinContract[] =
  [
    {
      symbol: 'USDC',
      chainId: CHAIN_IDS.MAINNET,
      address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      decimals: STANDARD_STABLECOIN_DECIMALS,
    },
    {
      symbol: 'USDC',
      chainId: CHAIN_IDS.ARBITRUM,
      address: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
      decimals: STANDARD_STABLECOIN_DECIMALS,
    },
    {
      symbol: 'USDC',
      chainId: CHAIN_IDS.BASE,
      address: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
      decimals: STANDARD_STABLECOIN_DECIMALS,
    },
    {
      symbol: 'USDC',
      chainId: CHAIN_IDS.BSC,
      address: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
      decimals: 18,
    },
    {
      symbol: 'USDC',
      chainId: CHAIN_IDS.MONAD,
      address: '0x754704bc059f8c67012fed69bc8a327a5aafb603',
      decimals: STANDARD_STABLECOIN_DECIMALS,
    },
    {
      symbol: 'USDT',
      chainId: CHAIN_IDS.MAINNET,
      address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
      decimals: STANDARD_STABLECOIN_DECIMALS,
    },
    {
      symbol: 'USDT',
      chainId: CHAIN_IDS.BSC,
      address: '0x55d398326f99059ff775485246999027b3197955',
      decimals: 18,
    },
  ];

const RELAY_FIXED_SPREAD_FLAG = 'confirmations_relay_fixed_spread';

/**
 * Maps a relay token alias such as `eth_usdc` to USDC or USDT.
 * `ausdc`, `ausdt`, and `usdce` do not match.
 */
export const aliasToQuickDepositSymbol = (
  alias: string,
): QuickDepositStablecoinSymbol | undefined => {
  const underscoreIdx = alias.indexOf('_');
  const raw = (
    underscoreIdx >= 0 ? alias.slice(underscoreIdx + 1) : alias
  ).toLowerCase();
  if (raw === 'usdc') {
    return 'USDC';
  }
  if (raw === 'usdt') {
    return 'USDT';
  }
  return undefined;
};

const decimalsForAddress = (address: string): number =>
  DECIMALS_BY_ADDRESS[address.toLowerCase()] ?? STANDARD_STABLECOIN_DECIMALS;

const isMonadMusdTarget = (route: RelayFixedSpreadAliasRoute): boolean =>
  route.targetChain.toLowerCase() === CHAIN_IDS.MONAD.toLowerCase() &&
  route.targetToken.toLowerCase() === MUSD_TOKEN_ADDRESS.toLowerCase();

/**
 * USDC and USDT contracts MetaMask Pay can use to deposit into the Money
 * account (Monad mUSD).
 *
 * Live relay routes win when the flag lists at least one Monad mUSD deposit
 * route. Otherwise the documented fallback catalog is used, so a missing flag
 * does not hide holdings on the chains this flow already supports.
 */
export const resolveQuickDepositStablecoinContracts = (
  routes: readonly RelayFixedSpreadAliasRoute[],
): readonly QuickDepositStablecoinContract[] => {
  const fromRoutes: QuickDepositStablecoinContract[] = [];
  const seen = new Set<string>();
  let sawDepositRoute = false;

  for (const route of routes) {
    if (!isMonadMusdTarget(route)) {
      continue;
    }
    sawDepositRoute = true;

    const symbol = aliasToQuickDepositSymbol(route.sourceTokenAlias);
    const chainId = route.sourceChain.toLowerCase() as Hex;
    if (!symbol || isTestNet(chainId)) {
      continue;
    }

    const address = route.sourceToken.toLowerCase() as Hex;
    const key = `${symbol}:${chainId}:${address}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    fromRoutes.push({
      symbol,
      chainId,
      address,
      decimals: decimalsForAddress(address),
    });
  }

  return sawDepositRoute
    ? fromRoutes
    : QUICK_DEPOSIT_STABLECOIN_FALLBACK_CONTRACTS;
};

const readRawBalance = (
  chainBalances: Record<string, string> | undefined,
  address: string,
): string | undefined => {
  if (!chainBalances) {
    return undefined;
  }
  const checksum = toChecksumAddress(address);
  return (
    chainBalances[checksum] ??
    chainBalances[address] ??
    chainBalances[address.toLowerCase()]
  );
};

const humanBalance = (
  rawBalance: string | undefined,
  decimals: number,
): BigNumber => {
  if (!rawBalance || rawBalance === '0x0' || rawBalance === '0x') {
    return new BigNumber(0);
  }
  try {
    if (BigInt(rawBalance) === BigInt(0)) {
      return new BigNumber(0);
    }
  } catch {
    return new BigNumber(0);
  }
  return new BigNumber(fromTokenMinimalUnitString(rawBalance, decimals));
};

/**
 * Chain with the greatest positive human balance. Ties keep the earlier
 * chain. Returns `fallbackChainId` when every balance is zero or missing —
 * the same rule the mUSD row uses.
 */
export const selectHighestPositiveBalanceChain = (
  tokenBalanceByChain: Record<string, string | undefined> | undefined,
  fallbackChainId: Hex,
): Hex => {
  let sourceChainId = fallbackChainId;
  let bestBalance = new BigNumber(0);
  for (const [chainId, balance] of Object.entries(tokenBalanceByChain ?? {})) {
    const candidate = new BigNumber(balance ?? 0);
    if (candidate.isGreaterThan(bestBalance)) {
      sourceChainId = chainId as Hex;
      bestBalance = candidate;
    }
  }
  return sourceChainId;
};

/**
 * One quick-deposit row per symbol the selected account actually holds.
 *
 * Balances on blocked chains, blocked contracts, testnets, and chains without
 * a Money-deposit route are ignored. A symbol with no remaining balance is
 * omitted. The payment token is the supported chain with the largest balance,
 * matching the mUSD row.
 */
export const buildQuickDepositStablecoinOptions = ({
  relayFlag,
  accountBalances,
  blockedTokens,
}: {
  relayFlag: unknown;
  accountBalances: AccountTokenBalances | undefined;
  blockedTokens?: BlockedTokensListConfig;
}): QuickDepositStablecoinOption[] => {
  const routes = getRelayFixedSpreadRoutesWithSymbols(
    relayFlag,
    RELAY_FIXED_SPREAD_FLAG,
  );
  const contracts = resolveQuickDepositStablecoinContracts(routes);
  const totals = new Map<QuickDepositStablecoinSymbol, BigNumber>();
  const best = new Map<
    QuickDepositStablecoinSymbol,
    { balance: BigNumber; address: Hex; chainId: Hex }
  >();

  for (const contract of contracts) {
    if (
      isTokenBlocked(
        { address: contract.address, chainId: contract.chainId },
        blockedTokens,
      )
    ) {
      continue;
    }

    const chainBalances =
      accountBalances?.[contract.chainId] ??
      accountBalances?.[contract.chainId.toLowerCase()];
    const balance = humanBalance(
      readRawBalance(chainBalances, contract.address),
      contract.decimals,
    );
    if (!balance.isFinite() || !balance.isGreaterThan(0)) {
      continue;
    }

    totals.set(
      contract.symbol,
      (totals.get(contract.symbol) ?? new BigNumber(0)).plus(balance),
    );
    const currentBest = best.get(contract.symbol);
    if (!currentBest || balance.isGreaterThan(currentBest.balance)) {
      best.set(contract.symbol, {
        balance,
        address: contract.address,
        chainId: contract.chainId,
      });
    }
  }

  return QUICK_DEPOSIT_STABLECOIN_SYMBOLS.flatMap((symbol) => {
    const preferred = best.get(symbol);
    const total = totals.get(symbol);
    if (!preferred || !total || !total.isGreaterThan(0)) {
      return [];
    }
    return [
      {
        symbol,
        aggregatedBalance: total.toFixed(),
        preferredPaymentToken: {
          address: preferred.address,
          chainId: preferred.chainId,
        },
      },
    ];
  });
};
