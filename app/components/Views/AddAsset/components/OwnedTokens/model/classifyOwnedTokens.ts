import BigNumber from 'bignumber.js';
import {
  assetNamespaceFromComparableKey,
  assetReferenceFromComparableKey,
  chainIdFromComparableKey,
  toComparableAssetKey,
} from './assetIdentity';
import { isPositiveReadableAmount, toReadableAmount } from './balanceAmount';
import { computeFiatValue } from './formatOwnedToken';
import { lookupAccountTarget } from './accountTargets';
import type {
  ClassifiedHolding,
  OwnedTokenAccountTarget,
  OwnedTokenBalanceItem,
  OwnedTokenCategory,
  OwnedTokenFilter,
  OwnedTokenSpamTier,
  WalletAssetSnapshot,
} from './types';

const MALICIOUS_LABELS = new Set(['malicious', 'scam']);
const WARNING_LABELS = new Set(['spam', 'warning']);
const VERIFIED_LABELS = new Set(['blue_chip', 'stable_coin', 'verified']);

export const classifySpamTier = (
  labels: readonly string[] | undefined,
  securityResultType: string | undefined,
): OwnedTokenSpamTier => {
  const normalizedLabels = (labels ?? []).map((label) => label.toLowerCase());
  const result = securityResultType?.toLowerCase();
  if (
    result === 'malicious' ||
    normalizedLabels.some((label) => MALICIOUS_LABELS.has(label))
  ) {
    return 'malicious';
  }
  if (
    result === 'warning' ||
    result === 'spam' ||
    normalizedLabels.some((label) => WARNING_LABELS.has(label))
  ) {
    return 'warning';
  }
  if (
    result === 'verified' ||
    result === 'benign' ||
    normalizedLabels.some((label) => VERIFIED_LABELS.has(label))
  ) {
    return 'verified';
  }
  return 'unknown';
};

const addComparable = (
  target: Set<string>,
  originals: Map<string, string>,
  assetId: string,
): void => {
  const key = toComparableAssetKey(assetId);
  if (!key) {
    return;
  }
  target.add(key);
  if (!originals.has(key)) {
    originals.set(key, assetId);
  }
};

interface WalletIndex {
  hiddenKeys: Set<string>;
  hiddenOriginalIds: Map<string, string>;
  trackedKeys: Set<string>;
  ignoredByAccount: Map<string, Set<string>>;
  ignoredOriginalIds: Map<string, string>;
}

const buildWalletIndex = (snapshot: WalletAssetSnapshot): WalletIndex => {
  const hiddenKeys = new Set<string>();
  const hiddenOriginalIds = new Map<string, string>();
  const trackedKeys = new Set<string>();
  const ignoredByAccount = new Map<string, Set<string>>();
  const ignoredOriginalIds = new Map<string, string>();
  const trackedOriginals = new Map<string, string>();

  Object.keys(snapshot.assetsInfo ?? {}).forEach((assetId) => {
    addComparable(trackedKeys, trackedOriginals, assetId);
  });

  Object.values(snapshot.customAssets ?? {}).forEach((assetIds) => {
    assetIds.forEach((assetId) => {
      addComparable(trackedKeys, trackedOriginals, assetId);
    });
  });

  Object.values(snapshot.assetsBalance ?? {}).forEach((balances) => {
    Object.keys(balances).forEach((assetId) => {
      addComparable(trackedKeys, trackedOriginals, assetId);
    });
  });

  Object.entries(snapshot.assetPreferences ?? {}).forEach(
    ([assetId, preference]) => {
      if (preference?.hidden !== true) {
        return;
      }
      addComparable(hiddenKeys, hiddenOriginalIds, assetId);
    },
  );

  Object.entries(snapshot.ignoredAssetsByAccount ?? {}).forEach(
    ([accountId, assetIds]) => {
      const keys = new Set<string>();
      assetIds.forEach((assetId) => {
        addComparable(keys, ignoredOriginalIds, assetId);
      });
      ignoredByAccount.set(accountId, keys);
    },
  );

  return {
    hiddenKeys,
    hiddenOriginalIds,
    trackedKeys,
    ignoredByAccount,
    ignoredOriginalIds,
  };
};

const compareHoldings = (
  left: ClassifiedHolding,
  right: ClassifiedHolding,
): number => {
  if (left.category !== right.category) {
    return left.category === 'hidden' ? -1 : 1;
  }
  if (left.fiatValue != null && right.fiatValue != null) {
    const fiatOrder = new BigNumber(right.fiatValue).comparedTo(left.fiatValue);
    if (fiatOrder !== 0) {
      return fiatOrder ?? 0;
    }
  } else if (left.fiatValue != null) {
    return -1;
  } else if (right.fiatValue != null) {
    return 1;
  }
  const symbolOrder = left.symbol.localeCompare(right.symbol);
  if (symbolOrder !== 0) {
    return symbolOrder;
  }
  return left.rowKey.localeCompare(right.rowKey);
};

