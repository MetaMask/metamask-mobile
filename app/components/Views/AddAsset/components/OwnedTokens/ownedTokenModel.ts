import type { V6BalanceItem } from '@metamask/core-backend';
import { MULTICHAIN_NETWORK_DECIMAL_PLACES } from '@metamask/multichain-network-controller';
import {
  parseCaipAssetType,
  type CaipAssetType,
  type CaipChainId,
} from '@metamask/utils';
import { getLocaleLanguageCode } from '../../../../hooks/useFormatters';
import { formatWithThreshold } from '../../../../../util/assets';
import {
  fromTokenMinimalUnitString,
  localizeLargeNumber,
} from '../../../../../util/number/bigint';
import I18n, { strings } from '../../../../../../locales/i18n';
import { getAssetImageUrl } from '../../../../UI/Bridge/hooks/useAssetMetadata/utils';

export type OwnedTokenCategory = 'hidden' | 'undetected';

export interface OwnedTokenAccount {
  address: string;
  scopes: readonly string[];
}

export interface WalletTokenIndexInput {
  customAssets: Record<string, readonly string[] | undefined>;
  assetsBalance: Record<string, Record<string, unknown> | undefined>;
  /** AssetsController `assetsInfo`, keyed by CAIP-19 asset id. */
  assetsInfo: object;
  assetPreferences: Record<string, { hidden?: boolean } | undefined>;
  ignoredAssetIds: readonly string[];
}

export interface WalletTokenIndex {
  /** Lowercase CAIP-19 ids the user explicitly hid. */
  hiddenAssetIds: Set<string>;
  /**
   * Lowercase CAIP-19 ids already in AssetsController: metadata, a balance,
   * or a custom asset. Hidden ids are included.
   */
  presentAssetIds: Set<string>;
}

export interface ClassifiedOwnedToken {
  assetId: CaipAssetType;
  category: OwnedTokenCategory;
  /** True when the wallet already has a balance or custom-asset entry. */
  isTracked: boolean;
  name: string;
  symbol: string;
  decimals: number;
  balance: string;
  price?: string;
  chainId: CaipChainId;
  address: string;
  imageUrl: string;
}

export interface ImportOwnedTokensDeps {
  unhideAsset: (assetId: CaipAssetType) => Promise<void> | void;
  addCustomAsset: (
    assetId: CaipAssetType,
    metadata: {
      address: string;
      symbol: string;
      name: string;
      decimals: number;
      chainId: CaipChainId;
    },
    accountId: string,
  ) => Promise<void>;
  accountForChain: (chainId: CaipChainId) => { id: string } | undefined;
}

const toKey = (assetId: string) => assetId.toLowerCase();

/**
 * Normalizes a CAIP-19 asset id to `${chainId}:${lowercasedAddress}` so that
 * tracked/hidden lookups aren't thrown off by checksum-case differences or
 * asset-namespace quirks (e.g. `erc20` vs another standard) between the
 * Accounts API response and AssetsController state.
 */
const toComparableAssetKey = (assetId: string): string | undefined => {
  try {
    // Lowercase first: CAIP-19 namespace/type segments (e.g. `erc20`) must be
    // lowercase to parse, and any historical mixed-case id should still match.
    const { chainId, assetReference } = parseCaipAssetType(
      assetId.toLowerCase() as CaipAssetType,
    );
    return `${chainId}:${assetReference}`;
  } catch {
    return undefined;
  }
};

/**
 * An EVM account scoped to `eip155:0` covers every EVM chain. Other accounts
 * match a chain only when the scope namespace (and reference, when set) agrees.
 */
export function accountSupportsChain(
  account: OwnedTokenAccount,
  chainId: string,
): boolean {
  const chainNamespace = chainId.split(':')[0];
  return account.scopes.some((scope) => {
    const [namespace, reference] = scope.split(':');
    if (namespace !== chainNamespace) {
      return false;
    }
    if (reference === '0') {
      return true;
    }
    return scope === chainId;
  });
}

/** One CAIP-10 id per account and supported chain, matching Accounts API v6. */
export function buildCaip10AccountIds(
  accounts: readonly OwnedTokenAccount[],
  chainIds: readonly string[],
): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();

  accounts.forEach((account) => {
    chainIds.forEach((chainId) => {
      if (!account.address || !accountSupportsChain(account, chainId)) {
        return;
      }
      const accountId = `${chainId}:${account.address}`;
      if (seen.has(accountId)) {
        return;
      }
      seen.add(accountId);
      ids.push(accountId);
    });
  });

  return ids;
}

