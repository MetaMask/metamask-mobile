import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { CaipChainId } from '@metamask/utils';
import {
  type ActivityListItem,
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
 * (hash), drawing from the same three sources that feed the activity list:
 * local EVM transactions, confirmed EVM transactions (API), and non-EVM
 * (keyring) transactions.
 *
 * Mirrors the extension's `ui/pages/details/transaction-details.tsx` resolution:
 * a more-categorized API item takes precedence over a local item when the local
 * item is less-categorized than the API copy — either a generic
 * `contractInteraction` or a `swapIncomplete` (a swap whose destination token
 * could not be resolved on-device, which the API often resolves to a full
 * `swap`). This keeps the details page in sync with the list, which dedups
 * confirmed swaps to the API copy.
 *
 * When a `chainId` is provided, candidates are restricted to that chain first,
 * so a hash that collides across chains resolves to the correct transaction.
 *
 * Local items are additionally indexed by their underlying TransactionController
 * ids (see {@link buildLocalItemsById}), so a details screen opened with a
 * transaction's internal id — the value the row falls back to before a freshly
 * submitted tx has an on-chain hash — keeps resolving once the tx is broadcast
 * and the local item is re-keyed by its hash. API / non-EVM items are always
 * hash-addressed.
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

function buildItemsByIdentifier(
  items: ActivityListItem[],
): Map<string, ActivityListItem> {
  const byIdentifier = buildItemsByHash(items);
  for (const item of items) {
    const identifier =
      item.raw?.type === 'perpsTransaction' ||
      item.raw?.type === 'predictActivity' ||
      item.raw?.type === 'rampOrder'
        ? item.raw.data.id
        : undefined;
    const normalizedIdentifier = identifier?.toLowerCase();
    if (normalizedIdentifier && !byIdentifier.has(normalizedIdentifier)) {
      byIdentifier.set(normalizedIdentifier, item);
    }
  }
  return byIdentifier;
}

/**
 * Indexes local EVM items by their underlying TransactionController ids (the
 * primary/initial attempt and every attempt in the group). A freshly-submitted
 * tx has no on-chain hash for a brief window, so the row's `hash` falls back to
 * the internal tx id and navigation captures that id; once the tx is broadcast
 * the item is re-keyed by its real hash, orphaning the captured id. Indexing by
 * id too keeps the captured id resolving across that flip.
 */
function buildLocalItemsById(
  items: ActivityListItem[],
): Map<string, ActivityListItem> {
  const byId = new Map<string, ActivityListItem>();
  for (const item of items) {
    if (item.raw?.type !== 'localTransaction') {
      continue;
    }
    const { primaryTransaction, initialTransaction, transactions } =
      item.raw.data;
    const ids = [
      primaryTransaction?.id,
      initialTransaction?.id,
      ...(transactions?.map((transaction) => transaction.id) ?? []),
    ];
    for (const id of ids) {
      const normalizedId = id?.toLowerCase();
      if (normalizedId && !byId.has(normalizedId)) {
        byId.set(normalizedId, item);
      }
    }
  }
  return byId;
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

  const localByHash = useMemo(
    () => buildItemsByHash(filterByChain(localActivityItems, chainId)),
    [localActivityItems, chainId],
  );
  const localById = useMemo(
    () => buildLocalItemsById(filterByChain(localActivityItems, chainId)),
    [localActivityItems, chainId],
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

    const localItem = localByHash.get(id) ?? localById.get(id);
    const apiItem = apiByHash.get(id);
    const nonEvmItem = nonEvmByHash.get(id);
    const preloadedResolvedItem = preloadedByIdentifier.get(id);
    const rampItem = rampByIdentifier.get(id);

    if (preloadedResolvedItem) {
      return preloadedResolvedItem;
    }

    if (rampItem) {
      return rampItem;
    }

    if (localItem) {
      const hasMatchingType = apiItem?.type === localItem.type;
      const isLocalLessCategorized =
        localItem.type === 'contractInteraction' ||
        localItem.type === 'swapIncomplete';
      // Spending caps: the accounts API returns no calldata for an approve, so
      // its confirmed copy has no cap amount. Keep the local copy (decoded from
      // calldata) when only it carries the amount, so the details screen shows
      // the cap
      const localHasRicherSpendingCap =
        !!apiItem &&
        isSpendingCapWithAmount(localItem) &&
        !isSpendingCapWithAmount(apiItem);
      if (
        apiItem &&
        (hasMatchingType || isLocalLessCategorized) &&
        !localHasRicherSpendingCap
      ) {
        return apiItem;
      }
      return localItem;
    }

    return nonEvmItem ?? apiItem ?? undefined;
  }, [
    txIdentifier,
    localByHash,
    localById,
    apiByHash,
    nonEvmByHash,
    preloadedByIdentifier,
    rampByIdentifier,
  ]);
}
