import { NavigationProp, useNavigation } from '@react-navigation/native';
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
import { FlashList } from '@shopify/flash-list';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import Routes from '../../../../../constants/navigation/Routes';
import type { Theme } from '../../../../../util/theme/models';
import { PerpsNavigationParamList } from '../../types/navigation';

// Import PerpsController hooks
import { usePerpsConnection, usePerpsTrading } from '../../hooks';
import {
  transformFillsToTransactions,
  transformFundingToTransactions,
  transformOrdersToTransactions,
} from '../../utils/transactionTransforms';
import PerpsTransactionItem from '../../components/PerpsTransactionItem';

// Perps transaction data structure matching the new design
export interface PerpsTransaction {
  id: string;
  type: 'trade' | 'order' | 'funding';
  category: 'position_open' | 'position_close' | 'limit_order' | 'funding_fee';
  title: string;
  subtitle: string; // Asset amount (e.g., "2.01 ETH")
  timestamp: number;
  asset: string;
  // For trades: fill info
  fill?: {
    shortTitle: string; // e.g., "Opened long" or "Closed long"
    amount: string; // e.g., "+$43.99" or "-$400"
    amountNumber: number; // e.g., 43.99 or 400
    isPositive: boolean;
    size: string;
    entryPrice: string;
    points: string;
    pnl: string;
    fee: string;
    action: string;
    feeToken: string;
  };
  // For orders: order info
  order?: {
    text: string; // e.g., "Filled", "Canceled"
    statusType: 'filled' | 'canceled' | 'pending';
    type: 'limit' | 'market';
    size: string;
    limitPrice: string;
    filled: string;
  };
  // For funding: funding info
  fundingAmount?: {
    isPositive: boolean;
    fee: string;
    feeNumber: number;
    rate: string;
  };
}

// Helper interface for date-grouped data
interface TransactionSection {
  title: string; // "Today", "Jul 26", etc.
  data: PerpsTransaction[];
}

// Union type for FlashList items (headers + transactions)
type ListItem =
  | { type: 'header'; title: string; id: string }
  | { type: 'transaction'; transaction: PerpsTransaction; id: string };

type FilterTab = 'Trades' | 'Orders' | 'Funding';

interface PerpsTransactionsViewProps {}

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return {
    container: {
      flex: 1,
    },
    filterTabText: {
      color: colors.text.alternative,
    },
    filterContainer: {
      paddingHorizontal: 16,
      paddingVertical: 16,
      backgroundColor: colors.background.default,
      zIndex: 1000, // iOS
      elevation: 1000, // Android
      position: 'relative' as const,
    },
    filterScrollView: {
      flexDirection: 'row' as const,
    },
    filterTab: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      marginRight: 8,
      borderRadius: 20,
      backgroundColor: colors.background.default,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    filterTabActive: {
      backgroundColor: colors.background.defaultPressed,
    },
    transactionList: {
      flex: 1,
      minHeight: 1, // Prevents FlashList layout issues
    },
    sectionHeader: {
      paddingTop: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.background.default,
    },
    sectionHeaderText: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.text.muted,
    },
    transactionItem: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingVertical: 16,
      paddingHorizontal: 16,
      minHeight: 72, // Consistent height for FlashList
    },
    transactionIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
    },
    tokenIconContainer: {
      width: 36,
      height: 36,
      borderRadius: 18,
      marginRight: 12,
      overflow: 'hidden' as const,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    transactionContent: {
      flex: 1,
    },
    transactionContentCentered: {
      flex: 1,
      justifyContent: 'center' as const,
    },
    transactionTitle: {
      fontSize: 16,
      fontWeight: '400' as const,
      color: colors.text.default,
      marginBottom: 4,
    },
    transactionTitleCentered: {
      fontSize: 16,
      fontWeight: '400' as const,
      color: colors.text.default,
      marginBottom: 0, // No margin when centered
    },
    transactionSubtitle: {
      fontSize: 14,
      color: colors.text.alternative,
    },
    rightContent: {
      alignItems: 'flex-end' as const,
    },
    profitAmount: {
      color: colors.success.default,
    },
    lossAmount: {
      color: colors.error.default,
    },
    statusFilled: {
      color: colors.text.muted,
    },
    statusCanceled: {
      color: colors.text.muted,
    },
    statusPending: {
      color: colors.text.muted,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      paddingVertical: 48,
    },
    emptyText: {
      textAlign: 'center' as const,
      marginTop: 16,
      color: colors.text.muted,
    },
  };
};

