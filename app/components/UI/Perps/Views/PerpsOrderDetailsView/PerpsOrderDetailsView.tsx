import React, { useCallback, useMemo, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useStyles } from '../../../../../component-library/hooks';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Button, {
  ButtonVariants,
  ButtonWidthTypes,
  ButtonSize,
} from '../../../../../component-library/components/Buttons/Button';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../component-library/components/Buttons/ButtonIcon';
import {
  IconColor,
  IconName,
} from '../../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../../locales/i18n';
import { usePerpsTrading } from '../../hooks/usePerpsTrading';
import { usePerpsMeasurement } from '../../hooks/usePerpsMeasurement';
import { usePerpsOrderFees } from '../../hooks/usePerpsOrderFees';
import usePerpsToasts from '../../hooks/usePerpsToasts';
import { TraceName } from '../../../../../util/trace';
import { type Order } from '@metamask/perps-controller';
import styleSheet from './PerpsOrderDetailsView.styles';
import PerpsTokenLogo from '../../components/PerpsTokenLogo';
import {
  formatPerpsFiat,
  formatPositionSize,
  formatOrderCardDate,
} from '../../utils/formatUtils';
import {
  formatOrderLabel,
  isSyntheticOrderCancelable,
} from '../../utils/orderUtils';
import { useTheme } from '../../../../../util/theme';

interface OrderDetailsRouteParams {
  order: Order;
}

