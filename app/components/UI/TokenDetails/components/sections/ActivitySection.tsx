import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
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
import Routes from '../../../../../constants/navigation/Routes';
import type { RootState } from '../../../../../reducers';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { selectSelectedInternalAccount } from '../../../../../selectors/accountsController';
import { selectEvmNetworkConfigurationsByChainId } from '../../../../../selectors/networkController';
import { selectBridgeHistoryForAccount } from '../../../../../selectors/bridgeStatusController';
import {
  getGroupedActivityListItemKey,
  groupActivityListItems,
  type ActivityListItem,
  type GroupedActivityListItem,
} from '../../../../../util/activity-adapters';
import { mergeActivityItems } from '../../../../../util/activity-adapters/adapters/dedup';
import { areAddressesEqual } from '../../../../../util/address';
import ActivityListDateHeader from '../../../ActivityListItemRow/ActivityListDateHeader';
import { ActivityListItemRow } from '../../../ActivityListItemRow/ActivityListItemRow';
import AssetDetailsActivityListItem from '../../../Transactions/AssetDetailsActivityListItem';
import { getActivityDetailsRoute } from '../../../../Views/ActivityList/getActivityDetailsRoute';
import {
  mapTransactionToActivityItem,
  type TransactionWithImportTime,
} from '../../../Transactions/AssetDetailsActivityListItem.utils';
import { filterDuplicateOutgoingTransactions } from '../../../Transactions/utils';
import ActivityHeader from '../../../../Views/Asset/ActivityHeader';
import { useTokenTransactions } from '../../hooks/useTokenTransactions';
import { useTokenCaipAssetId } from '../../hooks/useTokenCaipAssetId';
import type { TokenDetailsRouteParams } from '../../constants/constants';
import { useTransactionsQuery } from '../../../../Views/ActivityList/useTransactionsQuery';

export const TOKEN_DETAILS_ACTIVITY_SECTION_TEST_ID =
  'token-details-overview-tab-activity';
export const TOKEN_DETAILS_ACTIVITY_SHOW_MORE_TEST_ID =
  'token-details-activity-show-more';

/** Transaction rows shown before the first "View more" press. */
export const DEFAULT_INITIAL_VISIBLE_ROWS = 3;

/** Additional transaction rows revealed by each "View more" press. */
export const ACTIVITY_EXPAND_STEP_ROWS = 5;

export interface ActivitySectionProps {
  token: TokenDetailsRouteParams;
  showSectionRule?: boolean;
}

interface UseGroupedTokenActivityParams {
  transactions: TransactionMeta[];
  submittedTxs: TransactionMeta[];
  confirmedTxs: TransactionMeta[];
  isNonEvmAsset: boolean;
  assetSymbol: string;
  chainId?: Hex;
  caipAssetId?: CaipAssetType;
  selectedAddress?: string;
}

interface GroupedTokenActivityResult {
  groupedItems: GroupedActivityListItem[];
  transactionByActivityItem: Map<ActivityListItem, TransactionWithImportTime>;
  apiItemCount: number;
  hasNextApiPage: boolean;
  isApiLoading: boolean;
  isApiError: boolean;
  fetchNextVisiblePage: (options?: {
    minVisibleItems?: number;
  }) => Promise<void | undefined>;
}

function isOtherAccountSimpleSend(
  transaction: TransactionMeta,
  selectedAddress?: string,
) {
  const from = transaction.txParams?.from;
  if (
    transaction.type !== TransactionType.simpleSend ||
    !from ||
    !selectedAddress
  ) {
    return false;
  }
  return !areAddressesEqual(from, selectedAddress);
}

/**
 * Normalizes and groups token transactions into pending/date sections for
 * the activity row list. Mirrors the adaptation pipeline in the legacy
 * `Transactions` component.
 */
