import React, { useMemo } from 'react';
import {
  View,
  RefreshControl,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import { CaipChainId, Transaction } from '@metamask/keyring-api';
import type { TransactionMeta } from '@metamask/transaction-controller';
import { useTheme } from '../../../util/theme';
import { strings } from '../../../../locales/i18n';
import { baseStyles } from '../../../styles/common';
import { getAddressUrl } from '../../../core/Multichain/utils';
import { getBlockExplorerName } from '../../../util/networks';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { trackBlockExplorerLinkClicked } from '../../../util/analytics/externalLinkTracking';
import { selectNonEvmTransactions } from '../../../selectors/multichain/multichain';
import { selectSelectedInternalAccountFormattedAddress } from '../../../selectors/accountsController';
import MultichainTransactionListItem from '../../UI/MultichainTransactionListItem';
import styles from './MultichainTransactionsView.styles';
import { useBridgeHistoryItemBySrcTxHash } from '../../UI/Bridge/hooks/useBridgeHistoryItemBySrcTxHash';
import MultichainTransactionsFooter from './MultichainTransactionsFooter';
import PriceChartContext, {
  PriceChartProvider,
} from '../../UI/AssetOverview/PriceChart/PriceChart.context';
import MultichainBridgeTransactionListItem from '../../../components/UI/MultichainBridgeTransactionListItem';
import { KnownCaipNamespace, parseCaipChainId } from '@metamask/utils';
import { SupportedCaipChainId } from '@metamask/multichain-network-controller';
import { TabEmptyState } from '../../../component-library/components-temp/TabEmptyState';
import { TransactionDetailLocation } from '../../../core/Analytics/events/transactions';
import { useMultichainActivityMaliciousTokenKeys } from '../../hooks/useMultichainActivityMaliciousTokenKeys/useMultichainActivityMaliciousTokenKeys';
import { filterMultichainTransactionsExcludingMaliciousTokenActivity } from '../../../util/multichain/multichainTransactionTokenScan';
import {
  selectIsActivityRedesignEnabled,
  selectIsTransactionsRedesignEnabled,
} from '../../../selectors/featureFlagController/activityRedesign';
import { mapKeyringTransaction } from '@metamask/client-utils';
import {
  enrichKeyringActivityWithBridge,
  getGroupedActivityListItemKey,
  groupActivityListItems,
  type ActivityListItem,
  type GroupedActivityListItem,
} from '../../../util/activity-adapters';
import ActivityListDateHeader from '../../UI/ActivityListItemRow/ActivityListDateHeader';
import { ActivityListItemRow } from '../../UI/ActivityListItemRow/ActivityListItemRow';
import { Box } from '@metamask/design-system-react-native';
import { selectBridgeHistoryForAccount } from '../../../selectors/bridgeStatusController';
import { findBridgeHistoryItem } from '../../../util/bridge/findBridgeHistoryItem';
import { handleUnifiedSwapsTxHistoryItemClick } from '../../UI/Bridge/utils/transaction-history';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): shared activity-details routing; route-isolation backlog
import { getActivityDetailsRoute } from '../ActivityList/getActivityDetailsRoute';
import Routes from '../../../constants/navigation/Routes';
import { mapTransactionToActivityItem } from '../../UI/Transactions/AssetDetailsActivityListItem.utils';
import MultichainAssetDetailsActivityListItem from './MultichainAssetDetailsActivityListItem';

interface MultichainTransactionsViewProps {
  /**
   * Override transactions instead of using selector
   */
  transactions?: Transaction[];
  /**
   * Optional header component
   */
  header?: React.ReactElement;
  /**
   * Override navigation instance
   */
  navigation?: AppNavigationProp;
  /**
   * Override selected address
   */
  selectedAddress?: string;
  /**
   * Chain ID for block explorer links
   */
  chainId: SupportedCaipChainId;
  /**
   * Enable refresh functionality
   */
  enableRefresh?: boolean;
  /**
   * Custom empty message
   */
  emptyMessage?: string;
  /**
   * Show disclaimer footer
   */
  showDisclaimer?: boolean;
  /**
   * Scroll event handler
   */
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  /**
   * Location context for analytics tracking (home or asset_details)
   */
  location?: TransactionDetailLocation;
  /**
   * EVM bridge transactions
   */
  bridgeArrivalTransactions?: TransactionMeta[];
}

