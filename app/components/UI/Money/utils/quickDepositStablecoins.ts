import { CHAIN_IDS } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import BigNumber from 'bignumber.js';
import { MUSD_TOKEN_ADDRESS } from '../../Earn/constants/musd';
import type { BlockedTokensListConfig } from '../../../../selectors/featureFlagController/confirmations';
import { getRelayFixedSpreadRoutesWithSymbols } from '../../../Views/confirmations/utils/relayFixedSpread';
import { isTokenBlocked } from '../../../Views/confirmations/utils/transaction-pay';
import { isTestNet } from '../../../../util/networks';
import { fromTokenMinimalUnitString } from '../../../../util/number/bigint';
import { toChecksumAddress } from '../../../../util/address';

export type QuickDepositSymbol = 'USDC' | 'USDT' | 'mUSD';
export type QuickDepositIntent = 'addUsdc' | 'addUsdt' | 'addMusd';

const INTENT: Record<QuickDepositSymbol, QuickDepositIntent> = {
  USDC: 'addUsdc',
  USDT: 'addUsdt',
  mUSD: 'addMusd',
};
const PRIORITY: readonly QuickDepositSymbol[] = ['USDC', 'USDT', 'mUSD'];
const EIGHTEEN = new Set([
  '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
  '0x55d398326f99059ff775485246999027b3197955',
]);

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

const symbolForAlias = (alias: string): QuickDepositSymbol | undefined => {
  const raw = alias.slice(alias.indexOf('_') + 1).toLowerCase();
  if (raw === 'usdc') return 'USDC';
  if (raw === 'usdt') return 'USDT';
  if (raw === 'musd') return 'mUSD';
  return undefined;
};

const humanBalance = (raw: string | undefined, decimals: number) => {
  try {
    if (!raw || BigInt(raw) === BigInt(0)) return new BigNumber(0);
  } catch {
    return new BigNumber(0);
  }
  return new BigNumber(fromTokenMinimalUnitString(raw, decimals));
};

interface SymbolTotal {
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
  const seen = new Set<string>();
  const monad = CHAIN_IDS.MONAD.toLowerCase();
  const musd = MUSD_TOKEN_ADDRESS.toLowerCase();

  for (const route of getRelayFixedSpreadRoutesWithSymbols(
    relayFlag,
    'confirmations_relay_fixed_spread',
  )) {
    const symbol = symbolForAlias(route.sourceTokenAlias);
    const chainId = route.sourceChain.toLowerCase() as Hex;
    if (
      route.targetChain.toLowerCase() !== monad ||
      route.targetToken.toLowerCase() !== musd ||
      !symbol ||
      isTestNet(chainId)
    ) {
      continue;
    }
    const address = route.sourceToken.toLowerCase() as Hex;
    const key = `${chainId}:${address}`;
    if (seen.has(key) || isTokenBlocked({ address, chainId }, blockedTokens)) {
      continue;
    }
    seen.add(key);
    const chainBalances =
      accountBalances?.[chainId] ?? accountBalances?.[chainId.toLowerCase()];
    const balance = humanBalance(
      chainBalances?.[toChecksumAddress(address)] ??
        chainBalances?.[address] ??
        chainBalances?.[address.toLowerCase()],
      EIGHTEEN.has(address) ? 18 : 6,
    );
    if (!balance.isFinite() || !balance.isGreaterThan(0)) continue;
    const current = totals.get(symbol);
    const payToken = { balance, address, chainId };
    totals.set(symbol, {
      total: (current?.total ?? new BigNumber(0)).plus(balance),
      best:
        !current || balance.isGreaterThan(current.best.balance)
          ? payToken
          : current.best,
    });
  }

  const symbol = PRIORITY.find((candidate) =>
    totals.get(candidate)?.total.isGreaterThan(0),
  );
  const total = symbol && totals.get(symbol);
  if (!symbol || !total) return [];
  return [
    {
      symbol,
      intent: INTENT[symbol],
      aggregatedBalance: total.total.toFixed(),
      preferredPaymentToken: {
        address: total.best.address,
        chainId: total.best.chainId,
      },
    },
  ];
};
