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

export const QUICK_DEPOSIT_SYMBOL = 'USDC' as const;

export interface QuickDepositStablecoinContract {
  symbol: typeof QUICK_DEPOSIT_SYMBOL;
  chainId: Hex;
  address: Hex;
  decimals: number;
}

export interface QuickDepositStablecoinOption {
  symbol: typeof QUICK_DEPOSIT_SYMBOL;
  aggregatedBalance: string;
  preferredPaymentToken: { address: Hex; chainId: Hex };
}

export type AccountTokenBalances = Record<
  string,
  Record<string, string> | undefined
>;

const STANDARD_DECIMALS = 6;
const BSC_USDC = '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d';

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

export const resolveQuickDepositStablecoinContracts = (
  routes: readonly RelayFixedSpreadAliasRoute[],
): readonly QuickDepositStablecoinContract[] => {
  const fromRoutes: QuickDepositStablecoinContract[] = [];
  const seen = new Set<string>();

  for (const route of routes) {
    if (!isMonadMusdTarget(route)) {
      continue;
    }
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
