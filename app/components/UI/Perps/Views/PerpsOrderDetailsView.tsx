import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, View, Alert, TextInput } from 'react-native';
import { useNavigation, useRoute, type NavigationProp, type ParamListBase, type RouteProp } from '@react-navigation/native';
import { IconColor, IconName } from '../../../../component-library/components/Icons/Icon';
import Text from '../../../../component-library/components/Texts/Text';
import Button, { ButtonVariants, ButtonSize } from '../../../../component-library/components/Buttons/Button';
import ButtonIcon, { ButtonIconSizes } from '../../../../component-library/components/Buttons/ButtonIcon';
import { useTheme } from '../../../../util/theme';
import type { Colors } from '../../../../util/theme/models';
import { usePerpsTrading } from '../hooks';
import type { OrderResult, CancelOrderParams } from '../controllers/types';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import { triggerSuccessHaptic, triggerErrorHaptic } from '../utils/hapticUtils';

interface OrderDetailsRouteParams {
  order: OrderResult;
  action?: 'cancel' | 'edit';
}

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
    orderHeader: {
      backgroundColor: colors.background.alternative,
      margin: 16,
      borderRadius: 12,
      padding: 16,
    },
    orderInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    orderId: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text.default,
      marginRight: 12,
    },
    statusBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
    },
    successBadge: {
      backgroundColor: colors.success.muted,
    },
    failedBadge: {
      backgroundColor: colors.error.muted,
    },
    pendingBadge: {
      backgroundColor: colors.warning.muted,
    },
    statusText: {
      fontSize: 14,
      fontWeight: '600',
      textTransform: 'uppercase',
    },
    successText: {
      color: colors.success.default,
    },
    failedText: {
      color: colors.error.default,
    },
    pendingText: {
      color: colors.warning.default,
    },
    detailsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: 16,
    },
    detailCard: {
      width: '48%',
      backgroundColor: colors.background.default,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      marginHorizontal: '1%',
      borderWidth: 1,
      borderColor: colors.border.muted,
    },
    detailLabel: {
      fontSize: 12,
      color: colors.text.muted,
      marginBottom: 6,
    },
    detailValue: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text.default,
    },
    actionsSection: {
      margin: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text.default,
      marginBottom: 16,
    },
    editSection: {
      backgroundColor: colors.background.alternative,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    inputContainer: {
      marginBottom: 16,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.default,
      marginBottom: 8,
    },
    textInput: {
      borderWidth: 1,
      borderColor: colors.border.muted,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: colors.text.default,
      backgroundColor: colors.background.default,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 12,
    },
    button: {
      flex: 1,
    },
    cancelButton: {
      backgroundColor: colors.error.default,
    },
    errorContainer: {
      backgroundColor: colors.error.muted,
      borderRadius: 8,
      padding: 16,
      marginBottom: 16,
    },
    errorText: {
      fontSize: 14,
      color: colors.error.default,
      textAlign: 'center',
    },
    warningContainer: {
      backgroundColor: colors.warning.muted,
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
    },
    spacer: {
      width: 32,
    },
    warningText: {
      fontSize: 14,
      color: colors.warning.default,
      textAlign: 'center',
      lineHeight: 20,
    },
    readOnlyContainer: {
      backgroundColor: colors.background.alternative,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    readOnlyText: {
      fontSize: 14,
      color: colors.text.muted,
      textAlign: 'center',
      fontStyle: 'italic',
    },
  });

