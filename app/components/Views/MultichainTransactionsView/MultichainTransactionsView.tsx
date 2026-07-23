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
import { selectIsActivityRedesignEnabled } from '../../../selectors/featureFlagController/activityRedesign';
import {
  getGroupedActivityListItemKey,
  groupActivityListItems,
  type GroupedActivityListItem,
} from '../../../util/activity-adapters';
import ActivityListDateHeader from '../../UI/ActivityListItemRow/ActivityListDateHeader';
import MultichainAssetDetailsActivityListItem from './MultichainAssetDetailsActivityListItem';
import { mapMultichainTransactionToActivityItem } from './MultichainAssetDetailsActivityListItem.utils';

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
}

export const getMultichainTransactionItemType = (
  item: Transaction | GroupedActivityListItem,
  shouldUseActivityRedesign: boolean,
  bridgeHistoryItemsBySrcTxHash: Readonly<Record<string, unknown>>,
) => {
  if (shouldUseActivityRedesign) {
    if (item.type === 'pending-header' || item.type === 'date-header') {
      return item.type;
    }

    const transaction =
      item.type === 'item' && item.item.raw?.type === 'keyringTransaction'
        ? item.item.raw.data
        : undefined;

    return transaction && bridgeHistoryItemsBySrcTxHash[transaction.id]
      ? 'bridge-activity'
      : 'activity-item';
  }

  const transaction = item as Transaction;

  return bridgeHistoryItemsBySrcTxHash[transaction.id]
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
}: MultichainTransactionsViewProps) => {
  const { colors } = useTheme();
  const style = styles();
  const defaultNavigation = useNavigation();
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

  const { bridgeHistoryItemsBySrcTxHash } = useBridgeHistoryItemBySrcTxHash();
  const isActivityRedesignEnabled = useSelector(
    selectIsActivityRedesignEnabled,
  );
  const shouldUseActivityRedesign =
    isActivityRedesignEnabled &&
    location === TransactionDetailLocation.AssetDetails;
  const activityListData = useMemo(
    () =>
      shouldUseActivityRedesign
        ? groupActivityListItems(
            visibleMultichainTransactions.map((transaction) =>
              mapMultichainTransactionToActivityItem({
                transaction,
                chainId,
              }),
            ),
          )
        : visibleMultichainTransactions,
    [chainId, shouldUseActivityRedesign, visibleMultichainTransactions],
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

    if (
      isActivityRedesignEnabled &&
      location === TransactionDetailLocation.AssetDetails
    ) {
      return (
        <MultichainAssetDetailsActivityListItem
          transaction={item}
          navigation={nav}
          index={index}
          chainId={chainId}
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
