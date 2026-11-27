import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { Transaction } from '@metamask/keyring-api';
import type { TransactionMeta } from '@metamask/transaction-controller';
import type { SupportedCaipChainId } from '@metamask/multichain-network-controller';
import { KnownCaipNamespace, parseCaipChainId } from '@metamask/utils';
import { Box } from '@metamask/design-system-react-native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import { TransactionDetailLocation } from '../../../../../core/Analytics/events/transactions';
import { getAddressUrl } from '../../../../../core/Multichain/utils';
import { getBlockExplorerName } from '../../../../../util/networks';
import { trackBlockExplorerLinkClicked } from '../../../../../util/analytics/externalLinkTracking';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { strings } from '../../../../../../locales/i18n';
import { useMultichainActivityMaliciousTokenKeys } from '../../../../hooks/useMultichainActivityMaliciousTokenKeys/useMultichainActivityMaliciousTokenKeys';
import { filterMultichainTransactionsExcludingMaliciousTokenActivity } from '../../../../../util/multichain/multichainTransactionTokenScan';
import {
  groupActivityListItems,
  type ActivityListItem,
} from '../../../../../util/activity-adapters';
import { selectBridgeHistoryForAccount } from '../../../../../selectors/bridgeStatusController';
import { findBridgeHistoryItem } from '../../../../../util/bridge/findBridgeHistoryItem';
import { useBridgeHistoryItemBySrcTxHash } from '../../../Bridge/hooks/useBridgeHistoryItemBySrcTxHash';
import { handleUnifiedSwapsTxHistoryItemClick } from '../../../Bridge/utils/transaction-history';
import { mapNonEvmTransactions } from '../../../../Views/ActivityList/helpers/transformations';
import { getActivityDetailsRoute } from '../../../../Views/ActivityList/getActivityDetailsRoute';
import MultichainAssetDetailsActivityListItem from '../../../../Views/MultichainTransactionsView/MultichainAssetDetailsActivityListItem';
import MultichainTransactionsFooter from '../../../../Views/MultichainTransactionsView/MultichainTransactionsFooter';
import { ActivityListItemRow } from '../../../ActivityListItemRow/ActivityListItemRow';
import { mapTransactionToActivityItem } from '../../../Transactions/AssetDetailsActivityListItem.utils';
import type { TokenDetailsRouteParams } from '../../constants/constants';
import ActivityRows, { type ActivityRowsProps } from './ActivityRows';

interface NonEvmActivityRowsProps {
  token: TokenDetailsRouteParams;
  chainId: SupportedCaipChainId;
  transactions: Transaction[];
  bridgeArrivals: TransactionMeta[];
  address: string;
  navigation: AppNavigationProp;
  showSectionRule: boolean;
}

const NonEvmActivityRows = ({
  token,
  chainId,
  transactions,
  bridgeArrivals,
  address,
  navigation,
  showSectionRule,
}: NonEvmActivityRowsProps): React.ReactElement | null => {
  const analytics = useAnalytics();
  const { maliciousTokenKeys } =
    useMultichainActivityMaliciousTokenKeys(transactions);
  const bridgeHistory = useSelector(selectBridgeHistoryForAccount);
  const { bridgeHistoryItemsBySrcTxHash, bridgeHistoryItemsByDestTxHash } =
    useBridgeHistoryItemBySrcTxHash();
  const { items, sourceByItem, arrivalByItem, hasTransactions } =
    useMemo(() => {
      const arrivalByItem = new Map<
        ActivityListItem,
        {
          transaction: TransactionMeta;
          history: ReturnType<typeof findBridgeHistoryItem>;
        }
      >();
      const replacedHashes = new Set<string>();
      const arrivals = bridgeArrivals.map((transaction) => {
        const history = findBridgeHistoryItem({
          bridgeHistory,
          transactionMetaId: transaction.id,
          transactionActionId: (transaction as { actionId?: string }).actionId,
          transactionHash: transaction.hash,
        });
        const destHash = history?.status?.destChain?.txHash;
        if (destHash) replacedHashes.add(destHash.toLowerCase());
        const item = mapTransactionToActivityItem({
          transaction,
          currentChainId: transaction.chainId,
          bridgeHistoryItem: history,
        });
        arrivalByItem.set(item, { transaction, history });
        return item;
      });
      const visible =
        filterMultichainTransactionsExcludingMaliciousTokenActivity(
          transactions,
          maliciousTokenKeys,
        );
      const filtered = visible.filter(
        ({ id }) => !replacedHashes.has(id?.toLowerCase()),
      );
      const activity = mapNonEvmTransactions(
        filtered.map((transaction) =>
          transaction.chain ? transaction : { ...transaction, chain: chainId },
        ),
        (id) =>
          bridgeHistoryItemsBySrcTxHash[id] ??
          bridgeHistoryItemsByDestTxHash[id],
        () => address,
      );
      const sourceByItem = new Map(
        activity.map((item, index) => [item, filtered[index]]),
      );
      return {
        items: groupActivityListItems([...arrivals, ...activity]),
        sourceByItem,
        arrivalByItem,
        hasTransactions: visible.length > 0,
      };
    }, [
      address,
      bridgeArrivals,
      bridgeHistory,
      bridgeHistoryItemsByDestTxHash,
      bridgeHistoryItemsBySrcTxHash,
      chainId,
      maliciousTokenKeys,
      transactions,
    ]);

  const renderItem: ActivityRowsProps['renderItem'] = ({ item, index }) => {
    const arrival = arrivalByItem.get(item);
    if (arrival) {
      return (
        <Box twClassName="px-4">
          <ActivityListItemRow
            item={item}
            index={index}
            onPress={() => {
              const route = getActivityDetailsRoute(item);
              if (route) {
                navigation.navigate(Routes.ACTIVITY_DETAILS, route);
                return;
              }
              handleUnifiedSwapsTxHistoryItemClick({
                navigation,
                evmTxMeta: arrival.transaction,
                bridgeTxHistoryItem: arrival.history,
              });
            }}
          />
        </Box>
      );
    }
    const transaction = sourceByItem.get(item);
    const id = transaction?.id;
    return (
      <MultichainAssetDetailsActivityListItem
        item={item}
        transaction={transaction}
        chainId={chainId}
        bridgeHistoryItem={
          id
            ? (bridgeHistoryItemsBySrcTxHash[id] ??
              bridgeHistoryItemsByDestTxHash[id])
            : undefined
        }
        navigation={navigation}
        index={index}
        location={TransactionDetailLocation.AssetDetails}
      />
    );
  };

  if (items.length === 0) return null;

  const url = getAddressUrl(address, chainId);
  return (
    <ActivityRows
      token={token}
      groupedItems={items}
      renderItem={renderItem}
      showSectionRule={showSectionRule}
      footer={
        <MultichainTransactionsFooter
          url={url}
          hasTransactions={hasTransactions}
          showDisclaimer
          showExplorerLink={
            parseCaipChainId(chainId).namespace !== KnownCaipNamespace.Bip122
          }
          onViewMore={() => {
            if (!url) return;
            trackBlockExplorerLinkClicked<
              Parameters<typeof analytics.trackEvent>[0]
            >(
              (event) => analytics.trackEvent(event),
              (event) => analytics.createEventBuilder(event),
              {
                location: 'multichain_activity_tab',
                text: `${strings('transactions.view_full_history_on')} ${getBlockExplorerName(url)}`,
                url,
              },
            );
            navigation.navigate('Webview', {
              screen: 'SimpleWebview',
              params: { url },
            });
          }}
        />
      }
    />
  );
};

export default NonEvmActivityRows;
