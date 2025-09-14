import React, { useMemo, useState } from 'react';
import { Modal, TouchableOpacity, View } from 'react-native';
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
  PRICE_RANGES_DETAILED_VIEW,
  formatPerpsFiat,
  formatOrderCardDate,
} from '../../utils/formatUtils';
import styleSheet from './PerpsOpenOrderCard.styles';
import { PerpsOpenOrderCardSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import type {
  PerpsOpenOrderCardProps,
  OpenOrderCardDerivedData,
} from './PerpsOpenOrderCard.types';
import BigNumber from 'bignumber.js';
import PerpsTokenLogo from '../PerpsTokenLogo';
import PerpsBottomSheetTooltip from '../PerpsBottomSheetTooltip/PerpsBottomSheetTooltip';
import { useSelector } from 'react-redux';
import { selectPerpsEligibility } from '../../selectors/perpsController';

/**
 * PerpsOpenOrderCard Component
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
 * Note: This component is designed for OPEN orders only. If a non-open order is passed,
 * the component will return null. Filled, canceled, or rejected orders should not be
 * passed to this component as they don't appear in the HyperLiquid frontendOpenOrders API.
 *
 * @param order - The order object from HyperLiquid API
 * @param onCancel - Optional callback for order cancellation
 * @param disabled - Whether the card interactions are disabled
 * @param expanded - Whether to show detailed order information
 * @param showIcon - Whether to show the asset icon
 * @param rightAccessory - Optional component to render on the right side
 */
const PerpsOpenOrderCard: React.FC<PerpsOpenOrderCardProps> = ({
  order,
  onCancel,
  disabled = false,
  expanded = false,
  showIcon = false,
  rightAccessory,
  onSelect,
  isActiveOnChart = false,
  activeType,
}) => {
  const { styles } = useStyles(styleSheet, {});

  const [isEligibilityModalVisible, setIsEligibilityModalVisible] =
    useState(false);
  const isEligible = useSelector(selectPerpsEligibility);

  // Derive order data for display
  const derivedData = useMemo<OpenOrderCardDerivedData>(() => {
    // For reduce-only orders (TP/SL), show them as closing positions
    let direction: OpenOrderCardDerivedData['direction'];
    if (order.reduceOnly || order.isTrigger) {
      // This is a TP/SL order closing a position
      // If side is 'sell', it's closing a long position
      // If side is 'buy', it's closing a short position
      direction = order.side === 'sell' ? 'Close Long' : 'Close Short';
    } else {
      // Regular order
      direction = order.side === 'buy' ? 'long' : 'short';
    }

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

  // Early return for non-open orders - this component only handles open orders
  if (order.status !== 'open') {
    return null;
  }

  const handleCancelPress = () => {
    if (!isEligible) {
      setIsEligibilityModalVisible(true);
      return;
    }

    DevLogger.log('PerpsOpenOrderCard: Cancel button pressed', {
      orderId: order.orderId,
    });

    onCancel?.(order);
  };

  const handleCardPress = () => {
    // Check if this order has TP/SL data (either explicit or trigger order)
    const hasTPSL =
      order.takeProfitPrice ||
      order.stopLossPrice ||
      (order.isTrigger &&
        order.detailedOrderType &&
        (order.detailedOrderType.toLowerCase().includes('take profit') ||
          order.detailedOrderType.toLowerCase().includes('stop')));

    if (onSelect && hasTPSL) {
      DevLogger.log('PerpsOpenOrderCard: Card pressed for TP/SL selection', {
        orderId: order.orderId,
        takeProfitPrice: order.takeProfitPrice,
        stopLossPrice: order.stopLossPrice,
        price: order.price,
        detailedOrderType: order.detailedOrderType,
        isTrigger: order.isTrigger,
      });
      onSelect(order.orderId);
    }
  };

  return (
    <TouchableOpacity
      style={[
        expanded ? styles.expandedContainer : styles.collapsedContainer,
        isActiveOnChart && styles.activeOnChartContainer,
      ]}
      onPress={handleCardPress}
      testID={PerpsOpenOrderCardSelectorsIDs.CARD}
      disabled={disabled}
    >
      {/* Header - Always shown */}
      <View style={[styles.header, expanded && styles.headerExpanded]}>
        {/* Icon Section - Conditionally shown (only in collapsed mode) */}
        {showIcon && !expanded && (
          <View style={styles.perpIcon}>
            <PerpsTokenLogo symbol={order.symbol} size={40} />
          </View>
        )}

        <View style={styles.headerLeft}>
          <View style={styles.headerRow}>
            {/* Show order type or direction */}
            <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
              {order.detailedOrderType || derivedData.direction}
            </Text>
            {/* Active Chart Indicators - Show TP and/or SL pills */}
            {isActiveOnChart && (
              <View style={styles.indicatorContainer}>
                {/* Show TP indicator if this order is active for TP */}
                {activeType === 'TP' && (
                  <View
                    style={[styles.activeChartIndicator, styles.tpIndicator]}
                  >
                    <Text
                      variant={TextVariant.BodyXS}
                      color={TextColor.Inverse}
                    >
                      TP on Chart
                    </Text>
                  </View>
                )}
                {/* Show SL indicator if this order is active for SL */}
                {activeType === 'SL' && (
                  <View
                    style={[styles.activeChartIndicator, styles.slIndicator]}
                  >
                    <Text
                      variant={TextVariant.BodyXS}
                      color={TextColor.Default}
                    >
                      SL on Chart
                    </Text>
                  </View>
                )}
                {/* Show both indicators if this order has both TP and SL */}
                {activeType === 'BOTH' && (
                  <>
                    <View
                      style={[styles.activeChartIndicator, styles.tpIndicator]}
                    >
                      <Text
                        variant={TextVariant.BodyXS}
                        color={TextColor.Inverse}
                      >
                        TP on Chart
                      </Text>
                    </View>
                    <View
                      style={[styles.activeChartIndicator, styles.slIndicator]}
                    >
                      <Text
                        variant={TextVariant.BodyXS}
                        color={TextColor.Default}
                      >
                        SL on Chart
                      </Text>
                    </View>
                  </>
                )}
              </View>
            )}
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
          <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
            {formatOrderCardDate(order.timestamp)}
          </Text>
        </View>

        <View style={styles.headerRight}>
          <View style={styles.headerRow}>
            <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
              {formatPrice(derivedData.sizeInUSD)}
            </Text>
          </View>
          <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
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
              <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
                {order.isTrigger
                  ? strings('perps.order.trigger_price')
                  : strings('perps.order.limit_price')}
              </Text>
              <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
                {formatPerpsFiat(order.price, {
                  ranges: PRICE_RANGES_DETAILED_VIEW,
                })}
              </Text>
            </View>
            {/* Only show TP/SL for non-trigger orders */}
            {!order.isTrigger && (
              <>
                <View style={styles.bodyItem}>
                  <Text
                    variant={TextVariant.BodySM}
                    color={TextColor.Alternative}
                  >
                    {strings('perps.order.take_profit')}
                  </Text>
                  <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
                    {order.takeProfitPrice
                      ? formatPerpsFiat(order.takeProfitPrice, {
                          ranges: PRICE_RANGES_DETAILED_VIEW,
                        })
                      : strings('perps.position.card.not_set')}
                  </Text>
                </View>
                <View style={styles.bodyItem}>
                  <Text
                    variant={TextVariant.BodySM}
                    color={TextColor.Alternative}
                  >
                    {strings('perps.order.stop_loss')}
                  </Text>
                  <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
                    {order.stopLossPrice
                      ? formatPerpsFiat(order.stopLossPrice, {
                          ranges: PRICE_RANGES_DETAILED_VIEW,
                        })
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

      {/* Footer - Only shown when expanded */}
      {expanded && (
        <View style={styles.footer}>
          <Button
            variant={ButtonVariants.Secondary}
            size={ButtonSize.Md}
            width={ButtonWidthTypes.Full}
            label={strings('perps.order.cancel_order')}
            onPress={handleCancelPress}
            disabled={disabled}
            style={styles.footerButton}
            testID={PerpsOpenOrderCardSelectorsIDs.CANCEL_BUTTON}
          />
        </View>
      )}

      {isEligibilityModalVisible && (
        <Modal visible transparent animationType="fade">
          <PerpsBottomSheetTooltip
            isVisible
            onClose={() => setIsEligibilityModalVisible(false)}
            contentKey={'geo_block'}
          />
        </Modal>
      )}
    </TouchableOpacity>
  );
};

export default PerpsOpenOrderCard;