function useGroupedTokenActivity({
  transactions,
  submittedTxs,
  confirmedTxs,
  isNonEvmAsset,
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
    if (isNonEvmAsset) {
      return {
        groupedItems: [],
        transactionByActivityItem: new Map<
          ActivityListItem,
          TransactionWithImportTime
        >(),
      };
    }

    const listTransactions =
      submittedTxs.length > 0
        ? [...submittedTxs].sort((a, b) => b.time - a.time).concat(confirmedTxs)
        : transactions;
    const filteredTransactions = filterDuplicateOutgoingTransactions(
      listTransactions,
    ).filter(
      (transaction) => !isOtherAccountSimpleSend(transaction, selectedAddress),
    );

    // Convert local transactions to ActivityListItems
    const localActivityItemsFromTxs = filteredTransactions.map((transaction) =>
      mapTransactionToActivityItem({
        transaction,
        assetSymbol: assetSymbol || 'ETH',
        currentChainId: chainId ?? ('0x1' as Hex),
        tokenChainId: chainId ?? ('0x1' as Hex),
      }),
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

    return { groupedItems, transactionByActivityItem };
  }, [
    isNonEvmAsset,
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
    isApiError: apiHistoryEnabled && (isError || isFetchNextPageError),
    fetchNextVisiblePage,
  };
}

/**
 * Rows (not headers) drive pagination: "View more" always expands by
 * ACTIVITY_EXPAND_STEP_ROWS transaction rows regardless of how many
 * pending/date headers sit in between. Trailing headers are only rendered
 * when at least one of their rows is visible.
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
    // Indexes of transaction rows (headers never count toward pagination).
    const rowIndexes = groupedItems
      .map((item, index) => (item.type === 'item' ? index : -1))
      .filter((index) => index >= 0);
    const totalRowCount = rowIndexes.length;
    const hasHiddenRows = visibleRowCount < totalRowCount;
    // Slice through the Nth visible row so a trailing header is only rendered
    // when at least one of its rows is visible (no orphaned headers).
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

const ActivitySection: React.FC<ActivitySectionProps> = ({
  token,
  showSectionRule = false,
}) => {
  const navigation = useNavigation<AppNavigationProp>();
  const chainId = token.chainId as Hex | undefined;
  const assetSymbol = token.symbol ?? '';

  const {
    transactions,
    submittedTxs,
    confirmedTxs,
    loading: isActivityLoading,
    isNonEvmAsset,
    selectedAddress,
  } = useTokenTransactions(token);

  const accountImportTime = useSelector(
    (state: RootState) =>
      selectSelectedInternalAccount(state)?.metadata.importTime,
  );
  const networkConfigurationsByChainId = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );
  const bridgeHistory = useSelector(selectBridgeHistoryForAccount);

  const caipAssetId = useTokenCaipAssetId(token);

  const {
    groupedItems: activityGroupedItems,
    transactionByActivityItem: activityItemToTransaction,
    apiItemCount,
    hasNextApiPage,
    isApiLoading,
    isApiError,
    fetchNextVisiblePage,
  } = useGroupedTokenActivity({
    transactions,
    submittedTxs,
    confirmedTxs,
    isNonEvmAsset,
    assetSymbol,
    chainId,
    caipAssetId: isNonEvmAsset ? undefined : (caipAssetId ?? undefined),
    selectedAddress,
  });

  const {
    visibleItems,
    hasMore: hasHiddenLoadedRows,
    visibleRowCount,
    handleShowMore: revealMoreLoadedRows,
  } = useVisibleActivityRows(activityGroupedItems);

  const handleShowMore = useCallback(() => {
    const nextVisibleRowCount = visibleRowCount + ACTIVITY_EXPAND_STEP_ROWS;
    const loadedRowCount = countActivityRows(activityGroupedItems);
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
    activityGroupedItems,
    apiItemCount,
    fetchNextVisiblePage,
    hasNextApiPage,
    revealMoreLoadedRows,
    visibleRowCount,
  ]);

  const hasActivity = activityGroupedItems.length > 0;
  // Receive-only accounts have no local txs. Keep the section up while the
  // API read is in flight, after it fails, or while older pages can still
  // hold this token.
  const showActivitySection =
    !isNonEvmAsset &&
    (isActivityLoading ||
      isApiLoading ||
      isApiError ||
      hasActivity ||
      hasNextApiPage);
  const hasMore = hasHiddenLoadedRows || (hasNextApiPage && !isApiLoading);

  if (!showActivitySection) {
    return null;
  }

  return (
    <>
      <Box
        testID={TOKEN_DETAILS_ACTIVITY_SECTION_TEST_ID}
        twClassName={
          showSectionRule ? 'mt-6 border-t border-muted pt-6' : undefined
        }
      >
        <ActivityHeader
          asset={{
            ...token,
            hasBalanceError: token.hasBalanceError ?? false,
          }}
        />
        {visibleItems.map((item, index) => {
          if (item.type === 'pending-header') {
            return (
              <ActivityListDateHeader
                key="pending-header"
                label={strings('transaction.pending')}
              />
            );
          }
          if (item.type === 'date-header') {
            return (
              <ActivityListDateHeader
                key={`date-header-${item.date}`}
                timestamp={item.date}
              />
            );
          }
          const transaction = activityItemToTransaction.get(item.item);
          if (transaction) {
            return (
              <AssetDetailsActivityListItem
                key={getGroupedActivityListItemKey(item, index)}
                transaction={transaction}
                index={index}
                assetSymbol={assetSymbol}
                chainId={chainId}
                tokenChainId={chainId}
                navigation={navigation}
                accountImportTime={accountImportTime}
                networkConfigurations={networkConfigurationsByChainId}
                bridgeHistory={bridgeHistory}
              />
            );
          }
          return (
            <ActivityListItemRow
              key={getGroupedActivityListItemKey(item, index)}
              item={item.item}
              index={index}
              onPress={(pressedItem) => {
                const detailsRoute = getActivityDetailsRoute(pressedItem);
                if (detailsRoute) {
                  navigation.navigate(Routes.ACTIVITY_DETAILS, detailsRoute);
                }
              }}
            />
          );
        })}

        {hasMore ? (
          <Box alignItems={BoxAlignItems.Center} twClassName="pt-2 px-4">
            <Button
              variant={ButtonVariant.Tertiary}
              onPress={handleShowMore}
              testID={TOKEN_DETAILS_ACTIVITY_SHOW_MORE_TEST_ID}
            >
              {strings('homepage.sections.view_more')}
            </Button>
          </Box>
        ) : null}
      </Box>
    </>
  );
};

ActivitySection.displayName = 'ActivitySection';

export default memo(ActivitySection);
