import React, { useState, useCallback } from 'react';
import { SafeAreaView, ScrollView, RefreshControl, View } from 'react-native';
import { useNavigation, type NavigationProp, type ParamListBase } from '@react-navigation/native';
import { IconColor, IconName } from '../../../../../component-library/components/Icons/Icon';
import Text from '../../../../../component-library/components/Texts/Text';
import ButtonIcon, { ButtonIconSizes } from '../../../../../component-library/components/Buttons/ButtonIcon';
import { useTheme } from '../../../../../util/theme';
import { usePerpsOrderFills } from '../../hooks';
import PerpsOrderHistoryCard from '../../components/PerpsOrderHistoryCard';
import { createStyles } from './PerpsOrderHistoryView.styles';


const PerpsOrderHistoryView: React.FC = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  const orderHistory = usePerpsOrderFills(100); // Last 100 fills
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };



  const renderOrdersSummary = () => (
    <View style={styles.summaryContainer}>
      <Text style={styles.summaryTitle}>Order Fills</Text>

      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Total Fills</Text>
        <Text style={styles.summaryValue}>{orderHistory.length}</Text>
      </View>
    </View>
  );

  const renderContent = useCallback(() => {
    if (orderHistory.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No Order Fills</Text>
          <Text style={styles.emptyDescription}>
            You haven't executed any trades yet.{'\n'}Start trading to see your order fills here.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.ordersSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Order Fills</Text>
          <Text style={styles.orderCount}>
            {orderHistory.length} fill{orderHistory.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Render fills in reverse chronological order (newest first) */}
        {[...orderHistory].reverse().map((order, index) => (
          <PerpsOrderHistoryCard
            key={`${order.orderId || 'unknown'}-${index}`}
            order={order}
          />
        ))}
      </View>
    );
  }, [orderHistory, styles]);

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
