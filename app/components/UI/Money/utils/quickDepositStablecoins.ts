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

/** Add-funds quick deposit is USDC only. aUSDC and USDC.e do not match. */
export const QUICK_DEPOSIT_SYMBOL = 'USDC' as const;

export interface QuickDepositStablecoinContract {
  symbol: typeof QUICK_DEPOSIT_SYMBOL;
  chainId: Hex;
  address: Hex;
  decimals: number;
}

export interface QuickDepositStablecoinOption {
  symbol: typeof QUICK_DEPOSIT_SYMBOL;
  /** Sum of human balances across supported chains. */
  aggregatedBalance: string;
  preferredPaymentToken: { address: Hex; chainId: Hex };
}

/** Account → chain → token address → raw hex balance. */
export type AccountTokenBalances = Record<
  string,
  Record<string, string> | undefined
>;

const STANDARD_DECIMALS = 6;
/** Binance-Peg USDC. Other listed USDC contracts, and unknown flag addresses, use 6. */
const BSC_USDC = '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d';

/**
 * Used when the relay flag has no Monad mUSD deposit routes.
 * Linea and Polygon USDC are omitted: that catalog does not route them there.
 */
const FALLBACK_SOURCES: readonly [Hex, Hex, number][] = [
  [CHAIN_IDS.MAINNET, '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', 6],
  [CHAIN_IDS.ARBITRUM, '0xaf88d065e77c8cc2239327c5edb3a432268e5831', 6],
  [CHAIN_IDS.BASE, '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', 6],
  [CHAIN_IDS.BSC, BSC_USDC, 18],
  [CHAIN_IDS.MONAD, '0x754704bc059f8c67012fed69bc8a327a5aafb603', 6],
];

export const QUICK_DEPOSIT_STABLECOIN_FALLBACK_CONTRACTS: readonly QuickDepositStablecoinContract[] =
  FALLBACK_SOURCES.map(([chainId, address, decimals]) => ({
    symbol: QUICK_DEPOSIT_SYMBOL,
    chainId,
    address,
    decimals,
  }));

const isUsdcAlias = (alias: string): boolean => {
  const underscoreIdx = alias.indexOf('_');
  const raw = (
    underscoreIdx >= 0 ? alias.slice(underscoreIdx + 1) : alias
  ).toLowerCase();
  return raw === 'usdc';
};

const decimalsForAddress = (address: string): number =>
  address.toLowerCase() === BSC_USDC ? 18 : STANDARD_DECIMALS;

const isMonadMusdTarget = (route: RelayFixedSpreadAliasRoute): boolean =>
  route.targetChain.toLowerCase() === CHAIN_IDS.MONAD.toLowerCase() &&
  route.targetToken.toLowerCase() === MUSD_TOKEN_ADDRESS.toLowerCase();

/**
 * USDC contracts that can fund a Money deposit (output is Monad mUSD).
 * A flag with any such route replaces the fallback, even if it lists no USDC.
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
    const chainId = route.sourceChain.toLowerCase() as Hex;
    if (!isUsdcAlias(route.sourceTokenAlias) || isTestNet(chainId)) {
      continue;
    }
    const address = route.sourceToken.toLowerCase() as Hex;
    const key = `${chainId}:${address}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    fromRoutes.push({
      symbol: QUICK_DEPOSIT_SYMBOL,
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

const humanBalance = (rawBalance: string | undefined, decimals: number) => {
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
 * USDC row for the selected account. Blocked chains and contracts, testnets,
 * and chains without a Money-deposit route are ignored. The pay token is the
 * supported chain with the largest balance; the label sums those chains.
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
  const contracts = resolveQuickDepositStablecoinContracts(
    getRelayFixedSpreadRoutesWithSymbols(
      relayFlag,
      'confirmations_relay_fixed_spread',
    ),
  );
  let total = new BigNumber(0);
  let best: { balance: BigNumber; address: Hex; chainId: Hex } | undefined;

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
    total = total.plus(balance);
    if (!best || balance.isGreaterThan(best.balance)) {
      best = {
        balance,
        address: contract.address,
        chainId: contract.chainId,
      };
    }
  }

  if (!best || !total.isGreaterThan(0)) {
    return [];
  }
  return [
    {
      symbol: QUICK_DEPOSIT_SYMBOL,
      aggregatedBalance: total.toFixed(),
      preferredPaymentToken: { address: best.address, chainId: best.chainId },
    },
  ];
};
