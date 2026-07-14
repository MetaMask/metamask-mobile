import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { CaipChainId } from '@metamask/utils';
import {
  type ActivityListItem,
  isGasTokenFeeWithAmount,
  isSpendingCapWithAmount,
} from '../../../../util/activity-adapters';
import { selectNonEvmTransactionsForSelectedAccountGroup } from '../../../../selectors/multichain/multichain';
/* eslint-disable import-x/no-restricted-paths -- TODO(ADR-0020): reuses the activity list's data sources; route-isolation backlog */
import { useLocalActivityItems } from '../../ActivityList/hooks/useLocalActivityItems';
import { useRampActivityItems } from '../../ActivityList/hooks/useRampActivityItems';
import { useTransactionsQuery } from '../../ActivityList/useTransactionsQuery';
import { mapNonEvmTransactions } from '../../ActivityList/helpers/transformations';
/* eslint-enable import-x/no-restricted-paths */

/**
 * Re-resolves a single {@link ActivityListItem} by its transaction identifier
 * (hash or local `TransactionMeta.id`), drawing from the same sources that feed
 * the activity list: local EVM transactions, confirmed EVM transactions (API),
 * and non-EVM (keyring) transactions.
 *
 * Mirrors the extension's `ui/pages/details/transaction-details.tsx` resolution:
 * a more-categorized API item takes precedence over a local item when the local
 * item is less-categorized than the API copy — either a generic
 * `contractInteraction` or a `swapIncomplete` (a swap whose destination token
 * could not be resolved on-device, which the API often resolves to a full
 * `swap`). This keeps the details page in sync with the list, which dedups
 * confirmed swaps to the API copy.
 *
 * Local gasless/STX rows may temporarily change their displayed hash while the
 * meta `id` stays stable. Lookup therefore indexes local rows by meta id and
 * both primary/initial hashes. A stashed preloaded local row bridges route
 * params that still hold a superseded hash to the live meta by id.
 *
 * When a `chainId` is provided, candidates are restricted to that chain first,
 * so a hash that collides across chains resolves to the correct transaction.
 */
function buildItemsByHash(
  items: ActivityListItem[],
): Map<string, ActivityListItem> {
  const byHash = new Map<string, ActivityListItem>();
  for (const item of items) {
    const hash = item.hash?.toLowerCase();
    if (hash && !byHash.has(hash)) {
      byHash.set(hash, item);
    }
  }
  return byHash;
}

/** Keys that can address a local EVM Activity row (meta id + hashes). */
export function getLocalActivityLookupKeys(item: ActivityListItem): string[] {
  const keys = new Set<string>();
  if (item.hash) {
    keys.add(item.hash.toLowerCase());
  }
  if (item.raw?.type !== 'localTransaction') {
    return [...keys];
  }
  const { primaryTransaction, initialTransaction } = item.raw.data;
  for (const tx of [primaryTransaction, initialTransaction]) {
    if (tx?.id) {
      keys.add(tx.id.toLowerCase());
    }
    if (tx?.hash) {
      keys.add(tx.hash.toLowerCase());
    }
  }
  return [...keys];
}

function buildLocalItemsByLookupKey(
  items: ActivityListItem[],
): Map<string, ActivityListItem> {
  const byKey = new Map<string, ActivityListItem>();
  for (const item of items) {
    for (const key of getLocalActivityLookupKeys(item)) {
      if (!byKey.has(key)) {
        byKey.set(key, item);
      }
    }
  }
  return byKey;
}

function isProviderBackedItem(item: ActivityListItem): boolean {
  return (
    item.raw?.type === 'perpsTransaction' ||
    item.raw?.type === 'predictActivity'
  );
}

function buildItemsByIdentifier(
  items: ActivityListItem[],
): Map<string, ActivityListItem> {
  const byIdentifier = buildItemsByHash(items);
  for (const item of items) {
    const domainId =
      item.raw?.type === 'perpsTransaction' ||
      item.raw?.type === 'predictActivity' ||
      item.raw?.type === 'rampOrder'
        ? item.raw.data.id
        : undefined;
    const normalizedDomainId = domainId?.toLowerCase();
    if (normalizedDomainId && !byIdentifier.has(normalizedDomainId)) {
      byIdentifier.set(normalizedDomainId, item);
    }
    for (const key of getLocalActivityLookupKeys(item)) {
      if (!byIdentifier.has(key)) {
        byIdentifier.set(key, item);
      }
    }
  }
  return byIdentifier;
}

function filterByChain(
  items: ActivityListItem[],
  chainId: CaipChainId | undefined,
): ActivityListItem[] {
  if (!chainId) {
    return items;
  }
  // Exact CAIP-2 match: every adapter emits a canonical chain id and the
  // navigation call site forwards the item's own `chainId`, so the strings
  // align. Avoids lowercasing case-sensitive references (e.g. Solana base58).
  return items.filter((item) => item.chainId === chainId);
}

function getPreferredApiItem(
  apiByHash: Map<string, ActivityListItem>,
  id: string,
  ...candidates: (ActivityListItem | undefined)[]
): ActivityListItem | undefined {
  const direct = apiByHash.get(id);
  if (direct) {
    return direct;
  }
  for (const candidate of candidates) {
    const hash = candidate?.hash?.toLowerCase();
    if (hash) {
      const byCandidateHash = apiByHash.get(hash);
      if (byCandidateHash) {
        return byCandidateHash;
      }
    }
  }
  return undefined;
}

