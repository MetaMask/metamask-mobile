import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { mapApiTransaction } from '@metamask/client-utils';
import type { CaipChainId } from '@metamask/utils';
import {
  type ActivityListItem,
  classifyPooledStakingActivity,
  preferLocalOrApiActivityItem,
} from '../../../../util/activity-adapters';
import { selectEvmAddress } from '../../../../selectors/accountsController';
import { selectNonEvmTransactionsForSelectedAccountGroup } from '../../../../selectors/multichain/multichain';
import {
  selectSelectedAccountGroupEvmInternalAccount,
  selectSelectedAccountGroupInternalAccounts,
} from '../../../../selectors/multichainAccounts/accountTreeController';
/* eslint-disable import-x/no-restricted-paths -- TODO(ADR-0020): reuses the activity list's data sources; route-isolation backlog */
import { useApiTransaction } from '../../ActivityList/hooks/activity/useApiTransaction';
import { isValidTransactionHash } from '../../ActivityList/hooks/activity/isValidTransactionHash';
import { useLocalActivityItems } from '../../ActivityList/hooks/useLocalActivityItems';
import { useRampActivityItems } from '../../ActivityList/hooks/useRampActivityItems';
import { useTransactionsQuery } from '../../ActivityList/useTransactionsQuery';
import { mapNonEvmTransactions } from '../../ActivityList/helpers/transformations';
/* eslint-enable import-x/no-restricted-paths */
import {
  findBridgeHistoryItemBySrcTxHash,
  useBridgeHistoryItemBySrcTxHash,
} from '../../../UI/Bridge/hooks/useBridgeHistoryItemBySrcTxHash';

/**
 * Re-resolves a single {@link ActivityListItem} by its transaction identifier
 * (hash or local `TransactionMeta.id`), drawing from the same sources that feed
 * the activity list: local EVM transactions, confirmed EVM transactions (API),
 * and non-EVM (keyring) transactions.
 *
 * Mirrors the extension's `ui/pages/details/transaction-details.tsx` resolution:
 * a more-categorized API item takes precedence over a local item when the local
 * item is less-categorized than the API copy — a generic
 * `contractInteraction`. This keeps the details page in sync with the list.
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
function getLocalActivityLookupKeys(item: ActivityListItem): string[] {
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

function buildItemsByIdentifier(
  items: ActivityListItem[],
): Map<string, ActivityListItem> {
  const byIdentifier = buildItemsByHash(items);
  for (const item of items) {
    const domainId =
      item.raw?.type === 'rampOrder' ? item.raw.data.id : undefined;
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

export function useActivityDetailsItem(
  txIdentifier: string | undefined,
  chainId?: CaipChainId,
): {
  item: ActivityListItem | undefined;
  isFetching: boolean;
} {
  const localActivityItems = useLocalActivityItems();
  const rampActivityItems = useRampActivityItems();
  const { data: evmTransactions, isFetching: isListFetching } =
    useTransactionsQuery();
  const groupEvmAccount = useSelector(
    selectSelectedAccountGroupEvmInternalAccount,
  );
  const globalEvmAddress = useSelector(selectEvmAddress);
  const evmAddress = (groupEvmAccount?.address ?? globalEvmAddress ?? '') || '';
  const nonEvmState = useSelector(
    selectNonEvmTransactionsForSelectedAccountGroup,
  );
  const accounts = useSelector(selectSelectedAccountGroupInternalAccounts);
  const { bridgeHistoryItemsBySrcTxHash } = useBridgeHistoryItemBySrcTxHash();

  const txHash =
    chainId?.startsWith('eip155:') &&
    txIdentifier &&
    isValidTransactionHash(txIdentifier)
      ? txIdentifier
      : undefined;
  const { transaction: apiTransaction, isFetching: isSingleTxFetching } =
    useApiTransaction({ chainId, txHash });

  const confirmedEvmItems = useMemo<ActivityListItem[]>(
    () => evmTransactions?.pages.flatMap((page) => page.data) ?? [],
    [evmTransactions],
  );

  const nonEvmItems = useMemo<ActivityListItem[]>(
    () =>
      mapNonEvmTransactions(
        nonEvmState?.transactions ?? [],
        (txId) =>
          findBridgeHistoryItemBySrcTxHash(bridgeHistoryItemsBySrcTxHash, txId),
        (transaction) =>
          accounts.find((account) => account.id === transaction.account)
            ?.address,
      ),
    [nonEvmState?.transactions, bridgeHistoryItemsBySrcTxHash, accounts],
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
  const rampByIdentifier = useMemo(
    () => buildItemsByIdentifier(filterByChain(rampActivityItems, chainId)),
    [rampActivityItems, chainId],
  );

  const fetchedApiItem = useMemo(() => {
    if (!apiTransaction || !evmAddress) {
      return undefined;
    }

    const activity = {
      ...mapApiTransaction({
        subjectAddress: evmAddress,
        transaction: apiTransaction,
      }),
      raw: { type: 'apiEvmTransaction' as const, data: apiTransaction },
    } as ActivityListItem;
    const classified = classifyPooledStakingActivity(apiTransaction, activity);

    if (chainId && classified.chainId !== chainId) {
      return undefined;
    }

    return classified;
  }, [apiTransaction, chainId, evmAddress]);

  const item = useMemo(() => {
    const id = txIdentifier?.toLowerCase();
    if (!id) {
      return undefined;
    }

    const rampsActivityItem = rampByIdentifier.get(id);
    if (rampsActivityItem) {
      return rampsActivityItem;
    }

    const localItem = localByLookupKey.get(id);
    const apiItem =
      getPreferredApiItem(apiByHash, id, localItem, fetchedApiItem) ??
      (fetchedApiItem?.hash?.toLowerCase() === id ? fetchedApiItem : undefined);
    const nonEvmItem = nonEvmByHash.get(id);

    if (localItem) {
      return preferLocalOrApiActivityItem(localItem, apiItem);
    }

    if (nonEvmItem) {
      return nonEvmItem;
    }

    return apiItem;
  }, [
    txIdentifier,
    localByLookupKey,
    apiByHash,
    nonEvmByHash,
    rampByIdentifier,
    fetchedApiItem,
  ]);

  const isFetching = useMemo(() => {
    if (item) {
      return false;
    }

    if (isSingleTxFetching) {
      return true;
    }

    return evmTransactions === undefined && isListFetching;
  }, [item, isSingleTxFetching, evmTransactions, isListFetching]);

  return { item, isFetching };
}
