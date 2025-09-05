import { NavigationProp, useNavigation } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import Routes from '../../../../../constants/navigation/Routes';
import { PerpsNavigationParamList } from '../../types/navigation';

// Import PerpsController hooks
import PerpsTransactionItem from '../../components/PerpsTransactionItem';
import { PERPS_TRANSACTIONS_HISTORY_CONSTANTS } from '../../constants/transactionsHistoryConfig';
import {
  usePerpsConnection,
  usePerpsFunding,
  usePerpsOrderFills,
  usePerpsOrders,
} from '../../hooks';
import {
  FilterTab,
  ListItem,
  PerpsTransaction,
  PerpsTransactionsViewProps,
  TransactionSection,
} from '../../types/transactionHistory';
import { formatDateSection } from '../../utils/formatUtils';
import {
  transformFillsToTransactions,
  transformFundingToTransactions,
  transformOrdersToTransactions,
} from '../../utils/transactionTransforms';
import { styleSheet } from './PerpsTransactionsView.styles';
import { PerpsMeasurementName } from '../../constants/performanceMetrics';
import { usePerpsScreenTracking } from '../../hooks/usePerpsScreenTracking';

const PerpsTransactionsView: React.FC<PerpsTransactionsViewProps> = () => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();

  // Transaction data is now computed from hooks instead of stored in state
  const [flatListData, setFlatListData] = useState<ListItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('Trades');
  const [refreshing, setRefreshing] = useState(false);

  // Ref for FlashList to control scrolling
  const flashListRef = useRef(null);

  // Track screen load performance
  usePerpsScreenTracking({
    screenName: PerpsMeasurementName.TRANSACTION_HISTORY_SCREEN_LOADED,
    dependencies: [flatListData.length > 0],
  });

  const { isConnected } = usePerpsConnection();

  // Use new hooks for data fetching
  const { orderFills: fillsData, refresh: refreshFills } = usePerpsOrderFills({
    skipInitialFetch: !isConnected,
  });

  const { orders: ordersData, refresh: refreshOrders } = usePerpsOrders({
    skipInitialFetch: !isConnected,
  });

  const { funding: fundingData, refresh: refreshFunding } = usePerpsFunding({
    skipInitialFetch: !isConnected,
  });

  // Helper function to group transactions by date
  const groupTransactionsByDate = useCallback(
    (transactions: PerpsTransaction[]): TransactionSection[] => {
      const grouped = transactions.reduce((acc, transaction) => {
        const dateKey = formatDateSection(transaction.timestamp);
        if (!acc[dateKey]) {
          acc[dateKey] = [];
        }
        acc[dateKey].push(transaction);
        return acc;
      }, {} as Record<string, PerpsTransaction[]>);

      return Object.entries(grouped).map(([title, data]) => ({ title, data }));
    },
    [],
  );

  // Helper function to flatten grouped data for FlashList with unique IDs
  const flattenGroupedTransactions = (
    sections: TransactionSection[],
    filterType: FilterTab,
  ): ListItem[] => {
    const flattened: ListItem[] = [];

    sections.forEach((section) => {
      // Add section header with filter-specific ID to avoid collisions
      flattened.push({
        type: 'header',
        title: section.title,
        id: `${filterType}-header-${section.title}`,
      });

      // Add transactions with filter-specific ID to avoid collisions
      section.data.forEach((transaction, index) => {
        flattened.push({
          type: 'transaction',
          transaction,
          id: `${filterType}-${transaction.id}-${index}`,
        });
      });
    });

    return flattened;
  };

  // Transform raw data from hooks into transaction format
  const fillTransactions = useMemo(
    () => transformFillsToTransactions(fillsData || []),
    [fillsData],
  );

  const orderTransactions = useMemo(
    () => transformOrdersToTransactions(ordersData || []),
    [ordersData],
  );

  const fundingTransactions = useMemo(
    () => transformFundingToTransactions(fundingData || []),
    [fundingData],
  );

  // Memoized grouped transactions to avoid recalculation on every filter change
  const allGroupedTransactions = useMemo(
    () => ({
      Trades: groupTransactionsByDate(fillTransactions),
      Orders: groupTransactionsByDate(orderTransactions),
      Funding: groupTransactionsByDate(fundingTransactions),
    }),
    [
      fillTransactions,
      orderTransactions,
      fundingTransactions,
      groupTransactionsByDate,
    ],
  );

  // Memoized flat data for current filter - prevents re-flattening on every change
  const currentFlatListData = useMemo(() => {
    const currentGrouped = allGroupedTransactions[activeFilter] || [];
    return flattenGroupedTransactions(currentGrouped, activeFilter);
  }, [allGroupedTransactions, activeFilter]);

  // Update state only when needed - much faster tab switching
  useEffect(() => {
    setFlatListData(currentFlatListData);
  }, [allGroupedTransactions, activeFilter, currentFlatListData]);

  // Note: Removed automatic scroll to top on tab change to allow switching tabs while scrolling

  const onRefresh = useCallback(async () => {
    if (!isConnected) {
      return;
    }
    setRefreshing(true);
    try {
      // Refresh all data sources in parallel
      await Promise.all([refreshFills(), refreshOrders(), refreshFunding()]);
    } catch (error) {
      console.warn('Failed to refresh transaction data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [isConnected, refreshFills, refreshOrders, refreshFunding]);

  // Initial loading is handled by the hooks themselves

  const renderFilterTab = useCallback(
    (tab: FilterTab) => {
      const isActive = activeFilter === tab;

      const handleTabPress = () => {
        // Immediately scroll to top and switch tabs
        if (flashListRef.current) {
          (
            flashListRef.current as unknown as {
              scrollToOffset: (offset: {
                offset: number;
                animated: boolean;
              }) => void;
            }
          )?.scrollToOffset({
            offset: 0,
            animated: false,
          });
        }
        setActiveFilter(tab);
      };

      return (
        <TouchableOpacity
          key={tab}
          style={[styles.filterTab, isActive && styles.filterTabActive]}
          onPressIn={handleTabPress}
          activeOpacity={0.7}
          delayPressIn={0}
          delayPressOut={0}
        >
          <Text
            variant={TextVariant.BodyMDBold}
            style={isActive ? null : styles.filterTabText}
          >
            {strings(`perps.transactions.tabs.${tab.toLowerCase()}`)}
          </Text>
        </TouchableOpacity>
      );
    },
    [
      activeFilter,
      styles.filterTab,
      styles.filterTabActive,
      styles.filterTabText,
    ],
  );

  const handleTransactionPress = (transaction: PerpsTransaction) => {
    switch (transaction.type) {
      case 'trade':
        navigation.navigate(Routes.PERPS.POSITION_TRANSACTION, {
          transaction,
        });
        break;
      case 'order':
        navigation.navigate(Routes.PERPS.ORDER_TRANSACTION, {
          transaction,
        });
        break;
      case 'funding':
        navigation.navigate(Routes.PERPS.FUNDING_TRANSACTION, {
          transaction,
        });
        break;
      default:
        // Unknown transaction type - do nothing
        break;
    }
  };

  // Render right content based on transaction type
  const renderRightContent = (item: PerpsTransaction) => {
    if (item.fill) {
      return (
        <Text
          variant={TextVariant.BodySM}
          style={item.fill.isPositive ? styles.profitAmount : styles.lossAmount}
        >
          {item.fill.amount}
        </Text>
      );
    }

    if (item.order) {
      let statusStyle;
      if (item.order.statusType === 'filled') {
        statusStyle = styles.statusFilled;
      } else if (item.order.statusType === 'canceled') {
        statusStyle = styles.statusCanceled;
      } else {
        statusStyle = styles.statusPending;
      }

      return (
        <Text variant={TextVariant.BodySM} style={statusStyle}>
          {item.order.text}
        </Text>
      );
    }

    if (item.fundingAmount) {
      return (
        <Text
          variant={TextVariant.BodySM}
          style={
            item.fundingAmount.isPositive
              ? styles.profitAmount
              : styles.lossAmount
          }
        >
          {item.fundingAmount.fee}
        </Text>
      );
    }

    return null;
  };

  // Render function for FlashList items (handles both headers and transactions)
  const renderListItem = ({ item }: { item: ListItem }) => {
    if (item.type === 'header') {
      return (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText}>{item.title}</Text>
        </View>
      );
    }

    // Transaction item
    return (
      <PerpsTransactionItem
        item={item.transaction}
        styles={styles}
        onPress={handleTransactionPress}
        renderRightContent={renderRightContent}
      />
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>
        {strings('perps.transactions.empty_state.no_transactions', {
          type: activeFilter.toLowerCase(),
        })}
      </Text>
      <Text style={styles.emptyText}>
        {strings('perps.transactions.empty_state.history_will_appear')}
      </Text>
    </View>
  );

  const filterTabs: FilterTab[] = useMemo(
    () => [
      strings('perps.transactions.tabs.trades'),
      strings('perps.transactions.tabs.orders'),
      strings('perps.transactions.tabs.funding'),
    ],
    [],
  );

  return (
    <View style={styles.container}>
      <View style={styles.filterContainer} pointerEvents="box-none">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScrollView}
          pointerEvents="auto"
          scrollEnabled={false}
        >
          {filterTabs.map(renderFilterTab)}
        </ScrollView>
      </View>

      <FlashList
        ref={flashListRef}
        data={flatListData}
        renderItem={renderListItem}
        keyExtractor={(item) => item.id}
        getItemType={(item) =>
          item.type === 'header' ? 'header' : 'transaction'
        }
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        drawDistance={
          PERPS_TRANSACTIONS_HISTORY_CONSTANTS.FLASH_LIST_DRAW_DISTANCE
        }
        ItemSeparatorComponent={() => null}
        scrollEventThrottle={
          PERPS_TRANSACTIONS_HISTORY_CONSTANTS.FLASH_LIST_SCROLL_EVENT_THROTTLE
        }
        removeClippedSubviews
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
};

export default PerpsTransactionsView;
