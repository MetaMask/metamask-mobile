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
import { selectLocalActivityItemsByIdentifier } from '../../../../selectors/activity';
import { selectExcludedActivityTransactionHashes } from '../../../../selectors/transactionController';
import { useLocalTransactionMeta } from './useLocalTransactionMeta';
/* eslint-disable import-x/no-restricted-paths -- TODO(ADR-0020): reuses the activity list's data sources; route-isolation backlog */
import { useApiTransaction } from '../../ActivityList/hooks/activity/useApiTransaction';
import { isValidTransactionHash } from '../../ActivityList/hooks/activity/isValidTransactionHash';
import { useRampActivityItemsById } from '../../ActivityList/hooks/useRampActivityItems';
import { useTransactionsQuery } from '../../ActivityList/useTransactionsQuery';
import {
  mapNonEvmTransactions,
  shouldSkipUnrelatedTransaction,
} from '../../ActivityList/helpers/transformations';
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

function getPreferredItem(
  items: Map<string, ActivityListItem>,
  ...identifiers: (string | number | undefined)[]
) {
  for (const identifier of identifiers) {
    if (identifier === undefined) {
      continue;
    }
    const item = items.get(String(identifier).toLowerCase());
    if (item) {
      return item;
    }
  }
}

function getPreferredApiItem(
  apiByHash: Map<string, ActivityListItem>,
  id: string,
  ...candidates: (ActivityListItem | undefined)[]
) {
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
  { fetchByHash = true }: { fetchByHash?: boolean } = {},
): {
  item: ActivityListItem | undefined;
  isFetching: boolean;
} {
  const localByLookupKey = useSelector(selectLocalActivityItemsByIdentifier);
  const rampActivityItemsById = useRampActivityItemsById();
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
  const excludedTxHashes = useSelector(selectExcludedActivityTransactionHashes);
  const { bridgeHistoryItemsBySrcTxHash } = useBridgeHistoryItemBySrcTxHash();

  const txHash =
    fetchByHash &&
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

  const apiByHash = useMemo(
    () => buildItemsByHash(filterByChain(confirmedEvmItems, chainId)),
    [confirmedEvmItems, chainId],
  );
  const nonEvmByHash = useMemo(
    () => buildItemsByHash(filterByChain(nonEvmItems, chainId)),
    [nonEvmItems, chainId],
  );
  const rampByIdentifier = useMemo(() => {
    const byIdentifier = new Map<string, ActivityListItem>();
    for (const [id, item] of rampActivityItemsById) {
      if (chainId && item.chainId !== chainId) {
        continue;
      }
      const hash = item.hash?.toLowerCase();
      if (hash) {
        byIdentifier.set(hash, item);
      }
      byIdentifier.set(id, item);
    }
    return byIdentifier;
  }, [rampActivityItemsById, chainId]);
  const localTransactionMeta = useLocalTransactionMeta(txIdentifier);

  const fetchedApiItem = useMemo(() => {
    if (!apiTransaction || !evmAddress) {
      return undefined;
    }

    // Participation gate only. Without it, by-hash results whose top-level
    // from/to are not the subject (relayer gasless txs, unrelated hashes) still
    // map to a plausible "Sent" with the native value fallback. The list's
    // inbound-transfer filtering is deliberately not applied here: this request
    // always includes value transfers, so it would drop genuine receives.
    const subjectAddress = evmAddress.toLowerCase();
    if (
      shouldSkipUnrelatedTransaction(
        subjectAddress,
        apiTransaction,
        excludedTxHashes,
      )
    ) {
      return undefined;
    }

    const activity = mapApiTransaction({
      subjectAddress,
      transaction: apiTransaction,
    }) as ActivityListItem;
    const classified = classifyPooledStakingActivity(apiTransaction, activity);

    if (chainId && classified.chainId !== chainId) {
      return undefined;
    }

    return classified;
  }, [apiTransaction, chainId, evmAddress, excludedTxHashes]);

  const item = useMemo(() => {
    if (!txIdentifier) {
      return undefined;
    }

    const rampsActivityItem = getPreferredItem(rampByIdentifier, txIdentifier);
    if (rampsActivityItem) {
      return rampsActivityItem;
    }

    const localItem = getPreferredItem(
      localByLookupKey,
      txIdentifier,
      localTransactionMeta?.hash,
      localTransactionMeta?.id,
    );
    const apiItem =
      getPreferredApiItem(
        apiByHash,
        txIdentifier.toLowerCase(),
        localItem,
        fetchedApiItem,
      ) ??
      (fetchedApiItem?.hash?.toLowerCase() === txIdentifier.toLowerCase()
        ? fetchedApiItem
        : undefined);
    const nonEvmItem = getPreferredItem(nonEvmByHash, txIdentifier);

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
    localTransactionMeta,
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