export const getMultichainTransactionItemType = (
  item: Pick<Transaction, 'id' | 'type'> | GroupedActivityListItem,
  shouldUseActivityRedesign: boolean,
  bridgeHistoryItemsBySrcTxHash: Readonly<Record<string, unknown>>,
) => {
  if (shouldUseActivityRedesign) {
    if (item.type === 'pending-header' || item.type === 'date-header') {
      return item.type;
    }

    const transaction =
      'item' in item && item.item.raw?.type === 'keyringTransaction'
        ? item.item.raw.data
        : undefined;

    return transaction && bridgeHistoryItemsBySrcTxHash[transaction.id]
      ? 'bridge-activity'
      : 'activity-item';
  }

  if (!('id' in item)) {
    return item.type;
  }

  return bridgeHistoryItemsBySrcTxHash[item.id]
    ? 'bridge-transaction'
    : 'transaction';
};

const MultichainTransactionsView = ({
  transactions,
  header,
  navigation,
  selectedAddress,
  chainId,
  enableRefresh = false,
  emptyMessage,
  showDisclaimer = false,
  onScroll,
  location,
  bridgeArrivalTransactions,
}: MultichainTransactionsViewProps) => {
  const { colors } = useTheme();
  const style = styles();
  const defaultNavigation = useNavigation<AppNavigationProp>();
  const nav = navigation ?? defaultNavigation;
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { namespace } = parseCaipChainId(chainId as CaipChainId);
  const isBitcoinNetwork = namespace === KnownCaipNamespace.Bip122;

  const defaultSelectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const address = selectedAddress ?? defaultSelectedAddress;

  const nonEvmTransactions = useSelector(selectNonEvmTransactions);

  const txList = useMemo(
    () => transactions ?? nonEvmTransactions?.transactions,
    [transactions, nonEvmTransactions],
  );

  const { maliciousTokenKeys } = useMultichainActivityMaliciousTokenKeys(
    txList ?? [],
  );

  const visibleMultichainTransactions = useMemo(
    () =>
      filterMultichainTransactionsExcludingMaliciousTokenActivity(
        txList ?? [],
        maliciousTokenKeys,
      ),
    [txList, maliciousTokenKeys],
  );

  const { bridgeHistoryItemsBySrcTxHash, bridgeHistoryItemsByDestTxHash } =
    useBridgeHistoryItemBySrcTxHash();
  const bridgeHistory = useSelector(selectBridgeHistoryForAccount);
  const isTransactionsRedesignEnabled = useSelector(
    selectIsTransactionsRedesignEnabled,
  );
  const isActivityRedesignEnabled = useSelector(
    selectIsActivityRedesignEnabled,
  );
  const shouldUseActivityRedesign =
    isActivityRedesignEnabled &&
    location === TransactionDetailLocation.AssetDetails;
  const { bridgeArrivalItems, arrivalDestTxHashes } = useMemo(() => {
    const items: ActivityListItem[] = [];
    const destTxHashes = new Set<string>();

    for (const tx of bridgeArrivalTransactions ?? []) {
      const bridgeHistoryItem = findBridgeHistoryItem({
        bridgeHistory,
        transactionMetaId: tx.id,
        // eslint-disable-next-line @typescript-eslint/no-deprecated -- Older persisted bridge history can still be keyed by actionId.
        transactionActionId: tx.actionId,
        transactionHash: tx.hash,
      });

      const destTxHash = bridgeHistoryItem?.status?.destChain?.txHash;
      if (destTxHash) {
        destTxHashes.add(destTxHash.toLowerCase());
      }

      items.push(
        mapTransactionToActivityItem({
          transaction: tx,
          currentChainId: tx.chainId,
          bridgeHistoryItem,
        }),
      );
    }

    return { bridgeArrivalItems: items, arrivalDestTxHashes: destTxHashes };
  }, [bridgeArrivalTransactions, bridgeHistory]);

  const activityListData = useMemo(
    () =>
      shouldUseActivityRedesign
        ? groupActivityListItems([
            ...bridgeArrivalItems,
            ...visibleMultichainTransactions
              .filter(
                (transaction) =>
                  !arrivalDestTxHashes.has(transaction.id?.toLowerCase()),
              )
              .map((transaction) => {
                const keyringTx = {
                  ...transaction,
                  chain: transaction.chain ?? chainId,
                  fees: transaction.fees ?? [],
                };
                const activity = {
                  ...mapKeyringTransaction({
                    transaction: keyringTx,
                    subjectAddress: address,
                  }),
                  raw: {
                    type: 'keyringTransaction' as const,
                    data: keyringTx,
                  },
                } as ActivityListItem;
                return enrichKeyringActivityWithBridge(
                  activity,
                  bridgeHistoryItemsBySrcTxHash[transaction.id] ??
                    bridgeHistoryItemsByDestTxHash[transaction.id],
                  address,
                );
              }),
          ])
        : visibleMultichainTransactions,
    [
      address,
      arrivalDestTxHashes,
      bridgeArrivalItems,
      bridgeHistoryItemsByDestTxHash,
      bridgeHistoryItemsBySrcTxHash,
      chainId,
      shouldUseActivityRedesign,
      visibleMultichainTransactions,
    ],
  );

  const handleBridgeArrivalPress = React.useCallback(
    (item: ActivityListItem) => {
      if (isTransactionsRedesignEnabled) {
        const detailsRoute = getActivityDetailsRoute(item);
        if (detailsRoute) {
          nav.navigate(Routes.ACTIVITY_DETAILS, detailsRoute);
          return;
        }
      }

      const evmTxMeta =
        item.raw?.type === 'localTransaction'
          ? item.raw.data.primaryTransaction
          : undefined;

      if (!evmTxMeta) {
        return;
      }

      handleUnifiedSwapsTxHistoryItemClick({
        navigation: nav,
        evmTxMeta,
        bridgeTxHistoryItem: findBridgeHistoryItem({
          bridgeHistory,
          transactionMetaId: evmTxMeta.id,
          // eslint-disable-next-line @typescript-eslint/no-deprecated -- Older persisted bridge history can still be keyed by actionId.
          transactionActionId: evmTxMeta.actionId,
          transactionHash: evmTxMeta.hash,
        }),
      });
    },
    [bridgeHistory, isTransactionsRedesignEnabled, nav],
  );

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(async () => {
    if (!enableRefresh) return;
    setRefreshing(true);
    setRefreshing(false);
  }, [enableRefresh]);

  const renderEmptyList = () => (
    <View style={style.emptyContainer}>
      <TabEmptyState
        description={emptyMessage ?? strings('wallet.no_transactions')}
      />
    </View>
  );

  const url = getAddressUrl(address ?? '', chainId as CaipChainId);

  const footer = (
    <MultichainTransactionsFooter
      url={url}
      hasTransactions={(visibleMultichainTransactions?.length ?? 0) > 0}
      showDisclaimer={showDisclaimer}
      showExplorerLink={!isBitcoinNetwork}
      onViewMore={() => {
        if (!url) {
          return;
        }
        trackBlockExplorerLinkClicked(trackEvent, createEventBuilder, {
          location: 'multichain_activity_tab',
          text: `${strings('transactions.view_full_history_on')} ${getBlockExplorerName(url)}`,
          url,
        });
        nav.navigate('Webview', {
          screen: 'SimpleWebview',
          params: { url },
        });
      }}
    />
  );

  const renderTransactionItem = ({
    item,
    index,
  }: {
    item: Transaction;
    index: number;
  }) => {
    const srcTxHash = item.id;
    const bridgeHistoryItem = bridgeHistoryItemsBySrcTxHash[srcTxHash];

    if (shouldUseActivityRedesign) {
      return (
        <MultichainAssetDetailsActivityListItem
          transaction={item}
          bridgeHistoryItem={
            bridgeHistoryItem ?? bridgeHistoryItemsByDestTxHash[srcTxHash]
          }
          navigation={nav}
          index={index}
          chainId={chainId}
          location={location}
          subjectAddress={address}
        />
      );
    }

    if (bridgeHistoryItem) {
      return (
        <MultichainBridgeTransactionListItem
          transaction={item}
          bridgeHistoryItem={bridgeHistoryItem}
          navigation={nav}
          index={index}
          location={location}
        />
      );
    }

    return (
      <MultichainTransactionListItem
        transaction={item}
        navigation={nav}
        index={index}
        chainId={chainId}
        location={location}
      />
    );
  };

  const renderGroupedActivityItem = ({
    item,
    index,
  }: {
    item: GroupedActivityListItem;
    index: number;
  }) => {
    if (item.type === 'pending-header') {
      return <ActivityListDateHeader label={strings('transaction.pending')} />;
    }

    if (item.type === 'date-header') {
      return <ActivityListDateHeader timestamp={item.date} />;
    }

    if (item.item.raw?.type === 'localTransaction') {
      return (
        <Box twClassName="px-4">
          <ActivityListItemRow
            item={item.item}
            index={index}
            onPress={handleBridgeArrivalPress}
          />
        </Box>
      );
    }

    const transaction =
      item.item.raw?.type === 'keyringTransaction'
        ? item.item.raw.data
        : undefined;

    if (!transaction) {
      return null;
    }

    return renderTransactionItem({ item: transaction, index });
  };

  const renderListItem = ({
    item,
    index,
  }: {
    item: Transaction | GroupedActivityListItem;
    index: number;
  }) =>
    shouldUseActivityRedesign
      ? renderGroupedActivityItem({
          item: item as GroupedActivityListItem,
          index,
        })
      : renderTransactionItem({ item: item as Transaction, index });

  const keyExtractor = (
    item: Transaction | GroupedActivityListItem,
    index: number,
  ) => {
    if ('type' in item && item.type === 'pending-header') {
      return 'pending-header';
    }

    if ('type' in item && item.type === 'date-header') {
      return `date-header-${item.date}`;
    }

    if ('type' in item && item.type === 'item') {
      return getGroupedActivityListItemKey(item, index);
    }

    return item.id;
  };

  return (
    <PriceChartProvider>
      <View style={style.wrapper}>
        <PriceChartContext.Consumer>
          {({ isChartBeingTouched }) => (
            <FlashList
              data={activityListData}
              renderItem={renderListItem}
              keyExtractor={keyExtractor}
              getItemType={(item) =>
                getMultichainTransactionItemType(
                  item,
                  shouldUseActivityRedesign,
                  bridgeHistoryItemsBySrcTxHash,
                )
              }
              ListHeaderComponent={header}
              ListEmptyComponent={renderEmptyList}
              ListFooterComponent={footer}
              style={baseStyles.flexGrow}
              contentContainerStyle={style.listContentContainer}
              refreshControl={
                enableRefresh ? (
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    colors={[colors.primary.default]}
                    tintColor={colors.icon.default}
                  />
                ) : undefined
              }
              onScroll={onScroll}
              scrollEnabled={!isChartBeingTouched}
              showsVerticalScrollIndicator={false}
            />
          )}
        </PriceChartContext.Consumer>
      </View>
    </PriceChartProvider>
  );
};

export default MultichainTransactionsView;
