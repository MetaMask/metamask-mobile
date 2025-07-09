import { useNavigation, type NavigationProp } from '@react-navigation/native';
import React from 'react';
import { TouchableOpacity, View, type GestureResponderEvent } from 'react-native';
import ButtonIcon, { ButtonIconSizes } from '../../../../../component-library/components/Buttons/ButtonIcon';
import { IconColor, IconName } from '../../../../../component-library/components/Icons/Icon';
import Text from '../../../../../component-library/components/Texts/Text';
import { useTheme } from '../../../../../util/theme';
import { OrderResult } from '../../controllers';
import type { PerpsNavigationParamList } from '../../types/navigation';
import { triggerSelectionHaptic } from '../../utils/hapticUtils';
import { createStyles } from './PerpsOrderHistoryCard.styles';

interface PerpsOrderHistoryCardProps {
  order: OrderResult;
  onCancel?: (order: OrderResult) => void;
  onEdit?: (order: OrderResult) => void;
}


const PerpsOrderHistoryCard: React.FC<PerpsOrderHistoryCardProps> = ({
  order,
  onCancel,
  onEdit,
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();

  // Determine order status and styling
  const getOrderStatus = () => {
    if (order.success) {
      return {
        status: 'filled',
        badgeStyle: styles.successBadge,
        textStyle: styles.successText,
      };
    } else if (order.error) {
      return {
        status: 'failed',
        badgeStyle: styles.failedBadge,
        textStyle: styles.failedText,
      };
    }
    return {
      status: 'pending',
      badgeStyle: styles.pendingBadge,
      textStyle: styles.pendingText,
    };

  };

  const orderStatus = getOrderStatus();

  // Format currency values
  const formatCurrency = (value: string | undefined) => {
    if (!value) return 'N/A';
    const num = parseFloat(value);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(num);
  };

  // Format size/quantity
  const formatSize = (value: string | undefined) => {
    if (!value) return 'N/A';
    const num = parseFloat(value);
    return num.toFixed(6);
  };

  // Format timestamp if available (this would need to be added to OrderResult type)
  const formatTimestamp = () =>
    // For now, return a placeholder as timestamp isn't in OrderResult type
    new Date().toLocaleString()
    ;

  const handleCardPress = async () => {
    await triggerSelectionHaptic();
    navigation.navigate('PerpsOrderDetails', {
      order,
      action: 'view'
    });
  };

  const handleCancelPress = async (event: GestureResponderEvent) => {
    event.stopPropagation();
    await triggerSelectionHaptic();
    if (onCancel) {
      onCancel(order);
    } else {
      // Navigate to order details with cancel action
      navigation.navigate('PerpsOrderDetails', {
        order,
        action: 'cancel'
      });
    }
  };

  const handleEditPress = async (event: GestureResponderEvent) => {
    event.stopPropagation();
    await triggerSelectionHaptic();
    if (onEdit) {
      onEdit(order);
    } else {
      // Navigate to order details with edit action
      navigation.navigate('PerpsOrderDetails', {
        order,
        action: 'edit'
      });
    }
  };

  // Show action buttons only for pending orders
  const showActions = !order.success && !order.error;

  return (
    <TouchableOpacity style={styles.container} onPress={handleCardPress}>
      <View style={styles.header}>
        <View style={styles.orderInfo}>
          <Text style={styles.orderId}>
            {order.orderId ? `#${order.orderId.slice(0, 8)}` : 'Order'}
          </Text>
          <View style={[styles.statusBadge, orderStatus.badgeStyle]}>
            <Text style={[styles.statusText, orderStatus.textStyle]}>
              {orderStatus.status}
            </Text>
          </View>
        </View>
        {showActions && (
          <View style={styles.actionsContainer}>
            <ButtonIcon
              iconName={IconName.Edit}
              iconColor={IconColor.Muted}
              size={ButtonIconSizes.Sm}
              onPress={handleEditPress}
            />
            <ButtonIcon
              iconName={IconName.Close}
              iconColor={IconColor.Error}
              size={ButtonIconSizes.Sm}
              onPress={handleCancelPress}
            />
          </View>
        )}
      </View>

      <View style={styles.detailsContainer}>
        <View style={styles.detailColumn}>
          <Text style={styles.detailLabel}>Filled Size</Text>
          <Text style={styles.detailValue}>
            {formatSize(order.filledSize)}
          </Text>
        </View>
        <View style={styles.detailColumn}>
          <Text style={styles.detailLabel}>Average Price</Text>
          <Text style={styles.detailValue}>
            {formatCurrency(order.averagePrice)}
          </Text>
        </View>
        <View style={styles.detailColumn}>
          <Text style={styles.detailLabel}>Status</Text>
          <Text style={[styles.detailValue, orderStatus.textStyle]}>
            {orderStatus.status.charAt(0).toUpperCase() + orderStatus.status.slice(1)}
          </Text>
        </View>
      </View>

      {/* Show error message if order failed */}
      {order.error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Error: {order.error}
          </Text>
        </View>
      )}

      {/* Timestamp */}
      <View style={styles.timestampContainer}>
        <Text style={styles.timestampText}>
          {formatTimestamp()}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default PerpsOrderHistoryCard;
