import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { CaipChainId } from '@metamask/utils';
import type { ActivityListItem } from '../../../../util/activity-adapters';
import { selectNonEvmTransactionsForSelectedAccountGroup } from '../../../../selectors/multichain/multichain';
/* eslint-disable import-x/no-restricted-paths -- TODO(ADR-0020): reuses the activity list's data sources; route-isolation backlog */
import { useLocalActivityItems } from '../../ActivityList/hooks/useLocalActivityItems';
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
 * a more-categorized API item takes precedence over a local item, unless the
 * local item is a generic `contractInteraction` (in which case the richer API
 * categorization wins anyway).
 *
 * When a `chainId` is provided, candidates are restricted to that chain first,
 * so a hash that collides across chains resolves to the correct transaction.
 *
 * NOTE: resolution is keyed on `hash`, so a pending local transaction that does
 * not yet have a hash cannot be addressed here — this matches the extension and
 * is acceptable for the foundation pass.
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
): ActivityListItem | undefined {
  const localActivityItems = useLocalActivityItems();
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
  const apiByHash = useMemo(
    () => buildItemsByHash(filterByChain(confirmedEvmItems, chainId)),
    [confirmedEvmItems, chainId],
  );
  const nonEvmByHash = useMemo(
    () => buildItemsByHash(filterByChain(nonEvmItems, chainId)),
    [nonEvmItems, chainId],
  );

  return useMemo(() => {
    const id = txIdentifier?.toLowerCase();
    if (!id) {
      return undefined;
    }

    const localItem = localByHash.get(id);
    const apiItem = apiByHash.get(id);
    const nonEvmItem = nonEvmByHash.get(id);

    if (localItem) {
      const hasMatchingType = apiItem?.type === localItem.type;
      const isLocalUncategorized = localItem.type === 'contractInteraction';
      if (apiItem && (hasMatchingType || isLocalUncategorized)) {
        return apiItem;
      }
      return localItem;
    }

    return nonEvmItem ?? apiItem ?? undefined;
  }, [txIdentifier, localByHash, apiByHash, nonEvmByHash]);
}
