import React, { useState, useMemo } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { PerpsPositionCardSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import { strings } from '../../../../../../locales/i18n';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../component-library/components/Buttons/ButtonIcon';
import Button, {
  ButtonVariants,
  ButtonSize,
} from '../../../../../component-library/components/Buttons/Button';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import { PERPS_CONSTANTS } from '../../constants/perpsConfig';
import type { Position, Order } from '../../controllers/types';
import {
  formatPerpsFiat,
  formatPnl,
  formatPositionSize,
  PRICE_RANGES_MINIMAL_VIEW,
  PRICE_RANGES_UNIVERSAL,
} from '../../utils/formatUtils';
import { getPerpsDisplaySymbol } from '../../utils/marketUtils';
import styleSheet from './PerpsPositionCard.styles';

/**
 * PerpsPositionCard Component
 *
 * Displays open position details with interactive controls for position management.
 *
 * @component
 *
 * @remarks
 * **Callback Requirements by Context:**
 * - **View-Only Mode** (no callbacks): Shows position data only, no interactive elements
 * - **Interactive Mode** (with callbacks): Enables position management actions
 *
 * **Interactive Callbacks:**
 * - `onAutoClosePress`: Required for TP/SL configuration - opens auto-close settings
 * - `onMarginPress`: Required for margin adjustment - opens add/remove margin flow
 * - `onSharePress`: Optional - enables sharing position P&L card
 * - `onFlipPress`: Not currently used (flip handled via modify action sheet)
 *
 * @example
 * // View-only mode
 * <PerpsPositionCard position={position} currentPrice={price} />
 *
 * @example
 * // Interactive mode
 * <PerpsPositionCard
 *   position={position}
 *   currentPrice={price}
 *   onAutoClosePress={() => navigateToTPSL(position)}
 *   onMarginPress={() => setShowAdjustMarginSheet(true)}
 *   onSharePress={() => navigateToPnlShare(position)}
 * />
 */
interface PerpsPositionCardProps {
  position: Position;
  orders?: Order[];
  showIcon?: boolean;
  currentPrice?: number;
  autoCloseEnabled?: boolean;
  onAutoClosePress?: () => void;
  onFlipPress?: () => void;
  onMarginPress?: () => void;
  onSharePress?: () => void;
}

const PerpsPositionCard: React.FC<PerpsPositionCardProps> = ({
  position,
  orders,
  currentPrice,
  autoCloseEnabled: _autoCloseEnabled = false,
  onAutoClosePress,
  onFlipPress: _onFlipPress,
  onMarginPress,
  onSharePress,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const [showSizeInUSD, setShowSizeInUSD] = useState(false);

  // Determine if position is long or short based on size
  const isLong = parseFloat(position.size) >= 0;
  const direction = isLong ? 'long' : 'short';
  const absoluteSize = Math.abs(parseFloat(position.size));

  const pnlNum = parseFloat(position.unrealizedPnl);

  // ROE is always stored as a decimal (e.g., 0.171 for 17.1%)
  // Convert to percentage for display
  const roeValue = parseFloat(position.returnOnEquity || '0');
  const roe = isNaN(roeValue) ? 0 : roeValue * 100;

  // Funding cost (cumulative since open) formatting logic
  const fundingSinceOpenRaw = position.cumulativeFunding?.sinceOpen ?? '0';
  const fundingSinceOpen = parseFloat(fundingSinceOpenRaw);
  const isNearZeroFunding = Math.abs(fundingSinceOpen) < 0.005; // Threshold: |value| < $0.005 -> display $0.00

  // Keep original color logic: exact zero = neutral, positive = cost (Error), negative = payment (Success)
  let fundingColorFromValue = TextColor.Default;
  if (fundingSinceOpen > 0) {
    fundingColorFromValue = TextColor.Error;
  } else if (fundingSinceOpen < 0) {
    fundingColorFromValue = TextColor.Success;
  }
  const fundingColor = isNearZeroFunding
    ? TextColor.Default
    : fundingColorFromValue;

  const fundingSignPrefix = fundingSinceOpen >= 0 ? '-' : '+';
  const fundingDisplay = isNearZeroFunding
    ? '$0.00'
    : `${fundingSignPrefix}${formatPerpsFiat(Math.abs(fundingSinceOpen), {
        ranges: PRICE_RANGES_MINIMAL_VIEW,
      })}`;

  const handleSizeToggle = () => {
    setShowSizeInUSD(!showSizeInUSD);
  };

  // Calculate liquidation distance percentage
  const liquidationDistance = useMemo(() => {
    if (!currentPrice || !position.liquidationPrice) return null;
    const liqPrice = parseFloat(String(position.liquidationPrice));
    if (liqPrice <= 0 || currentPrice <= 0) return null;
    return (Math.abs(currentPrice - liqPrice) / currentPrice) * 100;
  }, [currentPrice, position.liquidationPrice]);

  // Compute whether TPSL is configured (for button label)
  const hasTPSLConfigured = useMemo(() => {
    // First, check position-level TP/SL (from separate trigger orders)
    let takeProfitPrice = position.takeProfitPrice;
    let stopLossPrice = position.stopLossPrice;

    // If position-level TP/SL is undefined, check order-level TP/SL (from child orders)
    if ((!takeProfitPrice || !stopLossPrice) && orders && orders.length > 0) {
      const parentOrder = orders.find(
        (order) =>
          order.symbol === position.coin &&
          !order.isTrigger &&
          (order.takeProfitPrice || order.stopLossPrice),
      );

      if (parentOrder) {
        takeProfitPrice = takeProfitPrice || parentOrder.takeProfitPrice;
        stopLossPrice = stopLossPrice || parentOrder.stopLossPrice;
      }
    }

    const hasTakeProfit = takeProfitPrice && parseFloat(takeProfitPrice) > 0;
    const hasStopLoss = stopLossPrice && parseFloat(stopLossPrice) > 0;
    return Boolean(hasTakeProfit || hasStopLoss);
  }, [position.takeProfitPrice, position.stopLossPrice, position.coin, orders]);

  const handleAutoCloseButtonPress = () => {
    if (onAutoClosePress) {
      onAutoClosePress();
    }
  };

  return (
    <View style={styles.container} testID={PerpsPositionCardSelectorsIDs.CARD}>
      {/* Header Section */}
      <View style={styles.header} testID={PerpsPositionCardSelectorsIDs.HEADER}>
        <Text variant={TextVariant.HeadingMD} color={TextColor.Default}>
          {strings('perps.position.card.position_title')}
        </Text>
        {onSharePress && (
          <ButtonIcon
            size={ButtonIconSizes.Sm}
            iconName={IconName.Share}
            onPress={onSharePress}
            testID={PerpsPositionCardSelectorsIDs.SHARE_BUTTON}
          />
        )}
      </View>

      {/* P&L Section - Two cards side by side */}
      <View style={styles.pnlSection}>
        <View
          style={[styles.pnlCard, styles.pnlCardLeft]}
          testID={PerpsPositionCardSelectorsIDs.PNL_CARD}
        >
          <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
            {strings('perps.position.card.pnl_label')}
          </Text>
          <Text
            variant={TextVariant.BodyMD}
            color={pnlNum >= 0 ? TextColor.Success : TextColor.Error}
            testID={PerpsPositionCardSelectorsIDs.PNL_VALUE}
          >
            {formatPnl(pnlNum)}
          </Text>
        </View>

        <View
          style={[styles.pnlCard, styles.pnlCardRight]}
          testID={PerpsPositionCardSelectorsIDs.RETURN_CARD}
        >
          <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
            {strings('perps.position.card.return_label')}
          </Text>
          <Text
            variant={TextVariant.BodyMD}
            color={roe >= 0 ? TextColor.Success : TextColor.Error}
            testID={PerpsPositionCardSelectorsIDs.RETURN_VALUE}
          >
            {roe >= 0 ? '+' : ''}
            {roe.toFixed(2)}%
          </Text>
        </View>
      </View>

      {/* Size/Margin Row */}
      <View style={styles.sizeMarginRow}>
        <TouchableOpacity
          style={styles.sizeContainer}
          onPress={handleSizeToggle}
          testID={PerpsPositionCardSelectorsIDs.SIZE_CONTAINER}
        >
          <View style={styles.sizeLeftContent}>
            <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
              {strings('perps.position.card.size_label')}
            </Text>
            <Text
              variant={TextVariant.BodyMD}
              color={TextColor.Default}
              testID={PerpsPositionCardSelectorsIDs.SIZE_VALUE}
            >
              {showSizeInUSD && currentPrice
                ? formatPerpsFiat(absoluteSize * currentPrice, {
                    ranges: PRICE_RANGES_UNIVERSAL,
                  })
                : `${formatPositionSize(absoluteSize.toString())} ${getPerpsDisplaySymbol(position.coin)}`}
            </Text>
          </View>
          <View style={styles.iconButtonContainer}>
            <ButtonIcon
              iconName={IconName.SwapHorizontal}
              size={ButtonIconSizes.Sm}
              iconColor={IconColor.Default}
              onPress={handleSizeToggle}
              style={styles.iconButton}
              testID={PerpsPositionCardSelectorsIDs.FLIP_ICON}
            />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.marginContainer}
          onPress={onMarginPress}
          disabled={!onMarginPress}
          testID={PerpsPositionCardSelectorsIDs.MARGIN_CONTAINER}
        >
          <View style={styles.marginLeftContent}>
            <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
              {strings('perps.position.card.margin_label')}
            </Text>
            <Text
              variant={TextVariant.BodyMD}
              color={TextColor.Default}
              testID={PerpsPositionCardSelectorsIDs.MARGIN_VALUE}
            >
              {formatPerpsFiat(position.marginUsed, {
                ranges: PRICE_RANGES_MINIMAL_VIEW,
              })}
            </Text>
          </View>
          {onMarginPress && (
            <View style={styles.iconButtonContainer}>
              <ButtonIcon
                iconName={IconName.ArrowRight}
                size={ButtonIconSizes.Sm}
                iconColor={IconColor.Default}
                onPress={onMarginPress}
                style={styles.iconButton}
                testID={PerpsPositionCardSelectorsIDs.MARGIN_CHEVRON}
              />
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Auto Close Section */}
      <TouchableOpacity
        style={styles.autoCloseSection}
        onPress={handleAutoCloseButtonPress}
        activeOpacity={0.7}
        disabled={!onAutoClosePress}
        testID={PerpsPositionCardSelectorsIDs.AUTO_CLOSE_TOGGLE}
      >
        <View style={styles.autoCloseTextContainer}>
          <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
            {strings('perps.auto_close.title')}
          </Text>
          {(() => {
            // First, check position-level TP/SL (from separate trigger orders)
            let takeProfitPrice = position.takeProfitPrice;
            let stopLossPrice = position.stopLossPrice;

            // If position-level TP/SL is undefined, check order-level TP/SL (from child orders)
            if (
              (!takeProfitPrice || !stopLossPrice) &&
              orders &&
              orders.length > 0
            ) {
              // Find the parent order for this position
              // Parent orders: same symbol, not trigger orders, have TP/SL children
              const parentOrder = orders.find(
                (order) =>
                  order.symbol === position.coin &&
                  !order.isTrigger &&
                  (order.takeProfitPrice || order.stopLossPrice),
              );

              if (parentOrder) {
                takeProfitPrice =
                  takeProfitPrice || parentOrder.takeProfitPrice;
                stopLossPrice = stopLossPrice || parentOrder.stopLossPrice;
              }
            }

            const hasTakeProfit =
              takeProfitPrice && parseFloat(takeProfitPrice) > 0;
            const hasStopLoss = stopLossPrice && parseFloat(stopLossPrice) > 0;

            if (hasTakeProfit || hasStopLoss) {
              const parts: string[] = [];

              if (hasTakeProfit && takeProfitPrice) {
                const tpPrice = formatPerpsFiat(parseFloat(takeProfitPrice), {
                  ranges: PRICE_RANGES_MINIMAL_VIEW,
                });
                parts.push(`${strings('perps.order.tp')} ${tpPrice}`);
              }

              if (hasStopLoss && stopLossPrice) {
                const slPrice = formatPerpsFiat(parseFloat(stopLossPrice), {
                  ranges: PRICE_RANGES_MINIMAL_VIEW,
                });
                parts.push(`${strings('perps.order.sl')} ${slPrice}`);
              }

              return (
                <Text variant={TextVariant.BodySM} color={TextColor.Default}>
                  {parts.join(', ')}
                </Text>
              );
            }

            return (
              <Text variant={TextVariant.BodySM} color={TextColor.Default}>
                {strings('perps.auto_close.description')}
              </Text>
            );
          })()}
        </View>
        <View>
          {onAutoClosePress && (
            <Button
              variant={ButtonVariants.Secondary}
              size={ButtonSize.Sm}
              label={
                hasTPSLConfigured
                  ? strings('perps.auto_close.edit_button')
                  : strings('perps.auto_close.set_button')
              }
              labelTextVariant={TextVariant.BodyMD}
              onPress={handleAutoCloseButtonPress}
              style={styles.autoCloseButton}
            />
          )}
        </View>
      </TouchableOpacity>

      {/* Details Section - Always expanded */}
      <View
        style={styles.detailsSection}
        testID={PerpsPositionCardSelectorsIDs.DETAILS_SECTION}
      >
        <Text
          variant={TextVariant.HeadingMD}
          color={TextColor.Default}
          style={styles.detailsTitle}
        >
          {strings('perps.position.card.details_title')}
        </Text>

        <View style={[styles.detailRow, styles.detailRowFirst]}>
          <Text
            variant={TextVariant.BodyMDMedium}
            color={TextColor.Alternative}
          >
            {strings('perps.position.card.direction_label')}
          </Text>
          <Text
            variant={TextVariant.BodyMD}
            color={TextColor.Default}
            testID={PerpsPositionCardSelectorsIDs.DIRECTION_VALUE}
          >
            {direction === 'long'
              ? strings('perps.market.long')
              : strings('perps.market.short')}{' '}
            {position.leverage.value}x
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text
            variant={TextVariant.BodyMDMedium}
            color={TextColor.Alternative}
          >
            {strings('perps.position.card.entry_label')}
          </Text>
          <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
            {formatPerpsFiat(position.entryPrice, {
              ranges: PRICE_RANGES_UNIVERSAL,
            })}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text
            variant={TextVariant.BodyMDMedium}
            color={TextColor.Alternative}
          >
            {strings('perps.position.card.liquidation_price_label')}
          </Text>
          <View style={styles.liquidationPriceValue}>
            <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
              {position.liquidationPrice !== undefined &&
              position.liquidationPrice !== null
                ? formatPerpsFiat(position.liquidationPrice, {
                    ranges: PRICE_RANGES_UNIVERSAL,
                  })
                : PERPS_CONSTANTS.FALLBACK_PRICE_DISPLAY}
            </Text>
            {liquidationDistance !== null && (
              <>
                <Text
                  variant={TextVariant.BodyMD}
                  color={TextColor.Alternative}
                >
                  {' '}
                  {Math.round(liquidationDistance)}%
                </Text>
                <Icon
                  name={isLong ? IconName.TrendDown : IconName.TrendUp}
                  size={IconSize.Sm}
                  color={IconColor.Alternative}
                />
              </>
            )}
          </View>
        </View>

        <View style={[styles.detailRow, styles.detailRowLast]}>
          <Text
            variant={TextVariant.BodyMDMedium}
            color={TextColor.Alternative}
          >
            {strings('perps.position.card.funding_payments_label')}
          </Text>
          <Text variant={TextVariant.BodyMD} color={fundingColor}>
            {fundingDisplay}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default PerpsPositionCard;
