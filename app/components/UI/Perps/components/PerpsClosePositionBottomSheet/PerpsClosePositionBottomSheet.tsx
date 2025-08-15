import React, { memo, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetFooter from '../../../../../component-library/components/BottomSheets/BottomSheetFooter';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useTheme } from '../../../../../util/theme';
import type { OrderType, Position } from '../../controllers/types';
import {
  useMinimumOrderAmount,
  usePerpsOrderFees,
  usePerpsPrices,
  usePerpsClosePositionValidation,
} from '../../hooks';
import { formatPositionSize, formatPrice } from '../../utils/formatUtils';
import PerpsSlider from '../PerpsSlider/PerpsSlider';
import { createStyles } from './PerpsClosePositionBottomSheet.styles';
import { PerpsMeasurementName } from '../../constants/performanceMetrics';
import {
  PerpsEventProperties,
  PerpsEventValues,
} from '../../constants/eventNames';
import { MetaMetricsEvents } from '../../../../hooks/useMetrics';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { usePerpsScreenTracking } from '../../hooks/usePerpsScreenTracking';

interface PerpsClosePositionBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onConfirm: (
    size: string, // Amount to close
    orderType: OrderType,
    limitPrice?: string,
  ) => void;
  position: Position;
  isClosing?: boolean;
}

const PerpsClosePositionBottomSheet: React.FC<
  PerpsClosePositionBottomSheetProps
