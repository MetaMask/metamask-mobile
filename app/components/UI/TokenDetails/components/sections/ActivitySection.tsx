import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  BoxAlignItems,
  Button,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { type CaipAssetType, type Hex } from '@metamask/utils';
import type { TransactionMeta } from '@metamask/transaction-controller';
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
}

interface GroupedTokenActivityResult {
  groupedItems: GroupedActivityListItem[];
  transactionByActivityItem: Map<ActivityListItem, TransactionWithImportTime>;
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
}: UseGroupedTokenActivityParams): GroupedTokenActivityResult {
  const {
    data: apiEvmTransactions,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useTransactionsQuery(caipAssetId ? { assetId: caipAssetId } : undefined);

  const tokenApiItems = useMemo(
    () =>
      caipAssetId
        ? (apiEvmTransactions?.pages.flatMap((page) => page.data) ?? [])
        : [],
    [apiEvmTransactions, caipAssetId],
  );

  useEffect(() => {
    if (
      caipAssetId &&
      tokenApiItems.length < DEFAULT_INITIAL_VISIBLE_ROWS &&
      hasNextPage &&
      !isFetchingNextPage &&
      (apiEvmTransactions?.pages.length ?? 0) < 5
    ) {
      fetchNextPage();
    }
  }, [
    caipAssetId,
    tokenApiItems.length,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    apiEvmTransactions?.pages.length,
  ]);

  return useMemo(() => {
    if (isNonEvmAsset) {
      return {
        groupedItems: [],
        transactionByActivityItem: new Map(),
      };
    }

    const listTransactions =
      submittedTxs.length > 0
        ? [...submittedTxs].sort((a, b) => b.time - a.time).concat(confirmedTxs)
        : transactions;
    const filteredTransactions =
      filterDuplicateOutgoingTransactions(listTransactions);

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
  ]);
}

/**
 * Rows (not headers) drive pagination: "View more" always expands by
 * ACTIVITY_EXPAND_STEP_ROWS transaction rows regardless of how many
 * pending/date headers sit in between. Trailing headers are only rendered
 * when at least one of their rows is visible.
 */
function useVisibleActivityRows(groupedItems: GroupedActivityListItem[]): {
  visibleItems: GroupedActivityListItem[];
  hasMore: boolean;
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

  return { visibleItems, hasMore, handleShowMore };
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
  } = useGroupedTokenActivity({
    transactions,
    submittedTxs,
    confirmedTxs,
    isNonEvmAsset,
    assetSymbol,
    chainId,
    caipAssetId: isNonEvmAsset ? undefined : (caipAssetId ?? undefined),
  });

  const { visibleItems, hasMore, handleShowMore } =
    useVisibleActivityRows(activityGroupedItems);

  const hasActivity = activityGroupedItems.length > 0;
  // Same header gate as the legacy Token Details view: the activity section
  // shows while transactions are still loading or once any are listed.
  const showActivitySection =
    !isNonEvmAsset && (isActivityLoading || hasActivity);

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