const PerpsTransactionsView: React.FC<PerpsTransactionsViewProps> = () => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();

  const [fillTransactions, setFillTransactions] = useState<PerpsTransaction[]>(
    [],
  );
  const [orderTransactions, setOrderTransactions] = useState<
    PerpsTransaction[]
  >([]);
  const [fundingTransactions, setFundingTransactions] = useState<
    PerpsTransaction[]
  >([]);
  const [flatListData, setFlatListData] = useState<ListItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('Trades');
  const [refreshing, setRefreshing] = useState(false);

  // Ref for FlashList to control scrolling
  const flashListRef = useRef(null);

  const { isConnected } = usePerpsConnection();
  const { getOrderFills, getOrders, getFunding } = usePerpsTrading();

  // Helper function to format date for section headers
  const formatDateSection = (timestamp: number): string => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

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

  // Load real transaction data from HyperLiquid API
  const loadTransactions = useCallback(async () => {
    if (!isConnected) {
      return;
    }

    setRefreshing(true);
    try {
      // Fetch historical data in parallel
      const [fillsData, ordersData, fundingData] = await Promise.all([
        getOrderFills().catch((error) => {
          console.warn('Failed to fetch fills:', error);
          return [];
        }),
        getOrders().catch((error) => {
          console.warn('Failed to fetch orders:', error);
          return [];
        }),
        getFunding().catch((error) => {
          console.warn('Failed to fetch funding:', error);
          return [];
        }),
      ]);

      // Transform and store each data type separately
      const transformedFills = transformFillsToTransactions(fillsData);
      const transformedOrders = transformOrdersToTransactions(ordersData);
      const transformedFunding = transformFundingToTransactions(fundingData);

      // Sort each type chronologically (newest first)
      setFillTransactions(
        transformedFills.sort((a, b) => b.timestamp - a.timestamp),
      );
      setOrderTransactions(
        transformedOrders.sort((a, b) => b.timestamp - a.timestamp),
      );
      setFundingTransactions(
        transformedFunding.sort((a, b) => b.timestamp - a.timestamp),
      );
    } catch (error) {
      // Fallback to empty arrays on error
      setFillTransactions([]);
      setOrderTransactions([]);
      setFundingTransactions([]);
    } finally {
      setRefreshing(false);
    }
  }, [isConnected, getFunding, getOrders, getOrderFills]);

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
    setRefreshing(true);
    await loadTransactions();
    setRefreshing(false);
  }, [loadTransactions]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

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
            {tab}
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
      const statusStyle =
        item.order.statusType === 'filled'
          ? styles.statusFilled
          : item.order.statusType === 'canceled'
          ? styles.statusCanceled
          : styles.statusPending;

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
        No {activeFilter.toLowerCase()} transactions yet
      </Text>
      <Text style={styles.emptyText}>
        Your trading history will appear here
      </Text>
    </View>
  );

  const filterTabs: FilterTab[] = useMemo(
    () => ['Trades', 'Orders', 'Funding'],
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
        estimatedItemSize={52}
        getItemType={(item) =>
          item.type === 'header' ? 'header' : 'transaction'
        }
        overrideItemLayout={(layout, item) => {
          // Fix gaps by setting exact heights
          if (item.type === 'header') {
            layout.size = 48;
          } else {
            layout.size = 72;
          }
        }}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        drawDistance={200}
        ItemSeparatorComponent={() => null}
        scrollEventThrottle={16}
        removeClippedSubviews
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
};

export default PerpsTransactionsView;