function preferLocalOrApi(
  localItem: ActivityListItem,
  apiItem: ActivityListItem | undefined,
): ActivityListItem {
  if (!apiItem) {
    return localItem;
  }
  const hasMatchingType = apiItem.type === localItem.type;
  const isLocalLessCategorized =
    localItem.type === 'contractInteraction' ||
    localItem.type === 'swapIncomplete';
  // Spending caps: the accounts API returns no calldata for an approve, so
  // its confirmed copy has no cap amount. Keep the local copy (decoded from
  // calldata) when only it carries the amount, so the details screen shows
  // the cap.
  const localHasRicherSpendingCap =
    isSpendingCapWithAmount(localItem) && !isSpendingCapWithAmount(apiItem);
  // Gasless/STX: local meta has selectedGasFeeToken; the accounts API only
  // returns a native network fee. Prefer local so Details keep the gas-token
  // fee (TMCU-1064).
  const localHasGasTokenFee =
    isGasTokenFeeWithAmount(localItem) && !isGasTokenFeeWithAmount(apiItem);
  if (
    (hasMatchingType || isLocalLessCategorized) &&
    !localHasRicherSpendingCap &&
    !localHasGasTokenFee
  ) {
    return apiItem;
  }
  return localItem;
}

export function useActivityDetailsItem(
  txIdentifier: string | undefined,
  chainId?: CaipChainId,
  preloadedItem?: ActivityListItem,
): ActivityListItem | undefined {
  const localActivityItems = useLocalActivityItems();
  const rampActivityItems = useRampActivityItems();
  const { data: evmTransactions } = useTransactionsQuery();
  const nonEvmState = useSelector(
    selectNonEvmTransactionsForSelectedAccountGroup,
  );

  const confirmedEvmItems = useMemo<ActivityListItem[]>(
    () => evmTransactions?.pages.flatMap((page) => page.data) ?? [],
    [evmTransactions],
  );

  const nonEvmItems = useMemo<ActivityListItem[]>(
    () => mapNonEvmTransactions(nonEvmState?.transactions ?? []),
    [nonEvmState?.transactions],
  );

  const chainedLocalItems = useMemo(
    () => filterByChain(localActivityItems, chainId),
    [localActivityItems, chainId],
  );
  const localByLookupKey = useMemo(
    () => buildLocalItemsByLookupKey(chainedLocalItems),
    [chainedLocalItems],
  );
  const apiByHash = useMemo(
    () => buildItemsByHash(filterByChain(confirmedEvmItems, chainId)),
    [confirmedEvmItems, chainId],
  );
  const nonEvmByHash = useMemo(
    () => buildItemsByHash(filterByChain(nonEvmItems, chainId)),
    [nonEvmItems, chainId],
  );
  const preloadedByIdentifier = useMemo(
    () =>
      buildItemsByIdentifier(
        filterByChain(preloadedItem ? [preloadedItem] : [], chainId),
      ),
    [preloadedItem, chainId],
  );
  const rampByIdentifier = useMemo(
    () => buildItemsByIdentifier(filterByChain(rampActivityItems, chainId)),
    [rampActivityItems, chainId],
  );

  return useMemo(() => {
    const id = txIdentifier?.toLowerCase();
    if (!id) {
      return undefined;
    }

    const preloadedResolvedItem = preloadedByIdentifier.get(id);

    // Provider-backed rows can't be re-resolved from list sources — honor the
    // hand-off first (also wins hash collisions with unrelated local txs).
    if (preloadedResolvedItem && isProviderBackedItem(preloadedResolvedItem)) {
      return preloadedResolvedItem;
    }

    const preloadedMetaId =
      preloadedResolvedItem?.raw?.type === 'localTransaction'
        ? preloadedResolvedItem.raw.data.primaryTransaction.id?.toLowerCase()
        : undefined;
    const localFromPreloadMeta = preloadedMetaId
      ? localByLookupKey.get(preloadedMetaId)
      : undefined;

    const localItem = localByLookupKey.get(id) ?? localFromPreloadMeta;
    const apiItem = getPreferredApiItem(
      apiByHash,
      id,
      localItem,
      preloadedResolvedItem,
    );
    const nonEvmItem = nonEvmByHash.get(id);
    const rampItem = rampByIdentifier.get(id);

    if (rampItem) {
      return rampItem;
    }

    if (localItem) {
      return preferLocalOrApi(localItem, apiItem);
    }

    // Live local missed (STX hash flip / TC prune) but we still have the
    // stashed local snapshot from navigation — apply the same API preference
    // so a gas-token (or richer spending-cap) fee is not discarded for a
    // native-only API copy.
    if (preloadedResolvedItem?.raw?.type === 'localTransaction') {
      return preferLocalOrApi(preloadedResolvedItem, apiItem);
    }

    if (nonEvmItem) {
      return nonEvmItem;
    }

    if (apiItem) {
      return apiItem;
    }

    return preloadedResolvedItem;
  }, [
    txIdentifier,
    localByLookupKey,
    apiByHash,
    nonEvmByHash,
    preloadedByIdentifier,
    rampByIdentifier,
  ]);
}
