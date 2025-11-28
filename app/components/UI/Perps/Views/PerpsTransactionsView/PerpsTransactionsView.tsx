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
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import Routes from '../../../../../constants/navigation/Routes';
import { PerpsNavigationParamList } from '../../types/navigation';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../selectors/accountsController';
import { selectChainId } from '../../../../../selectors/networkController';
import { formatAccountToCaipAccountId } from '../../utils/rewardsUtils';

// Import PerpsController hooks
import PerpsTransactionItem from '../../components/PerpsTransactionItem';
import PerpsTransactionsSkeleton from '../../components/PerpsTransactionsSkeleton';
import { PERPS_TRANSACTIONS_HISTORY_CONSTANTS } from '../../constants/transactionsHistoryConfig';
import { usePerpsConnection, usePerpsTransactionHistory } from '../../hooks';
import {
  FilterTab,
  ListItem,
  PerpsTransaction,
  PerpsTransactionsViewProps,
  TransactionSection,
} from '../../types/transactionHistory';
import { formatDateSection } from '../../utils/formatUtils';
import { styleSheet } from './PerpsTransactionsView.styles';
import { usePerpsMeasurement } from '../../hooks/usePerpsMeasurement';
import { TraceName } from '../../../../../util/trace';
import ButtonFilter from '../../../../../component-library/components-temp/ButtonFilter';
import { ButtonSize } from '@metamask/design-system-react-native';
import { TabEmptyState } from '../../../../../component-library/components-temp/TabEmptyState';

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

  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const currentChainId = useSelector(selectChainId);
  const accountId = useMemo(() => {
    if (!selectedAddress || !currentChainId) {
      return undefined;
    }
    return (
      formatAccountToCaipAccountId(selectedAddress, currentChainId) ?? undefined
    );
  }, [selectedAddress, currentChainId]);

  // Use single source of truth for all transaction data (includes deposits/withdrawals from user history)
  const {
    transactions: allTransactions,
    isLoading: transactionsLoading,
    refetch: refreshTransactions,
  } = usePerpsTransactionHistory({
    skipInitialFetch: !isConnected,
    accountId,
  });

  // Helper function to group transactions by date
  const groupTransactionsByDate = useCallback(
    (transactions: PerpsTransaction[]): TransactionSection[] => {
      const grouped = transactions.reduce(
        (acc, transaction) => {
          const dateKey = formatDateSection(transaction.timestamp);
          if (!acc[dateKey]) {
            acc[dateKey] = [];
          }
          acc[dateKey].push(transaction);
          return acc;
        },
        {} as Record<string, PerpsTransaction[]>,
      );

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

  // Filter transactions by type from the single source of truth
  const fillTransactions = useMemo(
    () => allTransactions.filter((tx) => tx.type === 'trade'),
    [allTransactions],
  );

  const orderTransactions = useMemo(
    () => allTransactions.filter((tx) => tx.type === 'order'),
    [allTransactions],
  );

  const fundingTransactions = useMemo(
    () => allTransactions.filter((tx) => tx.type === 'funding'),
    [allTransactions],
  );

  const depositWithdrawalTransactions = useMemo(
    () =>
      allTransactions.filter(
        (tx) => tx.type === 'deposit' || tx.type === 'withdrawal',
      ),
    [allTransactions],
  );

  // Memoized grouped transactions to avoid recalculation on every filter change
  const allGroupedTransactions = useMemo(() => {
    const grouped = {
      Trades: groupTransactionsByDate(fillTransactions),
      Orders: groupTransactionsByDate(orderTransactions),
      Funding: groupTransactionsByDate(fundingTransactions),
      Deposits: groupTransactionsByDate(depositWithdrawalTransactions),
    };

    return grouped;
  }, [
    fillTransactions,
    orderTransactions,
    fundingTransactions,
    depositWithdrawalTransactions,
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
      // Refresh all transaction data from single source
      await refreshTransactions();
    } catch (error) {
      console.warn('Failed to refresh transaction data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [isConnected, refreshTransactions]);

  // Initial loading is handled by the hooks themselves

  const renderFilterTab = useCallback(
    (tab: FilterTab, index: number) => {
      const isActive = activeFilter === tab;

      // Convert tab to i18n key
      const i18nKeys = ['trades', 'orders', 'funding', 'deposits'];
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
        <ButtonFilter
          key={tab}
          isActive={isActive}
          size={ButtonSize.Md}
          onPress={handleTabPress}
          accessibilityRole="button"
        >
          {strings(`perps.transactions.tabs.${i18nKey}`)}
        </ButtonFilter>
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
      <TabEmptyState
        description={strings('perps.transactions.empty_state.no_transactions', {
          type: activeFilter.toLowerCase(),
        })}
      ></TabEmptyState>
    </View>
  );

  const filterTabs: FilterTab[] = ['Trades', 'Orders', 'Funding', 'Deposits'];

  const filterTabDescription = useMemo(() => {
    if (activeFilter === 'Funding') {
      return strings('perps.transactions.tabs.funding_description');
    }
    return null;
  }, [activeFilter]);

  // Determine if we should show loading skeleton
  const isInitialLoading = useMemo(
    () =>
      // Show loading if we're connecting or if transaction data is loading
      isConnecting || transactionsLoading,
    [isConnecting, transactionsLoading],
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
