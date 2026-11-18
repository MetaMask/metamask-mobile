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

export type QuickDepositSymbol = 'USDC' | 'USDT' | 'mUSD';
export type QuickDepositIntent = 'addUsdc' | 'addUsdt' | 'addMusd';

const TOKEN_META: Record<
  QuickDepositSymbol,
  { intent: QuickDepositIntent; rank: number }
> = {
  USDC: { intent: 'addUsdc', rank: 0 },
  USDT: { intent: 'addUsdt', rank: 1 },
  mUSD: { intent: 'addMusd', rank: 2 },
};

export interface QuickDepositStablecoinContract {
  symbol: QuickDepositSymbol;
  chainId: Hex;
  address: Hex;
  decimals: number;
}

export interface QuickDepositStablecoinOption {
  symbol: QuickDepositSymbol;
  intent: QuickDepositIntent;
  aggregatedBalance: string;
  preferredPaymentToken: { address: Hex; chainId: Hex };
}

export type AccountTokenBalances = Record<
  string,
  Record<string, string> | undefined
>;

const EIGHTEEN_DECIMAL_ADDRESSES = new Set([
  '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
  '0x55d398326f99059ff775485246999027b3197955',
]);

const symbolForAlias = (alias: string): QuickDepositSymbol | undefined => {
  const raw = alias.slice(alias.indexOf('_') + 1).toLowerCase();
  if (raw === 'usdc') return 'USDC';
  if (raw === 'usdt') return 'USDT';
  if (raw === 'musd') return 'mUSD';
  return undefined;
};

const isMonadMusdTarget = (route: RelayFixedSpreadAliasRoute): boolean =>
  route.targetChain.toLowerCase() === CHAIN_IDS.MONAD.toLowerCase() &&
  route.targetToken.toLowerCase() === MUSD_TOKEN_ADDRESS.toLowerCase();

export const resolveQuickDepositStablecoinContracts = (
  routes: readonly RelayFixedSpreadAliasRoute[],
): readonly QuickDepositStablecoinContract[] => {
  const fromRoutes: QuickDepositStablecoinContract[] = [];
  const seen = new Set<string>();

  for (const route of routes) {
    const symbol = symbolForAlias(route.sourceTokenAlias);
    const chainId = route.sourceChain.toLowerCase() as Hex;
    if (!isMonadMusdTarget(route) || !symbol || isTestNet(chainId)) {
      continue;
    }
    const address = route.sourceToken.toLowerCase() as Hex;
    const key = `${chainId}:${address}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    fromRoutes.push({
      symbol,
      chainId,
      address,
      decimals: EIGHTEEN_DECIMAL_ADDRESSES.has(address) ? 18 : 6,
    });
  }

  return fromRoutes;
};

const readRawBalance = (
  chainBalances: Record<string, string> | undefined,
  address: string,
): string | undefined =>
  chainBalances?.[toChecksumAddress(address)] ??
  chainBalances?.[address] ??
  chainBalances?.[address.toLowerCase()];

const humanBalance = (rawBalance: string | undefined, decimals: number) => {
  try {
    if (!rawBalance || BigInt(rawBalance) === BigInt(0)) {
      return new BigNumber(0);
    }
  } catch {
    return new BigNumber(0);
  }
  return new BigNumber(fromTokenMinimalUnitString(rawBalance, decimals));
};

interface SymbolTotal {
  symbol: QuickDepositSymbol;
  total: BigNumber;
  best: { balance: BigNumber; address: Hex; chainId: Hex };
}

export const buildQuickDepositStablecoinOptions = ({
  relayFlag,
  accountBalances,
  blockedTokens,
}: {
  relayFlag: unknown;
  accountBalances: AccountTokenBalances | undefined;
  blockedTokens?: BlockedTokensListConfig;
}): QuickDepositStablecoinOption[] => {
  const totals = new Map<QuickDepositSymbol, SymbolTotal>();

  for (const contract of resolveQuickDepositStablecoinContracts(
    getRelayFixedSpreadRoutesWithSymbols(
      relayFlag,
      'confirmations_relay_fixed_spread',
    ),
  )) {
    if (
      isTokenBlocked(
        { address: contract.address, chainId: contract.chainId },
        blockedTokens,
      )
    ) {
      continue;
    }
    const balance = humanBalance(
      readRawBalance(
        accountBalances?.[contract.chainId] ??
          accountBalances?.[contract.chainId.toLowerCase()],
        contract.address,
      ),
      contract.decimals,
    );
    if (!balance.isFinite() || !balance.isGreaterThan(0)) {
      continue;
    }
    const current = totals.get(contract.symbol);
    const payToken = {
      balance,
      address: contract.address,
      chainId: contract.chainId,
    };
    totals.set(contract.symbol, {
      symbol: contract.symbol,
      total: (current?.total ?? new BigNumber(0)).plus(balance),
      best:
        !current || balance.isGreaterThan(current.best.balance)
          ? payToken
          : current.best,
    });
  }

  const winner = [...totals.values()].reduce<SymbolTotal | undefined>(
    (best, candidate) =>
      !best ||
      candidate.total.isGreaterThan(best.total) ||
      (candidate.total.isEqualTo(best.total) &&
        TOKEN_META[candidate.symbol].rank < TOKEN_META[best.symbol].rank)
        ? candidate
        : best,
    undefined,
  );

  if (!winner?.total.isGreaterThan(0)) {
    return [];
  }
  return [
    {
      symbol: winner.symbol,
      intent: TOKEN_META[winner.symbol].intent,
      aggregatedBalance: winner.total.toFixed(),
      preferredPaymentToken: {
        address: winner.best.address,
        chainId: winner.best.chainId,
      },
    },
  ];
};
