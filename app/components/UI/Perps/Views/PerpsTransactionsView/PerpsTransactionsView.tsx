import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import { useStyles } from '../../../../../component-library/hooks';
import type { Theme } from '../../../../../util/theme/models';
import Routes from '../../../../../constants/navigation/Routes';
import { PerpsNavigationParamList } from '../../types/navigation';

// Import PerpsController hooks
import {
  usePerpsConnection,
  usePerpsTrading,
  usePerpsNetwork,
} from '../../hooks';
import { fontStyles } from '../../../../../styles/common';
import {
  transformFillsToTransactions,
  transformOrdersToTransactions,
  transformFundingToTransactions,
  combineAndSortTransactions,
} from '../../utils/transactionTransforms';

// Perps transaction data structure matching the screenshot
interface PerpsTransaction {
  id: string;
  type: 'trade' | 'order' | 'funding';
  category: 'position_open' | 'position_close' | 'limit_order' | 'funding_fee';
  title: string;
  status: 'Completed' | 'Placed' | 'Queued';
  timestamp: number;
  amount: string;
  amountUSD: string;
  asset: string;
  leverage?: string;
  isPositive: boolean;
}

type FilterTab = 'All' | 'Trades' | 'Orders' | 'Funding';

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
      paddingHorizontal: 16,
    },
    transactionItem: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingVertical: 16,
      paddingHorizontal: 0,
    },
    transactionIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      marginRight: 12,
    },
    positionUpIcon: {
      backgroundColor: colors.primary.default,
    },
    positionDownIcon: {
      backgroundColor: colors.primary.default,
    },
    orderIcon: {
      backgroundColor: colors.primary.default,
    },
    fundingIcon: {
      backgroundColor: colors.primary.default,
    },
    transactionContent: {
      flex: 1,
    },
    transactionTitle: {
      fontSize: 16,
      fontWeight: '400' as const,
      color: colors.text.default,
      marginBottom: 2,
    },
    transactionStatus: {
      fontSize: 14,
      color: colors.text.muted,
    },
    transactionAmountContainer: {
      alignItems: 'flex-end' as const,
    },
    transactionAmount: {
      fontSize: 16,
      fontWeight: '400' as const,
      marginBottom: 2,
    },
    transactionAmountUSD: {
      fontSize: 14,
      color: colors.text.muted,
    },
    positiveAmount: {
      color: colors.success.default,
    },
    negativeAmount: {
      color: colors.text.default,
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

  const [transactions, setTransactions] = useState<PerpsTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<
    PerpsTransaction[]
  >([]);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('All');
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const currentNetwork = usePerpsNetwork();
  const { isConnected } = usePerpsConnection();
  const { getAccountState, getUserFills, getUserOrders, getUserFunding } =
    usePerpsTrading();

  // Load real transaction data from HyperLiquid API
  const loadTransactions = useCallback(async () => {
    if (!isConnected) {
      return;
    }

    setIsLoading(true);
    try {
      // Fetch historical data in parallel
      const [fillsData, ordersData, fundingData] = await Promise.all([
        getUserFills().catch((error) => {
          console.warn('Failed to fetch fills:', error);
          return [];
        }),
        getUserOrders().catch((error) => {
          console.warn('Failed to fetch orders:', error);
          return [];
        }),
        getUserFunding().catch((error) => {
          console.warn('Failed to fetch funding:', error);
          return [];
        }),
      ]);

      // Transform each data type to PerpsTransaction format
      const fillTransactions = transformFillsToTransactions(fillsData);
      const orderTransactions = transformOrdersToTransactions(ordersData);
      const fundingTransactions = transformFundingToTransactions(fundingData);

      // Combine and sort all transactions
      const allTransactions = combineAndSortTransactions(
        fillTransactions,
        orderTransactions,
        fundingTransactions,
      );

      setTransactions(allTransactions);
    } catch (error) {
      console.error('Failed to load perps transactions:', error);
      // Fallback to empty array on error
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, getUserFills, getUserOrders, getUserFunding]);

  // Filter transactions based on active filter
  useEffect(() => {
    let filtered = transactions;

    switch (activeFilter) {
      case 'Trades':
        filtered = transactions.filter((tx) => tx.type === 'trade');
        break;
      case 'Orders':
        filtered = transactions.filter((tx) => tx.type === 'order');
        break;
      case 'Funding':
        filtered = transactions.filter((tx) => tx.type === 'funding');
        break;
      case 'All':
      default:
        filtered = transactions;
        break;
    }

    setFilteredTransactions(filtered);
  }, [transactions, activeFilter]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTransactions();
    setRefreshing(false);
  }, [loadTransactions]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const getTransactionIcon = (transaction: PerpsTransaction) => {
    switch (transaction.category) {
      case 'position_open':
        return IconName.ArrowUp;
      case 'position_close':
        return IconName.ArrowDown;
      case 'limit_order':
        return IconName.Calendar;
      case 'funding_fee':
        return IconName.Clock;
      default:
        return IconName.ArrowUp;
    }
  };

  const getIconStyle = (transaction: PerpsTransaction) => {
    switch (transaction.category) {
      case 'position_open':
        return styles.positionUpIcon;
      case 'position_close':
        return styles.positionDownIcon;
      case 'limit_order':
        return styles.orderIcon;
      case 'funding_fee':
        return styles.fundingIcon;
      default:
        return styles.positionUpIcon;
    }
  };

  const renderFilterTab = (tab: FilterTab) => (
    <TouchableOpacity
      key={tab}
      style={[styles.filterTab, activeFilter === tab && styles.filterTabActive]}
      onPress={() => setActiveFilter(tab)}
    >
      <Text
        variant={TextVariant.BodyMDBold}
        style={activeFilter === tab ? null : styles.filterTabText}
      >
        {tab}
      </Text>
    </TouchableOpacity>
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
        console.log('Unknown transaction type:', transaction.type);
    }
  };

  const renderTransactionItem = ({ item }: { item: PerpsTransaction }) => (
    <TouchableOpacity
      style={styles.transactionItem}
      onPress={() => handleTransactionPress(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.transactionIcon, getIconStyle(item)]}>
        <Icon
          name={getTransactionIcon(item)}
          size={IconSize.Sm}
          color={IconColor.Inverse}
        />
      </View>

      <View style={styles.transactionContent}>
        <Text style={styles.transactionTitle}>{item.title}</Text>
        <Text style={styles.transactionStatus}>{item.status}</Text>
      </View>

      {item.amount && (
        <View style={styles.transactionAmountContainer}>
          <Text
            style={[
              styles.transactionAmount,
              item.isPositive ? styles.positiveAmount : styles.negativeAmount,
            ]}
          >
            {item.amount}
          </Text>
          <Text style={styles.transactionAmountUSD}>{item.amountUSD}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

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

  const filterTabs: FilterTab[] = ['All', 'Trades', 'Orders', 'Funding'];

  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScrollView}
        >
          {filterTabs.map(renderFilterTab)}
        </ScrollView>
      </View>

      <FlatList
        style={styles.transactionList}
        data={filteredTransactions}
        keyExtractor={(item) => item.id}
        renderItem={renderTransactionItem}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

export default PerpsTransactionsView;
