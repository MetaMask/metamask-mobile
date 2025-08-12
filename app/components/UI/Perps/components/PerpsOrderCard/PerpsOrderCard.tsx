import React, { useMemo } from 'react';
import { TouchableOpacity, View } from 'react-native';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import { useStyles } from '../../../../../component-library/hooks';
import { strings } from '../../../../../../locales/i18n';
import { DevLogger } from '../../../../../core/SDKConnect/utils/DevLogger';
import {
  formatPrice,
  formatPositionSize,
  formatTransactionDate,
} from '../../utils/formatUtils';
import styleSheet from './PerpsOrderCard.styles';
import { PerpsOrderCardSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import { usePerpsAssetMetadata } from '../../hooks/usePerpsAssetsMetadata';
import RemoteImage from '../../../../Base/RemoteImage';
import type {
  PerpsOrderCardProps,
  OrderCardDerivedData,
} from './PerpsOrderCard.types';
import BigNumber from 'bignumber.js';

/**
 * PerpsOrderCard Component
 *
 * Displays an individual perpetual futures order card with comprehensive order details.
 * This component is specifically designed for displaying OPEN orders (including partially filled)
 * from the HyperLiquid order book.
 *
 * Key Features:
 * - Shows order direction (long/short) with appropriate color coding
 * - Displays partially filled percentage as a chip (e.g., "50% filled")
 * - Shows limit/trigger price, take profit, and stop loss values
 * - Provides cancel functionality for open orders
 * - Supports both expanded and collapsed views
 *
 * Note: This component assumes all orders have 'open' status since it's used in the
 * pending orders context. Filled, canceled, or rejected orders are not handled as they
 * don't appear in the HyperLiquid frontendOpenOrders API response.
 *
 * @param order - The order object from HyperLiquid API
 * @param onCancel - Optional callback for order cancellation
 * @param disabled - Whether the card interactions are disabled
 * @param expanded - Whether to show detailed order information
 * @param showIcon - Whether to show the asset icon
 * @param rightAccessory - Optional component to render on the right side
 */
const PerpsOrderCard: React.FC<PerpsOrderCardProps> = ({
  order,
  onCancel,
  disabled = false,
  expanded = false,
  showIcon = false,
  rightAccessory,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const { assetUrl } = usePerpsAssetMetadata(order.symbol);

  // Derive order data for display
  const derivedData = useMemo<OrderCardDerivedData>(() => {
    const direction = order.side === 'buy' ? 'long' : 'short';

    // Calculate size in USD
    const sizeInUSD = BigNumber(order.originalSize)
      .multipliedBy(order.price)
      .toFixed(2);

    // Calculate fill percentage for partially filled orders
    const filledSize = BigNumber(order.filledSize || '0');
    const originalSize = BigNumber(order.originalSize);
    const fillPercentage = originalSize.isZero()
      ? 0
      : filledSize.dividedBy(originalSize).multipliedBy(100).toNumber();

    return {
      direction,
      sizeInUSD,
      fillPercentage,
    };
  }, [order]);

  const handleCardPress = async () => {
    DevLogger.log('PerpsOrderCard: Card pressed', { orderId: order.orderId });
    // Future: Navigate to order details when screen is available
    // For now, just log the interaction
  };

  const handleCancelPress = () => {
    DevLogger.log('PerpsOrderCard: Cancel button pressed', {
      orderId: order.orderId,
    });
    if (onCancel) {
      onCancel(order);
    } else {
      // Future: Navigate to order cancellation flow
      DevLogger.log('PerpsOrderCard: No onCancel handler provided');
    }
  };

  return (
    <TouchableOpacity
      style={expanded ? styles.expandedContainer : styles.collapsedContainer}
      onPress={handleCardPress}
      testID={PerpsOrderCardSelectorsIDs.CARD}
      disabled={disabled}
    >
      {/* Header - Always shown */}
      <View style={[styles.header, expanded && styles.headerExpanded]}>
        {/* Icon Section - Conditionally shown (only in collapsed mode) */}
        {showIcon && !expanded && (
          <View style={styles.perpIcon}>
            {assetUrl ? (
              <RemoteImage
                source={{ uri: assetUrl }}
                style={styles.tokenIcon}
              />
            ) : (
              <Icon name={IconName.Coin} size={IconSize.Lg} />
            )}
          </View>
        )}

        <View style={styles.headerLeft}>
          <View style={styles.headerRow}>
            {/* Show order type or direction */}
            <Text variant={TextVariant.BodySMMedium} color={TextColor.Default}>
              {order.detailedOrderType || derivedData.direction}
            </Text>
            {/* Fill percentage badge with icon */}
            {derivedData.fillPercentage > 0 &&
              derivedData.fillPercentage < 100 && (
                <View style={styles.fillBadge}>
                  <Icon
                    name={IconName.Loading}
                    size={IconSize.Xss}
                    color={IconColor.Alternative}
                    style={styles.fillBadgeIcon}
                  />
                  <Text
                    variant={TextVariant.BodyXS}
                    color={TextColor.Alternative}
                  >
                    {derivedData.fillPercentage.toFixed(0)}%{' '}
                    {strings('perps.order.filled')}
                  </Text>
                </View>
              )}
          </View>
          <Text variant={TextVariant.BodySMMedium} color={TextColor.Muted}>
            {formatTransactionDate(order.timestamp)}
          </Text>
        </View>

        <View style={styles.headerRight}>
          <View style={styles.headerRow}>
            <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
              {formatPrice(derivedData.sizeInUSD)}
            </Text>
          </View>
          <Text variant={TextVariant.BodySMMedium} color={TextColor.Muted}>
            {formatPositionSize(order.originalSize)} {order.symbol}
          </Text>
        </View>

        {/* Right Accessory - Conditionally shown */}
        {rightAccessory && (
          <View style={styles.rightAccessory}>{rightAccessory}</View>
        )}
      </View>

      {/* Body - Only shown when expanded */}
      {expanded && (
        <View style={styles.body}>
          <View style={styles.bodyRow}>
            <View style={styles.bodyItem}>
              <Text variant={TextVariant.BodyXS} color={TextColor.Alternative}>
                {order.isTrigger
                  ? strings('perps.order.trigger_price')
                  : strings('perps.order.limit_price')}
              </Text>
              <Text
                variant={TextVariant.BodySMMedium}
                color={TextColor.Default}
              >
                {formatPrice(order.price)}
              </Text>
            </View>
            {/* Only show TP/SL for non-trigger orders */}
            {!order.isTrigger && (
              <>
                <View style={styles.bodyItem}>
                  <Text
                    variant={TextVariant.BodyXS}
                    color={TextColor.Alternative}
                  >
                    {strings('perps.order.take_profit')}
                  </Text>
                  <Text
                    variant={TextVariant.BodySMMedium}
                    color={TextColor.Default}
                  >
                    {order.takeProfitPrice
                      ? formatPrice(order.takeProfitPrice)
                      : strings('perps.position.card.not_set')}
                  </Text>
                </View>
                <View style={styles.bodyItem}>
                  <Text
                    variant={TextVariant.BodyXS}
                    color={TextColor.Alternative}
                  >
                    {strings('perps.order.stop_loss')}
                  </Text>
                  <Text
                    variant={TextVariant.BodySMMedium}
                    color={TextColor.Default}
                  >
                    {order.stopLossPrice
                      ? formatPrice(order.stopLossPrice)
                      : strings('perps.position.card.not_set')}
                  </Text>
                </View>
              </>
            )}
            {/* Show reduce only status for trigger orders */}
            {order.isTrigger && order.reduceOnly && (
              <View style={[styles.bodyItem, styles.bodyItemReduceOnly]}>
                <Text
                  variant={TextVariant.BodyXS}
                  color={TextColor.Alternative}
                >
                  {strings('perps.order.reduce_only')}
                </Text>
                <Text
                  variant={TextVariant.BodySMMedium}
                  color={TextColor.Default}
                >
                  {strings('perps.order.yes')}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Footer - Only shown when expanded and for open orders */}
      {expanded && order.status === 'open' && (
        <View style={styles.footer}>
          <Button
            variant={ButtonVariants.Secondary}
            size={ButtonSize.Md}
            width={ButtonWidthTypes.Full}
            label={strings('perps.order.cancel_order')}
            onPress={handleCancelPress}
            disabled={disabled}
            style={[styles.footerButton, styles.footerButtonExpanded]}
            testID={PerpsOrderCardSelectorsIDs.CANCEL_BUTTON}
          />
        </View>
      )}
    </TouchableOpacity>
  );
};

PerpsOrderCard.displayName = 'PerpsOrderCard';

export default PerpsOrderCard;