export function indexWalletTokens({
  customAssets,
  assetsBalance,
  assetsInfo,
  assetPreferences,
  ignoredAssetIds,
}: WalletTokenIndexInput): WalletTokenIndex {
  const hiddenAssetIds = new Set<string>();
  const presentAssetIds = new Set<string>();

  const remember = (set: Set<string>, assetId: string) => {
    const key = toComparableAssetKey(assetId);
    if (key) {
      set.add(key);
    }
  };

  Object.keys(assetsInfo).forEach((assetId) =>
    remember(presentAssetIds, assetId),
  );
  Object.values(customAssets).forEach((assetIds) => {
    (assetIds ?? []).forEach((assetId) => remember(presentAssetIds, assetId));
  });
  Object.values(assetsBalance).forEach((balances) => {
    Object.keys(balances ?? {}).forEach((assetId) =>
      remember(presentAssetIds, assetId),
    );
  });

  Object.entries(assetPreferences).forEach(([assetId, preference]) => {
    if (preference?.hidden) {
      remember(hiddenAssetIds, assetId);
      remember(presentAssetIds, assetId);
    }
  });
  ignoredAssetIds.forEach((assetId) => {
    remember(hiddenAssetIds, assetId);
    remember(presentAssetIds, assetId);
  });

  return { hiddenAssetIds, presentAssetIds };
}

export function shortenOwnedTokenAddress(address: string): string {
  if (address.length <= 12) {
    return address;
  }
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export type OwnedTokenListRow =
  | {
      kind: 'section';
      id: OwnedTokenCategory;
      count: number;
    }
  | {
      kind: 'token';
      token: ClassifiedOwnedToken;
    };

/** Group an "all" list under Hidden and Not detected. Filtered lists stay flat. */
export function buildOwnedTokenRows(
  tokens: readonly ClassifiedOwnedToken[],
  category: 'all' | OwnedTokenCategory,
): OwnedTokenListRow[] {
  if (category !== 'all') {
    return tokens.map((token) => ({ kind: 'token', token }));
  }

  const rows: OwnedTokenListRow[] = [];
  (['hidden', 'undetected'] as const).forEach((section) => {
    const sectionTokens = tokens.filter((token) => token.category === section);
    if (sectionTokens.length === 0) {
      return;
    }
    rows.push({
      kind: 'section',
      id: section,
      count: sectionTokens.length,
    });
    sectionTokens.forEach((token) => {
      rows.push({ kind: 'token', token });
    });
  });
  return rows;
}

/**
 * Static token-icon URL. EVM addresses are lowercased; other namespaces keep
 * their case, matching the token-icon CDN.
 */
export function createOwnedTokenImageUrl(assetId: CaipAssetType): string {
  const { chainId } = parseCaipAssetType(assetId);
  return getAssetImageUrl(assetId, chainId) ?? '';
}

const isPositiveBalance = (balance: string): boolean => {
  const value = Number(balance);
  return Number.isFinite(value) && value > 0;
};

const isSkippedBalance = (item: V6BalanceItem): boolean => {
  if (item.object !== 'token' || item.type === 'native') {
    return true;
  }
  try {
    return (
      parseCaipAssetType(item.assetId as CaipAssetType).assetNamespace ===
      'slip44'
    );
  } catch {
    return true;
  }
};

/**
 * Keep balances AssetsController does not already show: manually hidden
 * tokens, and balances whose asset id is absent from controller state.
 */
export function classifyOwnedBalances(
  balances: readonly V6BalanceItem[],
  index: WalletTokenIndex,
): ClassifiedOwnedToken[] {
  const byAssetId = new Map<string, ClassifiedOwnedToken>();

  balances.forEach((item) => {
    if (isSkippedBalance(item)) {
      return;
    }
    if (!isPositiveBalance(item.balance)) {
      return;
    }

    let parsed: ReturnType<typeof parseCaipAssetType>;
    try {
      parsed = parseCaipAssetType(item.assetId as CaipAssetType);
    } catch {
      return;
    }

    const dedupeKey = toKey(item.assetId);
    const trackingKey = toComparableAssetKey(item.assetId) ?? dedupeKey;
    const isHidden = index.hiddenAssetIds.has(trackingKey);
    const isTracked = index.presentAssetIds.has(trackingKey);
    if (!isHidden && isTracked) {
      return;
    }

    const next: ClassifiedOwnedToken = {
      assetId: item.assetId as CaipAssetType,
      category: isHidden ? 'hidden' : 'undetected',
      isTracked,
      name: item.name || item.symbol,
      symbol: item.symbol,
      decimals: item.decimals,
      balance: item.balance,
      price: item.price,
      chainId: parsed.chainId,
      address: parsed.assetReference,
      imageUrl: createOwnedTokenImageUrl(item.assetId as CaipAssetType),
    };

    const existing = byAssetId.get(dedupeKey);
    if (existing && Number(existing.balance) >= Number(next.balance)) {
      return;
    }
    byAssetId.set(dedupeKey, next);
  });

  return [...byAssetId.values()].sort((left, right) => {
    if (left.category !== right.category) {
      return left.category === 'hidden' ? -1 : 1;
    }
    return left.symbol.localeCompare(right.symbol);
  });
}

const BALANCE_DUST_THRESHOLD = 0.00001;
const FIAT_DUST_THRESHOLD = 0.01;
/** Past this, show 42.54B instead of the full integer. Matches `localizeLargeNumber`. */
const LARGE_BALANCE_THRESHOLD = 1_000_000;
/** Same missing-value mark the wallet token list uses for an unknown fiat balance. */
const MISSING_FIAT = '—';

/**
 * Accounts API v6 `balance` is a minimal-unit integer string. A value that
 * already contains a decimal point is left as-is.
 */
const toHumanAmount = (balance: string, decimals: number): number => {
  const trimmed = balance.trim();
  try {
    const human = /^-?\d+$/.test(trimmed)
      ? fromTokenMinimalUnitString(trimmed.replace(/^-/, ''), decimals)
      : trimmed;
    const value = Number(human);
    return trimmed.startsWith('-') ? -Math.abs(value) : value;
  } catch {
    return Number.NaN;
  }
};

/** Token amount, formatted like `assetToToken` on the wallet token list. */
export function formatOwnedTokenBalance(
  balance: string,
  decimals: number,
  chainId?: string,
): string {
  const human = toHumanAmount(balance, decimals);
  if (!Number.isFinite(human)) {
    return balance;
  }
  if (human >= LARGE_BALANCE_THRESHOLD) {
    return localizeLargeNumber({ t: (key: string) => strings(key) }, human);
  }
  const chainPlaces = chainId
    ? MULTICHAIN_NETWORK_DECIMAL_PLACES[chainId as CaipChainId]
    : undefined;
  return formatWithThreshold(human, BALANCE_DUST_THRESHOLD, I18n.locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: chainPlaces || 5,
  });
}

