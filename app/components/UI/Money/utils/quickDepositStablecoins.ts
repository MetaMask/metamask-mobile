import { Hex } from '@metamask/utils';
import BigNumber from 'bignumber.js';
import { isMusdTokenOnChain } from '../../Earn/constants/musd';
import type { PreferredToken } from '../../../../selectors/featureFlagController/confirmations';
import { fromTokenMinimalUnitString } from '../../../../util/number/bigint';

export type QuickDepositSymbol = 'USDC' | 'USDT' | 'mUSD';
export type QuickDepositIntent = 'addUsdc' | 'addUsdt' | 'addMusd';

const INTENT: Record<QuickDepositSymbol, QuickDepositIntent> = {
  USDC: 'addUsdc',
  USDT: 'addUsdt',
  mUSD: 'addMusd',
};
const RANK: Record<QuickDepositSymbol, number> = { USDC: 0, USDT: 1, mUSD: 2 };

export interface QuickDepositStablecoinOption {
  symbol: QuickDepositSymbol;
  intent: QuickDepositIntent;
  aggregatedBalance: string;
  preferredPaymentToken: { address: Hex; chainId: Hex };
}

export interface QuickDepositAsset {
  address: Hex;
  chainId: Hex;
  decimals: number;
  rawBalance: Hex;
  symbol: string;
}

interface SymbolTotal {
  total: BigNumber;
  best: { balance: BigNumber; address: Hex; chainId: Hex };
}

const getQuickDepositSymbol = (
  asset: QuickDepositAsset,
): QuickDepositSymbol | undefined => {
  if (isMusdTokenOnChain(asset.address, asset.chainId)) {
    return 'mUSD';
  }

  const symbol = asset.symbol.toUpperCase();
  if (symbol === 'USDC') {
    return 'USDC';
  }
  if (symbol === 'USDT') {
    return 'USDT';
  }
  return undefined;
};

const getBalance = (asset: QuickDepositAsset): BigNumber | undefined => {
  try {
    const balance = new BigNumber(
      fromTokenMinimalUnitString(asset.rawBalance, asset.decimals),
    );
    return balance.isFinite() && balance.isGreaterThan(0) ? balance : undefined;
  } catch {
    return undefined;
  }
};

export const buildQuickDepositStablecoinOptions = ({
  assets,
  supportedTokens,
}: {
  assets: readonly QuickDepositAsset[];
  supportedTokens: readonly PreferredToken[];
}): QuickDepositStablecoinOption[] => {
  const supported = new Set(
    supportedTokens.map(
      ({ address, chainId }) =>
        `${chainId.toLowerCase()}:${address.toLowerCase()}`,
    ),
  );
  const totals = new Map<QuickDepositSymbol, SymbolTotal>();

  for (const asset of assets) {
    const key = `${asset.chainId.toLowerCase()}:${asset.address.toLowerCase()}`;
    const symbol = supported.has(key)
      ? getQuickDepositSymbol(asset)
      : undefined;
    const balance = symbol ? getBalance(asset) : undefined;

    if (!symbol || !balance) {
      continue;
    }

    const current = totals.get(symbol);
    const payToken = {
      balance,
      address: asset.address,
      chainId: asset.chainId,
    };
    totals.set(symbol, {
      total: (current?.total ?? new BigNumber(0)).plus(balance),
      best:
        !current || balance.isGreaterThan(current.best.balance)
          ? payToken
          : current.best,
    });
  }

  const winner = [...totals.entries()].reduce<
    [QuickDepositSymbol, SymbolTotal] | undefined
  >(
    (best, candidate) =>
      !best ||
      candidate[1].total.isGreaterThan(best[1].total) ||
      (candidate[1].total.isEqualTo(best[1].total) &&
        RANK[candidate[0]] < RANK[best[0]])
        ? candidate
        : best,
    undefined,
  );

  if (!winner?.[1].total.isGreaterThan(0)) {
    return [];
  }

  const [symbol, total] = winner;
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
