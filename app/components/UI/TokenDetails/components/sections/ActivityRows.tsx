import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ActivityIndicator } from 'react-native';
import {
  Box,
  BoxAlignItems,
  Button,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { type CaipAssetType, type Hex } from '@metamask/utils';
import {
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import { strings } from '../../../../../../locales/i18n';
import {
  getGroupedActivityListItemKey,
  groupActivityListItems,
  type ActivityListItem,
  type GroupedActivityListItem,
} from '../../../../../util/activity-adapters';
import { mergeActivityItems } from '../../../../../util/activity-adapters/adapters/dedup';
import { areAddressesEqual } from '../../../../../util/address';
import ActivityListDateHeader from '../../../ActivityListItemRow/ActivityListDateHeader';
import ActivityHeader from '../../../../Views/Asset/ActivityHeader';
import {
  mapTransactionToActivityItem,
  type TransactionWithImportTime,
} from '../../../Transactions/AssetDetailsActivityListItem.utils';
import { filterDuplicateOutgoingTransactions } from '../../../Transactions/utils';
import { useTransactionsQuery } from '../../../../Views/ActivityList/useTransactionsQuery';
import type { TokenDetailsRouteParams } from '../../constants/constants';

export const TOKEN_DETAILS_ACTIVITY_SECTION_TEST_ID =
  'token-details-overview-tab-activity';
export const TOKEN_DETAILS_ACTIVITY_SHOW_MORE_TEST_ID =
  'token-details-activity-show-more';
export const TOKEN_DETAILS_ACTIVITY_LOADING_MORE_TEST_ID =
  'token-details-activity-loading-more';

export const DEFAULT_INITIAL_VISIBLE_ROWS = 3;

export const ACTIVITY_EXPAND_STEP_ROWS = 5;

interface UseGroupedTokenActivityParams {
  transactions: TransactionMeta[];
  submittedTxs: TransactionMeta[];
  confirmedTxs: TransactionMeta[];
  assetSymbol: string;
  chainId?: Hex;
  caipAssetId?: CaipAssetType;
  selectedAddress?: string;
}

interface GroupedTokenActivityResult {
  groupedItems: GroupedActivityListItem[];
  transactionByActivityItem: Map<ActivityListItem, TransactionWithImportTime>;
  apiItemHashes: Set<string>;
  apiItemCount: number;
  hasNextApiPage: boolean;
  isApiLoading: boolean;
  isFetchingNextApiPage: boolean;
  isApiError: boolean;
  fetchNextVisiblePage: (options?: {
    minVisibleItems?: number;
  }) => Promise<void | undefined>;
}

/**
 * Normalizes and groups token transactions into pending/date sections for
 * the activity row list. Includes API history integration and deduplication.
 */
function useGroupedTokenActivity({
  transactions,
  submittedTxs,
  confirmedTxs,
  assetSymbol,
  chainId,
  caipAssetId,
  selectedAddress,
}: UseGroupedTokenActivityParams): GroupedTokenActivityResult {
  const {
    data: apiEvmTransactions,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    isFetchNextPageError,
    fetchNextVisiblePage,
  } = useTransactionsQuery(
    caipAssetId ? { assetId: caipAssetId } : { enabled: false },
  );
  const autoFilledAssetIdRef = useRef<CaipAssetType | undefined>(undefined);

  const tokenApiItems = useMemo(
    () =>
      caipAssetId
        ? (apiEvmTransactions?.pages.flatMap((page) => page.data) ?? [])
        : [],
    [apiEvmTransactions, caipAssetId],
  );
  const localTransactionCount =
    submittedTxs.length > 0
      ? submittedTxs.length + confirmedTxs.length
      : transactions.length;
  const initialApiRowsNeeded = Math.max(
    DEFAULT_INITIAL_VISIBLE_ROWS - localTransactionCount,
    0,
  );

  useEffect(() => {
    if (!caipAssetId || isLoading || !apiEvmTransactions) {
      return;
    }
    if (autoFilledAssetIdRef.current === caipAssetId) {
      return;
    }
    if (isError || isFetchNextPageError || isFetchingNextPage) {
      return;
    }

    // One pass fills the first screen. View more loads anything older, so a
    // short or failed scan cannot chain requests by itself.
    autoFilledAssetIdRef.current = caipAssetId;
    if (
      !hasNextPage ||
      initialApiRowsNeeded === 0 ||
      tokenApiItems.length >= initialApiRowsNeeded
    ) {
      return;
    }

    Promise.resolve(
      fetchNextVisiblePage({ minVisibleItems: initialApiRowsNeeded }),
    ).catch(() => undefined);
  }, [
    caipAssetId,
    apiEvmTransactions,
    tokenApiItems.length,
    initialApiRowsNeeded,
    hasNextPage,
    isLoading,
    isFetchingNextPage,
    isError,
    isFetchNextPageError,
    fetchNextVisiblePage,
  ]);

  const apiHistoryEnabled = Boolean(caipAssetId);
  const groupedActivity = useMemo(() => {
    const listTransactions =
      submittedTxs.length > 0
        ? [...submittedTxs].sort((a, b) => b.time - a.time).concat(confirmedTxs)
        : transactions;
    const dedupedTransactions =
      filterDuplicateOutgoingTransactions(listTransactions);
    const mappedLocalItems = dedupedTransactions.map((transaction) =>
      mapTransactionToActivityItem({
        transaction,
        assetSymbol: assetSymbol ?? 'ETH',
        currentChainId: chainId ?? '0x1',
        tokenChainId: chainId ?? '0x1',
      }),
    );
    const apiReceiveHashes = new Set(
      tokenApiItems.flatMap((item) =>
        item.type === 'receive' && item.hash ? [item.hash.toLowerCase()] : [],
      ),
    );
    const visibleLocalActivity = dedupedTransactions.flatMap(
      (transaction, index) => {
        const activityItem = mappedLocalItems[index];
        const from = transaction.txParams?.from;
        const sameWalletSendHasReceive =
          transaction.type === TransactionType.simpleSend &&
          Boolean(from && selectedAddress) &&
          !areAddressesEqual(from ?? '', selectedAddress ?? '') &&
          Boolean(
            activityItem.hash &&
              apiReceiveHashes.has(activityItem.hash.toLowerCase()),
          );
        if (sameWalletSendHasReceive) {
          return [];
        }
        return [{ transaction, activityItem }];
      },
    );
    const filteredTransactions = visibleLocalActivity.map(
      (entry) => entry.transaction,
    );
    const localActivityItemsFromTxs = visibleLocalActivity.map(
      (entry) => entry.activityItem,
    );

    const localTypeByHash = new Map(
      localActivityItemsFromTxs.flatMap((i) =>
        i.hash ? [[i.hash.toLowerCase(), i.type]] : [],
      ),
    );
    const apiItems = tokenApiItems.filter((api) => {
      const localType = api.hash
        ? localTypeByHash.get(api.hash.toLowerCase())
        : undefined;
      return (
        !localType ||
        localType === api.type ||
        localType === 'contractInteraction'
      );
    });

    const mergedActivityItems = mergeActivityItems(
      localActivityItemsFromTxs,
      apiItems,
      [],
    );

    const transactionByActivityItem = new Map<
      ActivityListItem,
      TransactionWithImportTime
    >();
    for (let i = 0; i < filteredTransactions.length; i++) {
      const tx = filteredTransactions[i];
      const activityItem = localActivityItemsFromTxs[i];
      transactionByActivityItem.set(activityItem, tx);
    }

    const groupedItems = groupActivityListItems(mergedActivityItems);

    // Track which items in the merged list came from API
    const apiItemHashes = new Set(
      apiItems.flatMap((item) => (item.hash ? [item.hash.toLowerCase()] : [])),
    );

    return { groupedItems, transactionByActivityItem, apiItemHashes };
  }, [
    submittedTxs,
    confirmedTxs,
    transactions,
    assetSymbol,
    chainId,
    tokenApiItems,
    selectedAddress,
  ]);

  return {
    ...groupedActivity,
    apiItemCount: tokenApiItems.length,
    hasNextApiPage: apiHistoryEnabled && Boolean(hasNextPage),
    isApiLoading: apiHistoryEnabled && (isLoading || isFetchingNextPage),
    isFetchingNextApiPage: apiHistoryEnabled && isFetchingNextPage,
    isApiError: apiHistoryEnabled && (isError || isFetchNextPageError),
    fetchNextVisiblePage,
  };
}

/**
 * Rows (not headers) drive pagination: "View more" always expands by
 * ACTIVITY_EXPAND_STEP_ROWS transaction rows regardless of how many
 * pending/date headers sit in between.
 */
function countActivityRows(groupedItems: GroupedActivityListItem[]) {
  return groupedItems.filter((item) => item.type === 'item').length;
}

function useVisibleActivityRows(groupedItems: GroupedActivityListItem[]): {
  visibleItems: GroupedActivityListItem[];
  hasMore: boolean;
  visibleRowCount: number;
  handleShowMore: () => void;
} {
  const [visibleRowCount, setVisibleRowCount] = useState(
    DEFAULT_INITIAL_VISIBLE_ROWS,
  );

  const handleShowMore = useCallback(() => {
    setVisibleRowCount((prev) => prev + ACTIVITY_EXPAND_STEP_ROWS);
  }, []);

  const { visibleItems, hasMore } = useMemo(() => {
    const rowIndexes = groupedItems
      .map((item, index) => (item.type === 'item' ? index : -1))
      .filter((index) => index >= 0);
    const totalRowCount = rowIndexes.length;
    const hasHiddenRows = visibleRowCount < totalRowCount;
    const lastVisibleRowIndex = hasHiddenRows
      ? rowIndexes[visibleRowCount - 1]
      : -1;
    const visibleGroupedItems = hasHiddenRows
      ? groupedItems.slice(0, lastVisibleRowIndex + 1)
      : groupedItems;
    return { visibleItems: visibleGroupedItems, hasMore: hasHiddenRows };
  }, [groupedItems, visibleRowCount]);

  return { visibleItems, hasMore, visibleRowCount, handleShowMore };
}

export interface ActivityRowsProps {
  token: TokenDetailsRouteParams;
  renderItem: (info: {
    item: ActivityListItem;
    index: number;
    transaction?: TransactionWithImportTime;
    isApiItem?: boolean;
  }) => React.ReactNode;
  showSectionRule?: boolean;
  footer?: React.ReactNode;
  // For pre-grouped items (e.g., NonEvmActivityRows)
  groupedItems?: GroupedActivityListItem[];
  // For EVM with API integration (ActivitySection)
  transactions?: TransactionMeta[];
  submittedTxs?: TransactionMeta[];
  confirmedTxs?: TransactionMeta[];
  chainId?: Hex;
  caipAssetId?: CaipAssetType;
  selectedAddress?: string;
  assetSymbol?: string;
  isActivityLoading?: boolean;
}

const ActivityRows = ({
  token,
  transactions,
  submittedTxs,
  confirmedTxs,
  renderItem,
  showSectionRule,
  footer,
  chainId,
  caipAssetId,
  selectedAddress,
  assetSymbol,
  isActivityLoading,
  groupedItems: providedGroupedItems,
}: ActivityRowsProps): React.ReactElement | null => {
  // If groupedItems provided (NonEvmActivityRows), use simple rendering
  const isSimpleMode = Boolean(providedGroupedItems);

  const {
    groupedItems: activityGroupedItems,
    transactionByActivityItem,
    apiItemHashes,
    apiItemCount,
    hasNextApiPage,
    isApiLoading,
    isFetchingNextApiPage,
    isApiError,
    fetchNextVisiblePage,
  } = useGroupedTokenActivity({
    transactions: transactions ?? [],
    submittedTxs: submittedTxs ?? [],
    confirmedTxs: confirmedTxs ?? [],
    assetSymbol: assetSymbol ?? '',
    chainId,
    caipAssetId,
    selectedAddress,
  });

  // Use provided items for simple mode, or computed items for API mode
  const finalGroupedItems = isSimpleMode
    ? providedGroupedItems!
    : activityGroupedItems;

  const {
    visibleItems,
    hasMore: hasHiddenLoadedRows,
    visibleRowCount,
    handleShowMore: revealMoreLoadedRows,
  } = useVisibleActivityRows(finalGroupedItems);

  const handleShowMore = useCallback(() => {
    if (isSimpleMode) {
      revealMoreLoadedRows();
      return;
    }
    const nextVisibleRowCount = visibleRowCount + ACTIVITY_EXPAND_STEP_ROWS;
    const loadedRowCount = countActivityRows(finalGroupedItems);
    if (hasNextApiPage && loadedRowCount < nextVisibleRowCount) {
      Promise.resolve(
        fetchNextVisiblePage({
          minVisibleItems:
            apiItemCount + (nextVisibleRowCount - loadedRowCount),
        }),
      ).catch(() => undefined);
    }
    revealMoreLoadedRows();
  }, [
    isSimpleMode,
    finalGroupedItems,
    apiItemCount,
    fetchNextVisiblePage,
    hasNextApiPage,
    revealMoreLoadedRows,
    visibleRowCount,
  ]);

  const hasActivity = finalGroupedItems.length > 0;

  // Simple mode: show if has activity
  // API mode: keep section up while loading, on error, or if has/may have activity
  const showActivitySection = isSimpleMode
    ? hasActivity
    : isActivityLoading ||
      isApiLoading ||
      isApiError ||
      hasActivity ||
      hasNextApiPage;

  const isInitialApiLoad =
    !isSimpleMode && isApiLoading && !isFetchingNextApiPage;
  const hasMore = isSimpleMode
    ? hasHiddenLoadedRows
    : hasHiddenLoadedRows || (hasNextApiPage && !isInitialApiLoad);
  const isLoadingOlderPages =
    !isSimpleMode &&
    isFetchingNextApiPage &&
    hasNextApiPage &&
    !hasHiddenLoadedRows;

  if (!showActivitySection) {
    return null;
  }

  let paginationFooter: React.ReactNode = null;
  if (isLoadingOlderPages) {
    paginationFooter = (
      <Box
        alignItems={BoxAlignItems.Center}
        twClassName="pt-2 px-4"
        testID={TOKEN_DETAILS_ACTIVITY_LOADING_MORE_TEST_ID}
      >
        <ActivityIndicator size="small" />
      </Box>
    );
  } else if (hasMore) {
    paginationFooter = (
      <Box alignItems={BoxAlignItems.Center} twClassName="pt-2 px-4">
        <Button
          variant={ButtonVariant.Tertiary}
          onPress={handleShowMore}
          testID={TOKEN_DETAILS_ACTIVITY_SHOW_MORE_TEST_ID}
        >
          {strings('homepage.sections.view_more')}
        </Button>
      </Box>
    );
  }

  return (
    <Box
      testID={TOKEN_DETAILS_ACTIVITY_SECTION_TEST_ID}
      twClassName={
        showSectionRule ? 'mt-6 border-t border-muted pt-6' : undefined
      }
    >
      <ActivityHeader
        asset={{ ...token, hasBalanceError: token.hasBalanceError ?? false }}
      />
      {visibleItems.map((item, index) => (
        <React.Fragment key={getGroupedActivityListItemKey(item, index)}>
          {item.type === 'pending-header' ? (
            <ActivityListDateHeader label={strings('transaction.pending')} />
          ) : item.type === 'date-header' ? (
            <ActivityListDateHeader timestamp={item.date} />
          ) : (
            renderItem({
              item: item.item,
              index,
              transaction: isSimpleMode
                ? undefined
                : transactionByActivityItem.get(item.item),
              isApiItem:
                isSimpleMode || !item.item.hash
                  ? undefined
                  : apiItemHashes.has(item.item.hash.toLowerCase()),
            })
          )}
        </React.Fragment>
      ))}
      {paginationFooter}
      {footer}
    </Box>
  );
};

export default ActivityRows;
