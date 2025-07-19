import React, { useCallback } from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import {
  useNavigation,
  useRoute,
  type NavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import type { PerpsNavigationParamList } from '../controllers/types';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../component-library/components/Texts/Text';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../component-library/components/Buttons/Button';
import { useTheme } from '../../../../util/theme';
import type { Colors } from '../../../../util/theme/models';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import { formatPrice } from '../utils/formatUtils';

interface OrderSuccessParams {
  asset: string;
  direction: 'long' | 'short';
  size: string; // Changed from amount to match what's passed
  price?: string;
  leverage?: number;
  takeProfitPrice?: string;
  stopLossPrice?: string;
  orderId?: string;
}

type OrderSuccessRoute = RouteProp<
  { OrderSuccess: OrderSuccessParams },
  'OrderSuccess'
>;

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    content: {
      flex: 1,
      padding: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
    successIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.success.default,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
    },
    successIconText: {
      fontSize: 40,
      color: colors.background.default,
    },
    title: {
      marginBottom: 12,
      textAlign: 'center',
    },
    subtitle: {
      textAlign: 'center',
      marginBottom: 32,
    },
    orderDetails: {
      backgroundColor: colors.background.alternative,
      borderRadius: 12,
      padding: 20,
      marginBottom: 32,
      width: '100%',
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
    },
    detailLabel: {
      color: colors.text.muted,
    },
    detailValue: {
      fontWeight: '600',
    },
    directionText: {
      textTransform: 'capitalize',
    },
    buttonContainer: {
      width: '100%',
      gap: 16,
    },
  });

const PerpsOrderSuccessView: React.FC = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const route = useRoute<OrderSuccessRoute>();

  const {
    asset,
    direction,
    size,
    leverage,
    takeProfitPrice,
    stopLossPrice,
    orderId,
  } = route.params || {
    asset: 'BTC',
    direction: 'long' as const,
    size: '400',
    leverage: 10,
    takeProfitPrice: undefined,
    stopLossPrice: undefined,
    orderId: undefined,
  };

  const handleViewPositions = useCallback(() => {
    navigation.navigate(Routes.PERPS.POSITIONS);
  }, [navigation]);

  const handleBackToPerps = useCallback(() => {
    navigation.navigate(Routes.PERPS.TRADING_VIEW);
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Success Icon */}
        <View style={styles.successIcon}>
          <Text style={styles.successIconText}>✓</Text>
        </View>

        {/* Title and Subtitle */}
        <Text
          variant={TextVariant.HeadingLG}
          color={TextColor.Default}
          style={styles.title}
        >
          {strings('perps.order.success.title')}
        </Text>
        <Text
          variant={TextVariant.BodyMD}
          color={TextColor.Muted}
          style={styles.subtitle}
        >
          {strings('perps.order.success.subtitle', { direction, asset })}
        </Text>

        {/* Order Details */}
        <View style={styles.orderDetails}>
          <View style={styles.detailRow}>
            <Text variant={TextVariant.BodyMD} style={styles.detailLabel}>
              {strings('perps.order.success.asset')}
            </Text>
            <Text variant={TextVariant.BodyMD} style={styles.detailValue}>
              {asset}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text variant={TextVariant.BodyMD} style={styles.detailLabel}>
              {strings('perps.order.success.direction')}
            </Text>
            <Text
              variant={TextVariant.BodyMD}
              style={[
                styles.detailValue,
                styles.directionText,
                {
                  color:
                    direction === 'long'
                      ? colors.success.default
                      : colors.error.default,
                },
              ]}
            >
              {direction}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text variant={TextVariant.BodyMD} style={styles.detailLabel}>
              {strings('perps.order.success.amount')}
            </Text>
            <Text variant={TextVariant.BodyMD} style={styles.detailValue}>
              ${size}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text variant={TextVariant.BodyMD} style={styles.detailLabel}>
              {strings('perps.order.leverage')}
            </Text>
            <Text variant={TextVariant.BodyMD} style={styles.detailValue}>
              {leverage}x
            </Text>
          </View>

          {takeProfitPrice && (
            <View style={styles.detailRow}>
              <Text variant={TextVariant.BodyMD} style={styles.detailLabel}>
                {strings('perps.order.take_profit')}
              </Text>
              <Text variant={TextVariant.BodyMD} style={styles.detailValue}>
                {formatPrice(takeProfitPrice)}
              </Text>
            </View>
          )}

          {stopLossPrice && (
            <View style={styles.detailRow}>
              <Text variant={TextVariant.BodyMD} style={styles.detailLabel}>
                {strings('perps.order.stop_loss')}
              </Text>
              <Text variant={TextVariant.BodyMD} style={styles.detailValue}>
                {formatPrice(stopLossPrice)}
              </Text>
            </View>
          )}

          {orderId && (
            <View style={styles.detailRow}>
              <Text variant={TextVariant.BodyMD} style={styles.detailLabel}>
                {strings('perps.order.success.orderId')}
              </Text>
              <Text variant={TextVariant.BodySM} style={styles.detailValue}>
                {orderId.slice(0, 8)}...
              </Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <Button
            variant={ButtonVariants.Primary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            label={strings('perps.order.success.viewPositions')}
            onPress={handleViewPositions}
          />

          <Button
            variant={ButtonVariants.Secondary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            label={strings('perps.order.success.backToPerps')}
            onPress={handleBackToPerps}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

export default PerpsOrderSuccessView;