const PerpsOrderDetailsView: React.FC = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<{ params: OrderDetailsRouteParams }, 'params'>>();

  const { order, action } = route.params || {};
  const { cancelOrder } = usePerpsTrading();

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(action === 'edit');

  // Edit form state
  const [editPrice, setEditPrice] = useState('');
  const [editSize, setEditSize] = useState('');

  // Extract coin from order (this is a helper function)
  function extractCoinFromOrder(_orderParam: OrderResult): string {
    // Since OrderResult doesn't have coin info, we'd need to enhance the type
    // For now, we'll return a default or extract from orderId if it contains coin info
    return 'BTC'; // Placeholder - would need proper implementation
  }

  // Determine order status
  const getOrderStatus = useCallback(() => {
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

  }, [order, styles]);

  const orderStatus = getOrderStatus();

  // Check if this order is still pending (editable/cancelable)
  const isPendingOrder = !order.success && !order.error && order.orderId;
  const canEdit = isPendingOrder;
  const canCancel = isPendingOrder;

  // Format currency values
  const formatCurrency = useCallback((value: string | undefined) => {
    if (!value) return 'N/A';
    const num = parseFloat(value);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(num);
  }, []);

  // Format size/quantity
  const formatSize = useCallback((value: string | undefined) => {
    if (!value) return 'N/A';
    const num = parseFloat(value);
    return num.toFixed(6);
  }, []);

  // Initialize edit form when entering edit mode
  useEffect(() => {
    if (isEditing && order.averagePrice && order.filledSize) {
      setEditPrice(order.averagePrice);
      setEditSize(order.filledSize);
    }
  }, [isEditing, order]);

  // Handle order cancellation
  const handleCancelOrder = useCallback(async () => {
    if (!order.orderId) {
      setError('Order ID not available for cancellation');
      return;
    }

    Alert.alert(
      'Cancel Order',
      `Are you sure you want to cancel this order?\n\nOrder ID: ${order.orderId.slice(0, 8)}...\n\nThis action cannot be undone.`,
      [
        {
          text: 'Keep Order',
          style: 'cancel',
        },
        {
          text: 'Cancel Order',
          style: 'destructive',
          onPress: async () => {
            setIsProcessing(true);
            setError(null);

            try {
              DevLogger.log('PerpsOrderDetails: Canceling order', {
                orderId: order.orderId,
              });

              const cancelParams: CancelOrderParams = {
                orderId: order.orderId || '',
                coin: extractCoinFromOrder(order), // Would need proper implementation
              };

              const result = await cancelOrder(cancelParams);

              if (result.success) {
                DevLogger.log('PerpsOrderDetails: Order cancelled successfully', result);
                await triggerSuccessHaptic();

                Alert.alert(
                  'Order Cancelled',
                  `Your order has been cancelled successfully.`,
                  [
                    {
                      text: 'OK',
                      onPress: () => navigation.goBack(),
                    },
                  ]
                );
              } else {
                throw new Error(result.error || 'Failed to cancel order');
              }
            } catch (err) {
              const errorMessage = err instanceof Error ? err.message : 'Failed to cancel order';
              setError(errorMessage);
              DevLogger.log('PerpsOrderDetails: Error canceling order', err);
              await triggerErrorHaptic();
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  }, [order, cancelOrder, navigation]);

  // Handle order edit
  const handleEditOrder = useCallback(async () => {
    if (!order.orderId) {
      setError('Order ID not available for editing');
      return;
    }

    if (!editPrice || !editSize) {
      setError('Please fill in all required fields');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // TODO: Implement order editing functionality when available in PerpsController
      DevLogger.log('PerpsOrderDetails: Edit order not yet implemented', {
        orderId: order.orderId,
        newPrice: editPrice,
        newSize: editSize,
      });

      await triggerErrorHaptic();
      setError('Order editing is not yet implemented');
      setIsEditing(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to edit order';
      setError(errorMessage);
      DevLogger.log('PerpsOrderDetails: Error editing order', err);
      await triggerErrorHaptic();
    } finally {
      setIsProcessing(false);
    }
  }, [order, editPrice, editSize]);

  const handleBackPress = () => {
    navigation.goBack();
  };

  // Order details data
  const orderDetails = useMemo(() => [
    { label: 'Order ID', value: order.orderId ? `#${order.orderId.slice(0, 8)}...` : 'N/A' },
    { label: 'Status', value: orderStatus.status.charAt(0).toUpperCase() + orderStatus.status.slice(1) },
    { label: 'Filled Size', value: formatSize(order.filledSize) },
    { label: 'Average Price', value: formatCurrency(order.averagePrice) },
    { label: 'Success', value: order.success ? 'Yes' : 'No' },
    { label: 'Error', value: order.error || 'None' },
  ], [order, orderStatus, formatSize, formatCurrency]);

  if (!order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Order data not found. Please go back and try again.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ButtonIcon
          iconName={IconName.ArrowLeft}
          iconColor={IconColor.Default}
          size={ButtonIconSizes.Md}
          onPress={handleBackPress}
        />
        <Text style={styles.headerTitle}>Order Details</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView style={styles.container}>
        {/* Order Header */}
        <View style={styles.orderHeader}>
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
        </View>

        {/* Order Details Grid */}
        <View style={styles.detailsGrid}>
          {orderDetails.map((detail, index) => (
            <View key={index} style={styles.detailCard}>
              <Text style={styles.detailLabel}>{detail.label}</Text>
              <Text style={styles.detailValue}>{detail.value}</Text>
            </View>
          ))}
        </View>

        {/* Actions Section */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Order Actions</Text>

          {!canEdit && !canCancel ? (
            <View style={styles.readOnlyContainer}>
              <Text style={styles.readOnlyText}>
                This order is {orderStatus.status} and cannot be modified.
              </Text>
            </View>
          ) : (
            <>
              {isEditing ? (
                <View style={styles.editSection}>
                  <View style={styles.warningContainer}>
                    <Text style={styles.warningText}>
                      ⚠️ Editing will cancel the current order and place a new one with the updated parameters.
                    </Text>
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>New Price</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editPrice}
                      onChangeText={setEditPrice}
                      placeholder="Enter new price..."
                      keyboardType="decimal-pad"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>New Size</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editSize}
                      onChangeText={setEditSize}
                      placeholder="Enter new size..."
                      keyboardType="decimal-pad"
                    />
                  </View>

                  {error && (
                    <View style={styles.errorContainer}>
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  )}

                  <View style={styles.buttonRow}>
                    <Button
                      variant={ButtonVariants.Secondary}
                      size={ButtonSize.Lg}
                      label="Cancel Edit"
                      onPress={() => setIsEditing(false)}
                      style={styles.button}
                    />
                    <Button
                      variant={ButtonVariants.Primary}
                      size={ButtonSize.Lg}
                      label="Update Order"
                      onPress={handleEditOrder}
                      loading={isProcessing}
                      style={styles.button}
                    />
                  </View>
                </View>
              ) : (
                <View style={styles.editSection}>
                  {error && (
                    <View style={styles.errorContainer}>
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  )}

                  <View style={styles.buttonRow}>
                    {canEdit && (
                      <Button
                        variant={ButtonVariants.Secondary}
                        size={ButtonSize.Lg}
                        label="Edit Order"
                        onPress={() => setIsEditing(true)}
                        style={styles.button}
                      />
                    )}
                    {canCancel && (
                      <Button
                        variant={ButtonVariants.Primary}
                        size={ButtonSize.Lg}
                        label="Cancel Order"
                        onPress={handleCancelOrder}
                        loading={isProcessing}
                        style={[styles.button, styles.cancelButton]}
                      />
                    )}
                  </View>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PerpsOrderDetailsView;
