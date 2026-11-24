import React, { memo, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import type { SupportedCaipChainId } from '@metamask/multichain-network-controller';
import NonEvmActivityRows from './NonEvmActivityRows';
import ActivityRows from './ActivityRows';
import type { Hex } from '@metamask/utils';
import type { TransactionMeta } from '@metamask/transaction-controller';
import type { RootState } from '../../../../../reducers';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { selectSelectedInternalAccount } from '../../../../../selectors/accountsController';
import { selectEvmNetworkConfigurationsByChainId } from '../../../../../selectors/networkController';
import { selectBridgeHistoryForAccount } from '../../../../../selectors/bridgeStatusController';
import {
  groupActivityListItems,
  type ActivityListItem,
  type GroupedActivityListItem,
} from '../../../../../util/activity-adapters';
import AssetDetailsActivityListItem from '../../../Transactions/AssetDetailsActivityListItem';
import {
  mapTransactionToActivityItem,
  type TransactionWithImportTime,
} from '../../../Transactions/AssetDetailsActivityListItem.utils';
import { filterDuplicateOutgoingTransactions } from '../../../Transactions/utils';
import { useTokenTransactions } from '../../hooks/useTokenTransactions';
import type { TokenDetailsRouteParams } from '../../constants/constants';

export {
  TOKEN_DETAILS_ACTIVITY_SECTION_TEST_ID,
  TOKEN_DETAILS_ACTIVITY_SHOW_MORE_TEST_ID,
  DEFAULT_INITIAL_VISIBLE_ROWS,
  ACTIVITY_EXPAND_STEP_ROWS,
} from './ActivityRows';

export interface ActivitySectionProps {
  token: TokenDetailsRouteParams;
  showSectionRule?: boolean;
  includeNonEvm?: boolean;
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

const ActivitySection: React.FC<ActivitySectionProps> = ({
  token,
  showSectionRule = false,
  includeNonEvm = false,
}) => {
  const navigation = useNavigation<AppNavigationProp>();
  const chainId = token.chainId as Hex | undefined;
  const assetSymbol = token.symbol ?? '';

  const {
    transactions,
    submittedTxs,
    confirmedTxs,
    loading: isActivityLoading,
    bridgeArrivalTxs,
    selectedAddress,
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

  if (isNonEvmAsset) {
    return includeNonEvm ? (
      <NonEvmActivityRows
        token={token}
        transactions={transactions}
        address={selectedAddress}
        chainId={token.chainId as SupportedCaipChainId}
        bridgeArrivals={bridgeArrivalTxs}
        navigation={navigation}
        showSectionRule={showSectionRule}
      />
    ) : null;
  }

  if (!isActivityLoading && activityGroupedItems.length === 0) {
    return null;
  }

  return (
    <ActivityRows
      token={token}
      groupedItems={activityGroupedItems}
      showSectionRule={showSectionRule}
      renderItem={({ item, index }) => {
        const transaction = activityItemToTransaction.get(item);
        if (!transaction) {
          return null;
        }
        return (
          <AssetDetailsActivityListItem
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
      }}
    />
  );
};

ActivitySection.displayName = 'ActivitySection';

export default memo(ActivitySection);