> = ({ isVisible, onClose, onConfirm, position, isClosing = false }) => {
  const theme = useTheme();
  const { colors } = theme;
  const styles = createStyles(theme);
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const hasTrackedCloseView = useRef(false);
  const { track } = usePerpsEventTracking();

  // Track screen load performance
  usePerpsScreenTracking({
    screenName: PerpsMeasurementName.CLOSE_SCREEN_LOADED,
    dependencies: [isVisible],
  });

  // State for order type tabs
  const [orderType, setOrderType] = useState<OrderType>('market');

  // State for close amount
  const [closePercentage, setClosePercentage] = useState(100); // Default to 100% (full close)
  const [closeAmount, setCloseAmount] = useState(position.size);
  const [closeAmountUSD, setCloseAmountUSD] = useState(0);

  // State for limit price
  const [limitPrice, setLimitPrice] = useState('');
  const [limitPriceInputFocused, setLimitPriceInputFocused] = useState(false);

  // Subscribe to real-time price
  const priceData = usePerpsPrices(isVisible ? [position.coin] : [], {});
  const currentPrice = priceData[position.coin]?.price
    ? parseFloat(priceData[position.coin].price)
    : parseFloat(position.entryPrice);

  // Determine position direction
  const isLong = parseFloat(position.size) > 0;
  const absSize = Math.abs(parseFloat(position.size));

  // Calculate position value and effective margin
  const positionValue = absSize * currentPrice;
  // Calculate effective margin from position value and leverage
  const leverage = position.leverage
    ? parseFloat(position.leverage.value.toString())
    : 1;
  const effectiveMargin = positionValue / leverage;

  // Calculate P&L
  const entryPrice = parseFloat(position.entryPrice);
  const pnl = isLong
    ? (currentPrice - entryPrice) * absSize
    : (entryPrice - currentPrice) * absSize;

  // Calculate fees using the unified fee hook
  const closingValue = positionValue * (closePercentage / 100);
  const feeResults = usePerpsOrderFees({
    orderType,
    amount: closingValue.toString(),
    isMaker: false, // Closing positions are typically taker orders
  });

  // Calculate what user will receive (effective margin + pnl - fees)
  const receiveAmount =
    (closePercentage / 100) * effectiveMargin +
    (closePercentage / 100) * pnl -
    feeResults.totalFee;

  // Get minimum order amount for this asset
  const { minimumOrderAmount } = useMinimumOrderAmount({
    asset: position.coin,
  });

  // Calculate remaining position value after partial close
  const remainingPositionValue = positionValue * (1 - closePercentage / 100);
  const isPartialClose = closePercentage < 100;

  // Use the validation hook
  const validationResult = usePerpsClosePositionValidation({
    coin: position.coin,
    closePercentage,
    closeAmount: closeAmount.toString(),
    orderType,
    limitPrice,
    currentPrice,
    positionSize: absSize,
    positionValue,
    minimumOrderAmount,
    closingValue,
    remainingPositionValue,
    receiveAmount,
    isPartialClose,
  });

  // Open bottom sheet when visible
  useEffect(() => {
    if (isVisible) {
      bottomSheetRef.current?.onOpenBottomSheet();
    } else {
      // Reset the flag when the bottom sheet is closed
      hasTrackedCloseView.current = false;
    }
  }, [isVisible]);

  // Track position close screen viewed event - separate concern
  useEffect(() => {
    if (isVisible && !hasTrackedCloseView.current) {
      track(MetaMetricsEvents.PERPS_POSITION_CLOSE_SCREEN_VIEWED, {
        [PerpsEventProperties.ASSET]: position.coin,
        [PerpsEventProperties.DIRECTION]: isLong
          ? PerpsEventValues.DIRECTION.LONG
          : PerpsEventValues.DIRECTION.SHORT,
        [PerpsEventProperties.POSITION_SIZE]: absSize,
        [PerpsEventProperties.UNREALIZED_PNL_DOLLAR]: pnl,
      });
      hasTrackedCloseView.current = true;
    }
  }, [isVisible, position.coin, isLong, absSize, pnl, track]);

  // Update close amount when percentage changes
  useEffect(() => {
    const newAmount = (closePercentage / 100) * absSize;
    setCloseAmount(newAmount.toString());
    setCloseAmountUSD(newAmount * currentPrice);

    // Track position close value changed
    if (isVisible && closePercentage !== 100) {
      track(MetaMetricsEvents.PERPS_POSITION_CLOSE_VALUE_CHANGED, {
        [PerpsEventProperties.ASSET]: position.coin,
        [PerpsEventProperties.CLOSE_PERCENTAGE]: closePercentage,
        [PerpsEventProperties.CLOSE_VALUE]: newAmount * currentPrice,
      });
    }
  }, [closePercentage, absSize, currentPrice, isVisible, position.coin, track]);

  const handleConfirm = () => {
    // Track position close initiated
    track(MetaMetricsEvents.PERPS_POSITION_CLOSE_INITIATED, {
      [PerpsEventProperties.ASSET]: position.coin,
      [PerpsEventProperties.DIRECTION]: isLong
        ? PerpsEventValues.DIRECTION.LONG
        : PerpsEventValues.DIRECTION.SHORT,
      [PerpsEventProperties.ORDER_TYPE]: orderType,
      [PerpsEventProperties.CLOSE_PERCENTAGE]: closePercentage,
      [PerpsEventProperties.CLOSE_VALUE]: closingValue,
      [PerpsEventProperties.PNL_DOLLAR]: pnl * (closePercentage / 100),
      [PerpsEventProperties.RECEIVED_AMOUNT]: receiveAmount,
    });

    // Track position close submitted
    track(MetaMetricsEvents.PERPS_POSITION_CLOSE_SUBMITTED, {
      [PerpsEventProperties.ASSET]: position.coin,
      [PerpsEventProperties.ORDER_TYPE]: orderType,
    });

    // For full close, don't send size parameter
    const sizeToClose = closePercentage === 100 ? undefined : closeAmount;

    // For limit orders, validate price
    if (orderType === 'limit' && !limitPrice) {
      return;
    }

    onConfirm(
      sizeToClose || '',
      orderType,
      orderType === 'limit' ? limitPrice : undefined,
    );
  };

  const handleLimitPriceChange = (text: string) => {
    // Allow only numbers and decimal point
    const sanitized = text.replace(/[^0-9.]/g, '');
    // Prevent multiple decimal points
    const parts = sanitized.split('.');
    if (parts.length > 2) return;
    setLimitPrice(sanitized);
  };

  const footerButtonProps = [
    {
      label: isClosing
        ? strings('perps.close_position.closing')
        : strings('perps.close_position.button'),
      variant: ButtonVariants.Primary,
      size: ButtonSize.Lg,
      onPress: handleConfirm,
      isDisabled:
        isClosing ||
        (orderType === 'limit' &&
          (!limitPrice || parseFloat(limitPrice) <= 0)) ||
        (orderType === 'market' && closePercentage === 0) ||
        receiveAmount <= 0 ||
        !validationResult.isValid,
      loading: isClosing,
      testID: 'close-position-confirm-button',
    },
  ];

  if (!isVisible) return null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      shouldNavigateBack={false}
      onClose={onClose}
    >
      <BottomSheetHeader onClose={onClose}>
        <Text variant={TextVariant.HeadingMD}>
          {strings('perps.close_position.title')}
        </Text>
      </BottomSheetHeader>

      <View style={styles.container}>
        {/* Order Type Tabs */}
        <View style={styles.tabContainer} testID="order-type-tabs">
          <TouchableOpacity
            testID="market-order-tab"
            style={[styles.tab, orderType === 'market' && styles.tabActive]}
            onPress={() => {
              setOrderType('market');
              // Track order type changed
              track(MetaMetricsEvents.PERPS_POSITION_CLOSE_ORDER_TYPE_CHANGED, {
                [PerpsEventProperties.ASSET]: position.coin,
                [PerpsEventProperties.CURRENT_ORDER_TYPE]: orderType,
                [PerpsEventProperties.SELECTED_ORDER_TYPE]:
                  PerpsEventValues.ORDER_TYPE.MARKET,
              });
            }}
          >
            <Text
              variant={TextVariant.BodyMDMedium}
              color={
                orderType === 'market'
                  ? TextColor.Primary
                  : TextColor.Alternative
              }
            >
              {strings('perps.order.market')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="limit-order-tab"
            style={[styles.tab, orderType === 'limit' && styles.tabActive]}
            onPress={() => {
              setOrderType('limit');
              // Track order type changed
              track(MetaMetricsEvents.PERPS_POSITION_CLOSE_ORDER_TYPE_CHANGED, {
                [PerpsEventProperties.ASSET]: position.coin,
                [PerpsEventProperties.CURRENT_ORDER_TYPE]: orderType,
                [PerpsEventProperties.SELECTED_ORDER_TYPE]:
                  PerpsEventValues.ORDER_TYPE.LIMIT,
              });
            }}
          >
            <Text
              variant={TextVariant.BodyMDMedium}
              color={
                orderType === 'limit'
                  ? TextColor.Primary
                  : TextColor.Alternative
              }
            >
              {strings('perps.order.limit')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Position Size Display */}
        <View style={styles.sizeDisplay} testID="position-size-display">
          <Text
            variant={TextVariant.DisplayMD}
            style={styles.sizeAmount}
            testID="close-amount-usd"
          >
            {formatPrice(closeAmountUSD)}
          </Text>
          <Text
            variant={TextVariant.BodyMD}
            color={TextColor.Alternative}
            testID="close-amount-tokens"
          >
            {formatPositionSize((absSize * (closePercentage / 100)).toString())}{' '}
            {position.coin}
          </Text>
        </View>

        {/* Slider */}
        <View style={styles.sliderContainer}>
          <PerpsSlider
            value={closePercentage}
            onValueChange={setClosePercentage}
            minimumValue={0}
            maximumValue={100}
            step={1}
            showPercentageLabels
          />
        </View>

        {/* Limit Price Input (only for limit orders) */}
        {orderType === 'limit' && (
          <View style={styles.limitPriceSection}>
            <Text
              variant={TextVariant.BodyMD}
              color={TextColor.Alternative}
              style={styles.limitPriceLabel}
            >
              {strings('perps.order.limit_price')}
            </Text>
            <View
              style={[
                styles.limitPriceInput,
                limitPriceInputFocused && styles.limitPriceInputActive,
              ]}
            >
              <TextInput
                testID="limit-price-input"
                style={styles.input}
                value={limitPrice}
                onChangeText={handleLimitPriceChange}
                placeholder={formatPrice(currentPrice)}
                placeholderTextColor={colors.text.muted}
                keyboardType="numeric"
                onFocus={() => setLimitPriceInputFocused(true)}
                onBlur={() => {
                  setLimitPriceInputFocused(false);
                  // Format on blur if there's a value
                  if (limitPrice && !isNaN(parseFloat(limitPrice))) {
                    setLimitPrice(formatPrice(limitPrice));
                  }
                }}
              />
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                USD
              </Text>
            </View>
          </View>
        )}

        {/* Position Details */}
        <View style={styles.detailsSection}>
          <View style={styles.detailRow}>
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              {strings('perps.close_position.pnl')}
            </Text>
            <Text
              testID="position-pnl"
              variant={TextVariant.BodyMDMedium}
              color={pnl >= 0 ? TextColor.Success : TextColor.Error}
            >
              {pnl >= 0 ? '+' : ''}
              {formatPrice(pnl * (closePercentage / 100))}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              {strings('perps.close_position.fees')}
            </Text>
            <Text
              testID="position-fees"
              variant={TextVariant.BodyMD}
              color={TextColor.Default}
            >
              -{formatPrice(feeResults.totalFee)}
            </Text>
          </View>

          <View style={styles.separator} />

          <View style={styles.detailRow}>
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              {strings('perps.close_position.receive')}
            </Text>
            <View style={styles.receiveAmount}>
              <Text
                testID="receive-amount"
                variant={TextVariant.BodyLGMedium}
                color={TextColor.Default}
              >
                {formatPrice(receiveAmount)}
              </Text>
            </View>
          </View>

          {validationResult.errors.length > 0 && (
            <View style={styles.warningContainer}>
              {validationResult.errors.map((error) => (
                <Text
                  key={error}
                  variant={TextVariant.BodySM}
                  color={TextColor.Error}
                  style={styles.warningText}
                >
                  {error}
                </Text>
              ))}
            </View>
          )}
          {validationResult.warnings.length > 0 && (
            <View style={styles.warningContainer}>
              {validationResult.warnings.map((warning) => (
                <Text
                  key={warning}
                  variant={TextVariant.BodySM}
                  color={TextColor.Warning}
                  style={styles.warningText}
                >
                  {warning}
                </Text>
              ))}
            </View>
          )}
        </View>
      </View>

      <BottomSheetFooter buttonPropsArray={footerButtonProps} />

      {/* Loading Overlay */}
      {isClosing && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary.default} />
            <Text
              variant={TextVariant.BodyLGMedium}
              color={TextColor.Default}
              style={styles.loadingText}
            >
              {strings('perps.close_position.closing')}
            </Text>
          </View>
        </View>
      )}
    </BottomSheet>
  );
};

PerpsClosePositionBottomSheet.displayName = 'PerpsClosePositionBottomSheet';

export default memo(
  PerpsClosePositionBottomSheet,
  (prevProps, nextProps) =>
    // Only re-render if these props change
    prevProps.isVisible === nextProps.isVisible &&
    prevProps.position === nextProps.position &&
    prevProps.isClosing === nextProps.isClosing,
);
