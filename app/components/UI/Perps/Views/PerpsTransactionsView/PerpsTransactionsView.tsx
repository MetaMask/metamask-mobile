import { NavigationProp, useNavigation } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import Routes from '../../../../../constants/navigation/Routes';
import { PerpsNavigationParamList } from '../../types/navigation';

// Import PerpsController hooks
import PerpsTransactionItem from '../../components/PerpsTransactionItem';
import PerpsTransactionsSkeleton from '../../components/PerpsTransactionsSkeleton';
import { PERPS_TRANSACTIONS_HISTORY_CONSTANTS } from '../../constants/transactionsHistoryConfig';
import {
  usePerpsConnection,
  usePerpsFunding,
  usePerpsOrderFills,
  usePerpsOrders,
  useWithdrawalRequests,
  useDepositRequests,
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
  transformWithdrawalRequestsToTransactions,
  transformDepositRequestsToTransactions,
} from '../../utils/transactionTransforms';
import { styleSheet } from './PerpsTransactionsView.styles';
import { usePerpsMeasurement } from '../../hooks/usePerpsMeasurement';
import { TraceName } from '../../../../../util/trace';
import { getUserFundingsListTimePeriod } from '../../utils/transactionUtils';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';

const PerpsTransactionsView: React.FC<PerpsTransactionsViewProps> = () => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();

  // Transaction data is now computed from hooks instead of stored in state
  const [flatListData, setFlatListData] = useState<ListItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('Trades');
  const [refreshing, setRefreshing] = useState(false);

  // Ref for FlashList to control scrolling
  const flashListRef = useRef(null);

  const { isConnected, isConnecting } = usePerpsConnection();

  // Use new hooks for data fetching
  const {
    orderFills: fillsData,
    isLoading: fillsLoading,
    refresh: refreshFills,
  } = usePerpsOrderFills({
    skipInitialFetch: !isConnected,
  });

  const {
    orders: ordersData,
    isLoading: ordersLoading,
    refresh: refreshOrders,
  } = usePerpsOrders({
    skipInitialFetch: !isConnected,
  });

  // Memoize the funding params to prevent infinite re-renders
  const fundingParams = useMemo(
    () => ({
      startTime: getUserFundingsListTimePeriod(),
    }),
    [], // Empty dependency array since we want this to be stable
  );

  const {
    funding: fundingData,
    isLoading: fundingLoading,
    refresh: refreshFunding,
  } = usePerpsFunding({
    params: fundingParams,
    skipInitialFetch: !isConnected,
  });

  // Memoize the withdrawal params to prevent infinite re-renders
  const withdrawalParams = useMemo(
    () => ({
      startTime: (() => {
        // Get start of today (midnight UTC) to see today's withdrawals
        const now = new Date();
        return new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
        ).getTime();
      })(),
    }),
    [], // Empty dependency array since we want this to be stable
  );

  // Get withdrawal requests
  const { withdrawalRequests, refetch: refreshWithdrawalRequests } =
    useWithdrawalRequests({
      startTime: withdrawalParams.startTime,
      skipInitialFetch: !isConnected,
    });

  // Get deposit requests
  const { depositRequests, refetch: refreshDepositRequests } =
    useDepositRequests({
      startTime: withdrawalParams.startTime, // Use same time range as withdrawals
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

  // Create a map of orderId to order for fast lookup
  const orderMap = useMemo(() => {
    const map = new Map<string, (typeof ordersData)[0]>();
    (ordersData || []).forEach((order) => {
      map.set(order.orderId, order);
    });
    return map;
  }, [ordersData]);

  // Enrich fills with order data to determine TP/SL
  const enrichedFills = useMemo(
    () =>
      (fillsData || []).map((fill) => {
        const enrichedFill = { ...fill };

        // Cross-reference with historical orders
        const matchingOrder = orderMap.get(fill.orderId);
        if (matchingOrder?.detailedOrderType) {
          // Add the detailed order type to the fill
          enrichedFill.detailedOrderType = matchingOrder.detailedOrderType;
        }

        return enrichedFill;
      }),
    [fillsData, orderMap],
  );

  // Transform raw data from hooks into transaction format
  const fillTransactions = useMemo(
    () => transformFillsToTransactions(enrichedFills),
    [enrichedFills],
  );

  const orderTransactions = useMemo(
    () => transformOrdersToTransactions(ordersData || []),
    [ordersData],
  );

  const fundingTransactions = useMemo(
    () => transformFundingToTransactions(fundingData || []),
    [fundingData],
  );

  // Transform withdrawal requests to transactions
  const withdrawalTransactions = useMemo(() => {
    const transformed =
      transformWithdrawalRequestsToTransactions(withdrawalRequests);
    console.log('Withdrawal transactions for UI:', {
      rawCount: withdrawalRequests.length,
      transformedCount: transformed.length,
      raw: withdrawalRequests.map((w) => ({
        id: w.id,
        status: w.status,
        amount: w.amount,
        timestamp: new Date(w.timestamp).toISOString(),
      })),
      transformed: transformed.map((t) => ({
        id: t.id,
        title: t.title,
        subtitle: t.subtitle,
        timestamp: new Date(t.timestamp).toISOString(),
      })),
    });
    return transformed;
  }, [withdrawalRequests]);

  // Transform deposit requests to transactions
  const depositTransactions = useMemo(() => {
    const transformed = transformDepositRequestsToTransactions(depositRequests);
    console.log('Deposit transactions for UI:', {
      rawCount: depositRequests.length,
      transformedCount: transformed.length,
      raw: depositRequests.map((d) => ({
        id: d.id,
        status: d.status,
        amount: d.amount,
        timestamp: new Date(d.timestamp).toISOString(),
      })),
      transformed: transformed.map((t) => ({
        id: t.id,
        title: t.title,
        subtitle: t.subtitle,
        timestamp: new Date(t.timestamp).toISOString(),
      })),
    });
    return transformed;
  }, [depositRequests]);

  // Memoized grouped transactions to avoid recalculation on every filter change
  const allGroupedTransactions = useMemo(() => {
    const grouped = {
      Trades: groupTransactionsByDate(fillTransactions),
      Orders: groupTransactionsByDate(orderTransactions),
      Funding: groupTransactionsByDate(fundingTransactions),
      Withdraw: groupTransactionsByDate(withdrawalTransactions),
      Deposit: groupTransactionsByDate(depositTransactions),
    };

    console.log('Grouped transactions for Withdraw tab:', {
      withdrawalTransactionsCount: withdrawalTransactions.length,
      groupedWithdrawCount: grouped.Withdraw.length,
      groupedWithdraw: grouped.Withdraw.map((group) => ({
        title: group.title,
        dataCount: group.data.length,
        data: group.data.map((item) => ({
          id: item.id,
          title: item.title,
          subtitle: item.subtitle,
          timestamp: new Date(item.timestamp).toISOString(),
        })),
      })),
    });

    // Log each transaction individually to see the actual data
    grouped.Withdraw.forEach((group, groupIndex) => {
      console.log(
        `Group ${groupIndex} (${group.title}):`,
        group.data.length,
        'transactions',
      );
      group.data.forEach((transaction, index) => {
        console.log(`  Transaction ${index}:`, {
          id: transaction.id,
          title: transaction.title,
          subtitle: transaction.subtitle,
          timestamp: new Date(transaction.timestamp).toISOString(),
          status: transaction.depositWithdrawal?.status,
        });
      });
    });

    return grouped;
  }, [
    fillTransactions,
    orderTransactions,
    fundingTransactions,
    withdrawalTransactions,
    depositTransactions,
    groupTransactionsByDate,
  ]);

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
      await Promise.all([
        refreshFills(),
        refreshOrders(),
        refreshFunding(),
        refreshWithdrawalRequests(),
        refreshDepositRequests(),
      ]);
    } catch (error) {
      console.warn('Failed to refresh transaction data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [
    isConnected,
    refreshFills,
    refreshOrders,
    refreshFunding,
    refreshWithdrawalRequests,
    refreshDepositRequests,
  ]);

  // Initial loading is handled by the hooks themselves

  const renderFilterTab = useCallback(
    (tab: FilterTab, index: number) => {
      const isActive = activeFilter === tab;

      // Convert index to i18n key
      const i18nKeys = ['trades', 'orders', 'funding', 'withdraw', 'deposit'];
      const i18nKey = i18nKeys[index];

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
        <Button
          key={tab}
          variant={isActive ? ButtonVariants.Primary : ButtonVariants.Secondary}
          size={ButtonSize.Sm}
          onPress={handleTabPress}
          accessibilityRole="button"
          label={strings(`perps.transactions.tabs.${i18nKey}`)}
        />
      );
    },
    [activeFilter],
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
      strings('perps.transactions.tabs.withdraw'),
      strings('perps.transactions.tabs.deposit'),
    ],
    [],
  );

  const filterTabDescription = useMemo(() => {
    if (activeFilter === 'Funding') {
      return strings('perps.transactions.tabs.funding_description');
    }
    return null;
  }, [activeFilter]);

  // Determine if we should show loading skeleton
  const isInitialLoading = useMemo(
    () =>
      // Show loading if we're connecting or if any data sources are loading
      isConnecting || fillsLoading || ordersLoading || fundingLoading,
    [isConnecting, fillsLoading, ordersLoading, fundingLoading],
  );

  // Track screen load performance - measures time until all data is loaded and UI is interactive
  // Only measures once per session (no reset on refresh/tab switch)
  usePerpsMeasurement({
    traceName: TraceName.PerpsTransactionsView,
    conditions: [!isInitialLoading],
    resetConditions: [], // Prevent automatic reset on subsequent loads
  });

  // Determine if we should show empty state (only after loading is complete and no data)
  const shouldShowEmptyState = useMemo(() => {
    if (isInitialLoading) return false;
    if (!isConnected) return false;

    // Show empty state only if loading is complete and we have no data
    return flatListData.length === 0;
  }, [isInitialLoading, isConnected, flatListData.length]);

  // Show loading skeleton during initial load
  if (isInitialLoading) {
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

        {filterTabDescription && (
          <View style={styles.tabDescription}>
            <Text variant={TextVariant.BodySM}>{filterTabDescription}</Text>
          </View>
        )}

        <PerpsTransactionsSkeleton testID="perps-transactions-loading-skeleton" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.filterContainer} pointerEvents="box-none">
        <ScrollView
          horizontal
          contentContainerStyle={styles.filterTabContainer}
          showsHorizontalScrollIndicator={false}
          pointerEvents="auto"
          scrollEnabled
        >
          {filterTabs.map(renderFilterTab)}
        </ScrollView>
      </View>

      {filterTabDescription && (
        <View style={styles.tabDescription}>
          <Text variant={TextVariant.BodySM}>{filterTabDescription}</Text>
        </View>
      )}

      <FlashList
        ref={flashListRef}
        data={flatListData}
        renderItem={renderListItem}
        keyExtractor={(item) => item.id}
        getItemType={(item) =>
          item.type === 'header' ? 'header' : 'transaction'
        }
        ListEmptyComponent={shouldShowEmptyState ? renderEmptyState : null}
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
