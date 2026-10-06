import React, { memo, useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  BoxAlignItems,
  Button,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import type { Hex } from '@metamask/utils';
import type { TransactionMeta } from '@metamask/transaction-controller';
import { strings } from '../../../../../../locales/i18n';
import type { RootState } from '../../../../../reducers';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { selectSelectedInternalAccount } from '../../../../../selectors/accountsController';
import { selectEvmNetworkConfigurationsByChainId } from '../../../../../selectors/networkController';
import { selectBridgeHistoryForAccount } from '../../../../../selectors/bridgeStatusController';
import { selectAllTokens } from '../../../../../selectors/tokensController';
import { selectSelectedAccountGroupEvmInternalAccount } from '../../../../../selectors/multichainAccounts/accountTreeController';
import {
  getGroupedActivityListItemKey,
  groupActivityListItems,
  type ActivityListItem,
  type GroupedActivityListItem,
} from '../../../../../util/activity-adapters';
import ActivityListDateHeader from '../../../ActivityListItemRow/ActivityListDateHeader';
import AssetDetailsActivityListItem from '../../../Transactions/AssetDetailsActivityListItem';
import {
  mapTransactionToActivityItem,
  type TransactionWithImportTime,
} from '../../../Transactions/AssetDetailsActivityListItem.utils';
import { filterDuplicateOutgoingTransactions } from '../../../Transactions/utils';
import ActivityHeader from '../../../../Views/Asset/ActivityHeader';
import { useUnifiedTxActions } from '../../../../Views/ActivityList/useUnifiedTxActions';
import { CancelSpeedupModal } from '../../../../Views/confirmations/components/modals/cancel-speedup-modal';
import { useTokenTransactions } from '../../hooks/useTokenTransactions';
import type { TokenDetailsRouteParams } from '../../constants/constants';

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
}

interface UseGroupedTokenActivityParams {
  transactions: TransactionMeta[];
  submittedTxs: TransactionMeta[];
  confirmedTxs: TransactionMeta[];
  isNonEvmAsset: boolean;
  assetSymbol: string;
  chainId?: Hex;
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
}: UseGroupedTokenActivityParams): GroupedTokenActivityResult {
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

    const transactionByActivityItem = new Map<
      ActivityListItem,
      TransactionWithImportTime
    >();
    const groupedItems = groupActivityListItems(
      filteredTransactions.map((transaction) => {
        const activityItem = mapTransactionToActivityItem({
          transaction,
          assetSymbol: assetSymbol || 'ETH',
          currentChainId: chainId ?? ('0x1' as Hex),
          tokenChainId: chainId ?? ('0x1' as Hex),
        });
        transactionByActivityItem.set(activityItem, transaction);
        return activityItem;
      }),
    );

    return { groupedItems, transactionByActivityItem };
  }, [
    isNonEvmAsset,
    submittedTxs,
    confirmedTxs,
    transactions,
    assetSymbol,
    chainId,
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

const ActivitySection: React.FC<ActivitySectionProps> = ({ token }) => {
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

  const {
    speedUpIsOpen,
    cancelIsOpen,
    confirmDisabled,
    existingTx,
    onSpeedUpAction,
    onCancelAction,
    onSpeedUpCancelCompleted,
    speedUpTransaction,
    cancelTransaction,
  } = useUnifiedTxActions();

  const accountImportTime = useSelector(
    (state: RootState) =>
      selectSelectedInternalAccount(state)?.metadata.importTime,
  );
  const groupEvmAccountAddress = useSelector(
    (state: RootState) =>
      selectSelectedAccountGroupEvmInternalAccount(state)?.address,
  );
  const networkConfigurationsByChainId = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );
  const allTokens = useSelector(selectAllTokens);
  const bridgeHistory = useSelector(selectBridgeHistoryForAccount);

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
  });

  const [visibleRowCount, setVisibleRowCount] = useState(
    DEFAULT_INITIAL_VISIBLE_ROWS,
  );
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
      <Box testID={TOKEN_DETAILS_ACTIVITY_SECTION_TEST_ID}>
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
          if (!transaction) {
            return null;
          }
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
              groupEvmAccountAddress={groupEvmAccountAddress}
              networkConfigurations={networkConfigurationsByChainId}
              allTokens={allTokens}
              bridgeHistory={bridgeHistory}
              onSpeedUpAction={onSpeedUpAction}
              onCancelAction={onCancelAction}
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

      {existingTx ? (
        <CancelSpeedupModal
          isVisible={speedUpIsOpen || cancelIsOpen}
          isCancel={cancelIsOpen}
          tx={existingTx}
          onConfirm={cancelIsOpen ? cancelTransaction : speedUpTransaction}
          onClose={onSpeedUpCancelCompleted}
          confirmDisabled={confirmDisabled}
        />
      ) : null}
    </>
  );
};

ActivitySection.displayName = 'ActivitySection';

export default memo(ActivitySection);