/**
 * Keeps one row per holding account. Does not collapse different accounts
 * that share an asset id. Rows for the same asset record how many accounts
 * hold it so the UI can show a breakdown.
 */
export const classifyOwnedTokenBalances = ({
  balances,
  targetsByAccountId,
  wallet,
  fiatMultiplier,
}: {
  balances: readonly OwnedTokenBalanceItem[];
  targetsByAccountId: ReadonlyMap<string, OwnedTokenAccountTarget>;
  wallet: WalletAssetSnapshot;
  fiatMultiplier: BigNumber | null;
}): ClassifiedHolding[] => {
  const index = buildWalletIndex(wallet);
  const rows: ClassifiedHolding[] = [];

  balances.forEach((balance) => {
    if (balance.object !== 'token') {
      return;
    }
    const comparableKey = toComparableAssetKey(balance.assetId);
    if (!comparableKey) {
      return;
    }
    const namespace = assetNamespaceFromComparableKey(comparableKey);
    if (balance.type === 'native' || namespace === 'slip44') {
      return;
    }
    const readable = toReadableAmount(balance.balance, balance.decimals);
    if (!readable || !isPositiveReadableAmount(readable)) {
      return;
    }
    const target = lookupAccountTarget(targetsByAccountId, balance.accountId);
    if (!target) {
      return;
    }
    const canonicalKey = balance.canonicalHead
      ? toComparableAssetKey(balance.canonicalHead)
      : undefined;
    const ignoredKeys = index.ignoredByAccount.get(target.internalAccountId);
    const isHidden =
      index.hiddenKeys.has(comparableKey) ||
      Boolean(ignoredKeys?.has(comparableKey));
    const isTracked =
      index.trackedKeys.has(comparableKey) ||
      Boolean(canonicalKey && index.trackedKeys.has(canonicalKey)) ||
      Boolean(canonicalKey && index.hiddenKeys.has(canonicalKey));

    let category: OwnedTokenCategory;
    if (isHidden) {
      category = 'hidden';
    } else if (isTracked) {
      return;
    } else {
      category = 'undetected';
    }

    const chainId = chainIdFromComparableKey(comparableKey);
    const assetReference = assetReferenceFromComparableKey(comparableKey);
    if (!chainId || !assetReference) {
      return;
    }
    const spamTier = classifySpamTier(
      balance.labels,
      balance.securityResultType,
    );
    const unhideAssetId = isHidden
      ? (index.hiddenOriginalIds.get(comparableKey) ??
        index.ignoredOriginalIds.get(comparableKey) ??
        balance.assetId)
      : undefined;

    rows.push({
      rowKey: `${target.caipAccountId}|${balance.assetId}`,
      caipAccountId: target.caipAccountId,
      internalAccountId: target.internalAccountId,
      accountName: target.accountName,
      assetId: balance.assetId,
      comparableKey,
      name: balance.name,
      symbol: balance.symbol,
      decimals: balance.decimals,
      chainId,
      assetReference,
      category,
      spamTier,
      readableAmount: readable.toString(),
      fiatValue: computeFiatValue(readable, balance.price, fiatMultiplier),
      unhideAssetId,
      selectable: spamTier !== 'malicious',
      siblingCount: 1,
    });
  });

  rows.sort(compareHoldings);
  const counts = new Map<string, number>();
  rows.forEach((row) => {
    counts.set(row.comparableKey, (counts.get(row.comparableKey) ?? 0) + 1);
  });
  return rows.map((row) => ({
    ...row,
    siblingCount: counts.get(row.comparableKey) ?? 1,
  }));
};

export const filterOwnedTokenRows = (
  rows: readonly ClassifiedHolding[],
  filter: OwnedTokenFilter,
  query: string,
): ClassifiedHolding[] => {
  const normalizedQuery = query.trim().toLowerCase();
  return rows.filter((row) => {
    if (filter !== 'all' && row.category !== filter) {
      return false;
    }
    if (!normalizedQuery) {
      return true;
    }
    return (
      row.name.toLowerCase().includes(normalizedQuery) ||
      row.symbol.toLowerCase().includes(normalizedQuery)
    );
  });
};

export const countOwnedTokenCategories = (
  rows: readonly ClassifiedHolding[],
): Record<OwnedTokenFilter, number> => ({
  all: rows.length,
  hidden: rows.filter((row) => row.category === 'hidden').length,
  undetected: rows.filter((row) => row.category === 'undetected').length,
});
