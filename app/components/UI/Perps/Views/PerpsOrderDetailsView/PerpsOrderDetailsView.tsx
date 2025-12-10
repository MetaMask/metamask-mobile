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
import type { Order } from '../../controllers/types';
import styleSheet from './PerpsOrderDetailsView.styles';
import PerpsTokenLogo from '../../components/PerpsTokenLogo';
import {
  formatPerpsFiat,
  formatPositionSize,
  formatOrderCardDate,
} from '../../utils/formatUtils';
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

    const isLong = order.side === 'buy';
    const directionLabel = isLong
      ? strings('perps.order.long_label')
      : strings('perps.order.short_label');
    const orderTypeLabel = strings(
      `perps.order_details.${order.orderType}_${order.side}`,
    );

    // Calculate fill percentage
    const fillPercentage =
      parseFloat(order.originalSize) > 0
        ? (parseFloat(order.filledSize) / parseFloat(order.originalSize)) * 100
        : 0;

    // Calculate size in USD (size * price)
    const orderSizeUSD = parseFloat(order.size) * parseFloat(order.price);

    // Format date using formatOrderCardDate
    const dateString = formatOrderCardDate(order.timestamp);

    return {
      isLong,
      directionLabel,
      orderTypeLabel,
      fillPercentage,
      sizeInUSD: orderSizeUSD,
      dateString,
      directionColor: isLong ? colors.success.default : colors.error.default,
    };
  }, [order, colors]);

  const handleCancelOrder = useCallback(async () => {
    if (!order) return;

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
        coin: order.symbol,
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
  }, [order, cancelOrder, navigation, showToast, PerpsToastOptions]);

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

            {/* Limit Price */}
            <View style={styles.detailRow}>
              <Text
                variant={TextVariant.BodyMD}
                color={TextColor.Alternative}
                style={styles.detailLabel}
              >
                {strings('perps.order_details.limit_price')}
              </Text>
              <View style={styles.detailValue}>
                <Text variant={TextVariant.BodyMD}>
                  {formatPerpsFiat(parseFloat(order.price))}
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
                  {formatPositionSize(parseFloat(order.size))} {order.symbol} •{' '}
                  {formatPerpsFiat(orderDetails.sizeInUSD)}
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
    </SafeAreaView>
  );
};

export default PerpsOrderDetailsView;