/** Fiat value of the holding. Missing price uses the token list's dash. */
export function formatOwnedTokenFiat(
  balance: string,
  decimals: number,
  price?: string,
): string {
  if (!price) {
    return MISSING_FIAT;
  }
  const value = toHumanAmount(balance, decimals) * Number(price);
  if (!Number.isFinite(value) || value <= 0) {
    return MISSING_FIAT;
  }
  return formatWithThreshold(
    value,
    FIAT_DUST_THRESHOLD,
    getLocaleLanguageCode(),
    {
      style: 'currency',
      currency: 'usd',
    },
  );
}

/**
 * Unhide tokens the user hid, and import balances detection never added.
 */
export async function importOwnedTokens(
  tokens: readonly ClassifiedOwnedToken[],
  { unhideAsset, addCustomAsset, accountForChain }: ImportOwnedTokensDeps,
): Promise<{ addedAssetIds: CaipAssetType[]; failed: number }> {
  const results = await Promise.allSettled(
    tokens.map(async (token) => {
      if (token.category === 'hidden') {
        await unhideAsset(token.assetId);
      }
      if (token.isTracked) {
        return;
      }

      const account = accountForChain(token.chainId);
      if (!account?.id) {
        throw new Error('Missing account for token chain');
      }

      const parsed = parseCaipAssetType(token.assetId);
      const isEvm = parsed.chain.namespace === 'eip155';
      await addCustomAsset(
        token.assetId,
        {
          address: isEvm ? parsed.assetReference : token.assetId,
          symbol: token.symbol,
          name: token.name,
          decimals: token.decimals,
          chainId: parsed.chainId,
        },
        account.id,
      );
    }),
  );

  const addedAssetIds: CaipAssetType[] = [];
  let failed = 0;
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      addedAssetIds.push(tokens[index].assetId);
    } else {
      failed += 1;
    }
  });
  return { addedAssetIds, failed };
}
