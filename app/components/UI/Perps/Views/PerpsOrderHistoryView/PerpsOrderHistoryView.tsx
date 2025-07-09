import React, { useState, useMemo, useCallback } from 'react';
import { SafeAreaView, ScrollView, RefreshControl, View, TouchableOpacity } from 'react-native';
import { useNavigation, type NavigationProp, type ParamListBase } from '@react-navigation/native';
import { IconColor, IconName } from '../../../../../component-library/components/Icons/Icon';
import Text from '../../../../../component-library/components/Texts/Text';
import ButtonIcon, { ButtonIconSizes } from '../../../../../component-library/components/Buttons/ButtonIcon';
import { useTheme } from '../../../../../util/theme';
import { usePerpsOrderHistory } from '../../hooks';
import PerpsOrderHistoryCard from '../../components/PerpsOrderHistoryCard';
import { createStyles } from './PerpsOrderHistoryView.styles';

type FilterType = 'all' | 'filled' | 'failed' | 'pending';

const PerpsOrderHistoryView: React.FC = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  const orderHistory = usePerpsOrderHistory();
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter options - memoized to avoid re-creation on every render
  const filterOptions = useMemo(() => [
    { value: 'all' as FilterType, label: 'All' },
    { value: 'filled' as FilterType, label: 'Filled' },
    { value: 'failed' as FilterType, label: 'Failed' },
    { value: 'pending' as FilterType, label: 'Pending' },
  ], []);

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

  const handleFilterPress = useCallback((filter: FilterType) => {
    setSelectedFilter(filter);
  }, []);

  const renderFilterButtons = useCallback(() => (
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
  ), [styles, selectedFilter, filterOptions, handleFilterPress]);

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

  const renderContent = useCallback(() => {
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
  }, [filteredOrders, selectedFilter, styles]);

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
