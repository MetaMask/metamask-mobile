import React, { useState, useMemo } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, RefreshControl, View, TouchableOpacity } from 'react-native';
import { useNavigation, type NavigationProp, type ParamListBase } from '@react-navigation/native';
import { IconColor, IconName } from '../../../../component-library/components/Icons/Icon';
import Text from '../../../../component-library/components/Texts/Text';
import ButtonIcon, { ButtonIconSizes } from '../../../../component-library/components/Buttons/ButtonIcon';
import { useTheme } from '../../../../util/theme';
import type { Colors } from '../../../../util/theme/models';
import { usePerpsOrderHistory } from '../hooks';
import PerpsOrderHistoryCard from '../components/PerpsOrderHistoryCard';

type FilterType = 'all' | 'filled' | 'failed' | 'pending';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text.default,
    },
    filterContainer: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.background.alternative,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
    },
    filterButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      marginRight: 8,
      borderWidth: 1,
      borderColor: colors.border.muted,
      backgroundColor: colors.background.default,
    },
    filterButtonActive: {
      backgroundColor: colors.primary.default,
      borderColor: colors.primary.default,
    },
    filterButtonText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text.muted,
    },
    filterButtonTextActive: {
      color: colors.primary.inverse,
    },
    ordersSection: {
      flex: 1,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text.default,
    },
    orderCount: {
      fontSize: 14,
      color: colors.text.muted,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      paddingVertical: 64,
    },
    emptyIcon: {
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text.default,
      marginBottom: 8,
      textAlign: 'center',
    },
    emptyDescription: {
      fontSize: 14,
      color: colors.text.muted,
      textAlign: 'center',
      lineHeight: 20,
    },
    summaryContainer: {
      backgroundColor: colors.background.alternative,
      margin: 16,
      borderRadius: 12,
      padding: 16,
    },
    summaryTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text.default,
      marginBottom: 12,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    summaryLabel: {
      fontSize: 14,
      color: colors.text.muted,
    },
    summaryValue: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.default,
    },
    successValue: {
      color: colors.success.default,
    },
    errorValue: {
      color: colors.error.default,
    },
    headerPlaceholder: {
      width: 32,
    },
  });

const PerpsOrderHistoryView: React.FC = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  const orderHistory = usePerpsOrderHistory();
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter options
  const filterOptions: { value: FilterType; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'filled', label: 'Filled' },
    { value: 'failed', label: 'Failed' },
    { value: 'pending', label: 'Pending' },
  ];

  // Filter orders based on selected filter
  const filteredOrders = useMemo(() => {
    if (selectedFilter === 'all') {
      return orderHistory;
    }

    return orderHistory.filter(order => {
      switch (selectedFilter) {
        case 'filled':
          return order.success;
        case 'failed':
          return order.error;
        case 'pending':
          return !order.success && !order.error;
        default:
          return true;
      }
    });
  }, [orderHistory, selectedFilter]);

  // Calculate summary statistics
  const orderStats = useMemo(() => {
    const total = orderHistory.length;
    const filled = orderHistory.filter(order => order.success).length;
    const failed = orderHistory.filter(order => order.error).length;
    const pending = orderHistory.filter(order => !order.success && !order.error).length;

    return { total, filled, failed, pending };
  }, [orderHistory]);

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    // In a real implementation, you might want to trigger a data refresh
    // For now, just simulate a refresh
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  const handleFilterPress = (filter: FilterType) => {
    setSelectedFilter(filter);
  };

  const renderFilterButtons = () => (
    <View style={styles.filterContainer}>
      {filterOptions.map(option => (
        <TouchableOpacity
          key={option.value}
          style={[
            styles.filterButton,
            selectedFilter === option.value && styles.filterButtonActive,
          ]}
          onPress={() => handleFilterPress(option.value)}
        >
          <Text
            style={[
              styles.filterButtonText,
              selectedFilter === option.value && styles.filterButtonTextActive,
            ]}
          >
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderOrdersSummary = () => (
    <View style={styles.summaryContainer}>
      <Text style={styles.summaryTitle}>Order Statistics</Text>

      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Total Orders</Text>
        <Text style={styles.summaryValue}>{orderStats.total}</Text>
      </View>

      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Filled Orders</Text>
        <Text style={[styles.summaryValue, styles.successValue]}>
          {orderStats.filled}
        </Text>
      </View>

      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Failed Orders</Text>
        <Text style={[styles.summaryValue, styles.errorValue]}>
          {orderStats.failed}
        </Text>
      </View>

      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Pending Orders</Text>
        <Text style={styles.summaryValue}>{orderStats.pending}</Text>
      </View>
    </View>
  );

  const renderContent = () => {
    if (filteredOrders.length === 0) {
      const emptyMessage = selectedFilter === 'all'
        ? "You haven't placed any orders yet.\nStart trading to see your order history here."
        : `No ${selectedFilter} orders found.\nTry adjusting your filter or place some orders.`;

      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>
            {selectedFilter === 'all' ? 'No Order History' : `No ${selectedFilter.charAt(0).toUpperCase() + selectedFilter.slice(1)} Orders`}
          </Text>
          <Text style={styles.emptyDescription}>
            {emptyMessage}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.ordersSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {selectedFilter === 'all' ? 'Order History' : `${selectedFilter.charAt(0).toUpperCase() + selectedFilter.slice(1)} Orders`}
          </Text>
          <Text style={styles.orderCount}>
            {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Render orders in reverse chronological order (newest first) */}
        {[...filteredOrders].reverse().map((order, index) => (
          <PerpsOrderHistoryCard
            key={`${order.orderId || 'unknown'}-${index}`}
            order={order}
          />
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ButtonIcon
          iconName={IconName.ArrowLeft}
          iconColor={IconColor.Default}
          size={ButtonIconSizes.Md}
          onPress={handleBackPress}
        />
        <Text style={styles.headerTitle}>Order History</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {renderFilterButtons()}

      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary.default}
          />
        }
      >
        {orderHistory.length > 0 && renderOrdersSummary()}
        {renderContent()}
      </ScrollView>
    </SafeAreaView>
  );
};

export default PerpsOrderHistoryView;