const PerpsOrderDetailsView: React.FC = () => {
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<{ params: OrderDetailsRouteParams }, 'params'>>();
  const { order } = route.params || {};
  const { styles } = useStyles(styleSheet, {});
  const { colors } = useTheme();
  const { cancelOrder } = usePerpsTrading();
  const { showToast, PerpsToastOptions } = usePerpsToasts();

  const [isCanceling, setIsCanceling] = useState(false);
  const canCancel = useMemo(
    () => (order ? isSyntheticOrderCancelable(order) : false),
    [order],
  );

  // Calculate size in USD for fee calculation
  const sizeInUSD = useMemo(() => {
    if (!order) return '0';
    return (parseFloat(order.size) * parseFloat(order.price)).toString();
  }, [order]);

  // Get order fees
  const { totalFee } = usePerpsOrderFees({
    orderType: order?.orderType ?? 'market',
    amount: sizeInUSD,
  });

  // Add performance measurement
  usePerpsMeasurement({
    traceName: TraceName.PerpsOrderDetailsView,
    conditions: [!!order],
  });

  // Handle back button press
  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Calculate order details
  const orderDetails = useMemo(() => {
    if (!order) return null;

    const orderTypeLabel = formatOrderLabel(order);

    // Calculate fill percentage
    const fillPercentage =
      parseFloat(order.originalSize) > 0
        ? (parseFloat(order.filledSize) / parseFloat(order.originalSize)) * 100
        : 0;

    const parsedPrice = parseFloat(order.price || '0');
    const parsedTriggerPrice = parseFloat(order.triggerPrice || '0');
    const hasTriggerPrice =
      Number.isFinite(parsedTriggerPrice) && parsedTriggerPrice > 0;
    const hasPrice = Number.isFinite(parsedPrice) && parsedPrice > 0;
    const priceForValue = hasTriggerPrice
      ? parsedTriggerPrice
      : hasPrice
        ? parsedPrice
        : 0;

    const originalSizeUSD = parseFloat(order.originalSize) * priceForValue;

    const isMarketExecution =
      order.orderType === 'market' ||
      (order.detailedOrderType || '').toLowerCase().includes('market');

    const priceText = isMarketExecution
      ? strings('perps.order_details.market')
      : formatPerpsFiat(hasTriggerPrice ? parsedTriggerPrice : parsedPrice);

    let triggerCondition: string | undefined;
    if (order.isTrigger && hasTriggerPrice) {
      const detailedOrderType = (order.detailedOrderType || '').toLowerCase();
      const formattedTriggerPrice = formatPerpsFiat(parsedTriggerPrice);

      if (detailedOrderType.includes('take profit')) {
        triggerCondition = strings('perps.order_details.price_above', {
          price: formattedTriggerPrice,
        });
      } else if (detailedOrderType.includes('stop')) {
        triggerCondition = strings('perps.order_details.price_below', {
          price: formattedTriggerPrice,
        });
      } else {
        const fallbackConditionKey =
          order.side === 'sell'
            ? 'perps.order_details.price_above'
            : 'perps.order_details.price_below';
        triggerCondition = strings(fallbackConditionKey, {
          price: formattedTriggerPrice,
        });
      }
    }

    // Format date using formatOrderCardDate
    const dateString = formatOrderCardDate(order.timestamp);

    return {
      orderTypeLabel,
      fillPercentage,
      originalSizeInUSD: originalSizeUSD,
      dateString,
      triggerCondition,
      priceText,
      reduceOnlyText: order.reduceOnly
        ? strings('perps.order_details.yes')
        : strings('perps.order_details.no'),
    };
  }, [order]);

  const handleCancelOrder = useCallback(async () => {
    if (!order || !canCancel) return;

    setIsCanceling(true);

    // Show in-progress toast
    showToast(
      PerpsToastOptions.orderManagement.shared.cancellationInProgress(
        order.side === 'buy' ? 'long' : 'short',
        order.size,
        order.symbol,
        order.orderType,
      ),
    );

    try {
      const result = await cancelOrder({
        orderId: order.orderId,
        symbol: order.symbol,
      });

      // Show success/failure toast
      if (result.success) {
        showToast(
          PerpsToastOptions.orderManagement.shared.cancellationSuccess(
            order.reduceOnly,
            order.orderType,
            order.side === 'buy' ? 'long' : 'short',
            order.size,
            order.symbol,
          ),
        );
        navigation.goBack();
      } else {
        showToast(PerpsToastOptions.orderManagement.shared.cancellationFailed);
      }
    } catch (error) {
      showToast(PerpsToastOptions.orderManagement.shared.cancellationFailed);
    } finally {
      setIsCanceling(false);
    }
  }, [order, canCancel, cancelOrder, navigation, showToast, PerpsToastOptions]);

  if (!order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text variant={TextVariant.BodyMD} color={TextColor.Error}>
            {strings('perps.errors.order_not_found')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!orderDetails) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with back button */}
      <View style={styles.header}>
        <View style={styles.headerBackButton}>
          <ButtonIcon
            iconName={IconName.ArrowLeft}
            iconColor={IconColor.Default}
            size={ButtonIconSizes.Md}
            onPress={handleBack}
          />
        </View>
        <View style={styles.headerTitleContainer}>
          <Text variant={TextVariant.HeadingSM} color={TextColor.Default}>
            {orderDetails.orderTypeLabel}
          </Text>
        </View>
      </View>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.assetLogoContainer}>
            <PerpsTokenLogo symbol={order.symbol} size={48} />
          </View>
          <Text variant={TextVariant.HeadingLG} style={styles.assetName}>
            {order.symbol}
          </Text>
        </View>

        {/* Order Details Card */}
        <View style={styles.section}>
          <View style={styles.detailsCard}>
            {/* Date */}
            <View style={styles.detailRow}>
              <Text
                variant={TextVariant.BodyMD}
                color={TextColor.Alternative}
                style={styles.detailLabel}
              >
                {strings('perps.order_details.date')}
              </Text>
              <View style={styles.detailValue}>
                <Text variant={TextVariant.BodyMD}>
                  {orderDetails.dateString}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.separator,
                { backgroundColor: colors.border.muted },
              ]}
            />

            {/* Trigger condition */}
            {orderDetails.triggerCondition && (
              <>
                <View style={styles.detailRow}>
                  <Text
                    variant={TextVariant.BodyMD}
                    color={TextColor.Alternative}
                    style={styles.detailLabel}
                  >
                    {strings('perps.order_details.trigger_condition')}
                  </Text>
                  <View style={styles.detailValue}>
                    <Text variant={TextVariant.BodyMD}>
                      {orderDetails.triggerCondition}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.separator,
                    { backgroundColor: colors.border.muted },
                  ]}
                />
              </>
            )}

            {/* Price */}
            <View style={styles.detailRow}>
              <Text
                variant={TextVariant.BodyMD}
                color={TextColor.Alternative}
                style={styles.detailLabel}
              >
                {strings('perps.order_details.price')}
              </Text>
              <View style={styles.detailValue}>
                <Text variant={TextVariant.BodyMD}>
                  {orderDetails.priceText}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.separator,
                { backgroundColor: colors.border.muted },
              ]}
            />

            {/* Size */}
            <View style={styles.detailRow}>
              <Text
                variant={TextVariant.BodyMD}
                color={TextColor.Alternative}
                style={styles.detailLabel}
              >
                {strings('perps.order_details.size')}
              </Text>
              <View style={styles.detailValue}>
                <Text variant={TextVariant.BodyMD}>
                  {formatPositionSize(parseFloat(order.size))} {order.symbol}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.separator,
                { backgroundColor: colors.border.muted },
              ]}
            />

            {/* Original size */}
            <View style={styles.detailRow}>
              <Text
                variant={TextVariant.BodyMD}
                color={TextColor.Alternative}
                style={styles.detailLabel}
              >
                {strings('perps.order_details.original_size')}
              </Text>
              <View style={styles.detailValue}>
                <Text variant={TextVariant.BodyMD}>
                  {formatPositionSize(parseFloat(order.originalSize))}{' '}
                  {order.symbol}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.separator,
                { backgroundColor: colors.border.muted },
              ]}
            />

            {/* Order value */}
            <View style={styles.detailRow}>
              <Text
                variant={TextVariant.BodyMD}
                color={TextColor.Alternative}
                style={styles.detailLabel}
              >
                {strings('perps.order_details.order_value')}
              </Text>
              <View style={styles.detailValue}>
                <Text variant={TextVariant.BodyMD}>
                  {formatPerpsFiat(orderDetails.originalSizeInUSD)}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.separator,
                { backgroundColor: colors.border.muted },
              ]}
            />

            {/* Reduce only */}
            <View style={styles.detailRow}>
              <Text
                variant={TextVariant.BodyMD}
                color={TextColor.Alternative}
                style={styles.detailLabel}
              >
                {strings('perps.order_details.reduce_only')}
              </Text>
              <View style={styles.detailValue}>
                <Text variant={TextVariant.BodyMD}>
                  {orderDetails.reduceOnlyText}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.separator,
                { backgroundColor: colors.border.muted },
              ]}
            />

            {/* Fee */}
            <View style={styles.detailRow}>
              <Text
                variant={TextVariant.BodyMD}
                color={TextColor.Alternative}
                style={styles.detailLabel}
              >
                {strings('perps.order_details.fee')}
              </Text>
              <View style={styles.detailValue}>
                <Text variant={TextVariant.BodyMD}>
                  {formatPerpsFiat(totalFee)}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.separator,
                { backgroundColor: colors.border.muted },
              ]}
            />

            {/* Status */}
            <View style={styles.detailRow}>
              <Text
                variant={TextVariant.BodyMD}
                color={TextColor.Alternative}
                style={styles.detailLabel}
              >
                {strings('perps.order_details.status')}
              </Text>
              <View style={styles.detailValue}>
                <View style={styles.statusContainer}>
                  {orderDetails.fillPercentage > 0 && (
                    <View style={styles.statusFilled}>
                      <Text
                        variant={TextVariant.BodySM}
                        color={TextColor.Success}
                      >
                        {Math.round(orderDetails.fillPercentage)}% filled
                      </Text>
                    </View>
                  )}
                  {orderDetails.fillPercentage === 0 && (
                    <Text variant={TextVariant.BodyMD}>
                      {strings('perps.order_details.open')}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer Actions */}
      {canCancel ? (
        <View style={styles.footer}>
          <Button
            variant={ButtonVariants.Secondary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            label={strings('perps.order_details.cancel_order')}
            onPress={handleCancelOrder}
            loading={isCanceling}
          />
        </View>
      ) : null}
    </SafeAreaView>
  );
};

export default PerpsOrderDetailsView;
