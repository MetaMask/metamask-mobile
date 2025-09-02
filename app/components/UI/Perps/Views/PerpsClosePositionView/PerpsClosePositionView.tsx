import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useNavigation,
  useRoute,
  type NavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import { strings } from '../../../../../../locales/i18n';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import KeyValueRow from '../../../../../component-library/components-temp/KeyValueRow';
import { TooltipSizes } from '../../../../../component-library/components-temp/KeyValueRow/KeyValueRow.types';
import { useTheme } from '../../../../../util/theme';
import Keypad from '../../../../Base/Keypad';
import type { OrderType, Position } from '../../controllers/types';
import type { PerpsNavigationParamList } from '../../types/navigation';
import {
  useMinimumOrderAmount,
  usePerpsOrderFees,
  usePerpsClosePositionValidation,
  usePerpsClosePosition,
  usePerpsMarketData,
} from '../../hooks';
import { usePerpsLivePrices } from '../../hooks/stream';
import { formatPositionSize, formatPrice } from '../../utils/formatUtils';
import PerpsSlider from '../../components/PerpsSlider/PerpsSlider';
import PerpsAmountDisplay from '../../components/PerpsAmountDisplay';
import PerpsOrderTypeBottomSheet from '../../components/PerpsOrderTypeBottomSheet';
import PerpsLimitPriceBottomSheet from '../../components/PerpsLimitPriceBottomSheet';
import PerpsBottomSheetTooltip from '../../components/PerpsBottomSheetTooltip';
import { PerpsTooltipContentKey } from '../../components/PerpsBottomSheetTooltip/PerpsBottomSheetTooltip.types';
import { createStyles } from './PerpsClosePositionView.styles';
import { PerpsMeasurementName } from '../../constants/performanceMetrics';
import {
  PerpsEventProperties,
  PerpsEventValues,
} from '../../constants/eventNames';
import { PerpsClosePositionViewSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import { MetaMetricsEvents } from '../../../../hooks/useMetrics';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { usePerpsScreenTracking } from '../../hooks/usePerpsScreenTracking';

const PerpsClosePositionView: React.FC = () => {
  const theme = useTheme();
  const styles = createStyles(theme);
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const route =
    useRoute<RouteProp<PerpsNavigationParamList, 'PerpsClosePosition'>>();
  const { position } = route.params as { position: Position };

  const hasTrackedCloseView = useRef(false);
  const { track } = usePerpsEventTracking();

  // Track screen load performance
  usePerpsScreenTracking({
    screenName: PerpsMeasurementName.CLOSE_SCREEN_LOADED,
    dependencies: [],
  });

  // State for order type and bottom sheets
  const [orderType, setOrderType] = useState<OrderType>('market');
  const [isOrderTypeVisible, setIsOrderTypeVisible] = useState(false);
  const [isLimitPriceVisible, setIsLimitPriceVisible] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [selectedTooltip, setSelectedTooltip] =
    useState<PerpsTooltipContentKey | null>(null);
  const [displayMode, setDisplayMode] = useState<'usd' | 'token'>('usd');

  // State for close amount
  const [closePercentage, setClosePercentage] = useState(100); // Default to 100% (full close)
  const [closeAmount, setCloseAmount] = useState(position.size);
  const [closeAmountUSD, setCloseAmountUSD] = useState(0);
  const [closeAmountUSDString, setCloseAmountUSDString] = useState('0'); // Raw string for USD input

  // State for limit price
  const [limitPrice, setLimitPrice] = useState('');

  // Subscribe to real-time price with 1s debounce for position closing
  const priceData = usePerpsLivePrices({
    symbols: [position.coin],
    throttleMs: 1000,
  });
  const currentPrice = priceData[position.coin]?.price
    ? parseFloat(priceData[position.coin].price)
    : parseFloat(position.entryPrice);

  // Get market data for decimal precision
  const { marketData } = usePerpsMarketData(position.coin);

  // Determine position direction
  const isLong = parseFloat(position.size) > 0;
  const absSize = Math.abs(parseFloat(position.size));

  // Calculate position value and effective margin
  const positionValue = absSize * currentPrice;
  // Use the actual margin from the position instead of recalculating
  const effectiveMargin = parseFloat(position.marginUsed);

  // Use unrealized PnL from position
  const pnl = parseFloat(position.unrealizedPnl);

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

  const { handleClosePosition, isClosing } = usePerpsClosePosition({
    onSuccess: () => {
      // Positions update automatically via WebSocket
      navigation.goBack();
    },
  });

  // Track position close screen viewed event
  useEffect(() => {
    if (!hasTrackedCloseView.current) {
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
  }, [position.coin, isLong, absSize, pnl, track]);

  // Initialize USD values when price data is available (only once, not on price updates)
  useEffect(() => {
    const initialUSDAmount = absSize * currentPrice;
    setCloseAmountUSD(initialUSDAmount);
    setCloseAmountUSDString(initialUSDAmount.toString());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentionally excluding currentPrice to prevent updates on price changes
  }, [absSize]);

  // Auto-open limit price bottom sheet when switching to limit order
  useEffect(() => {
    if (orderType === 'limit' && !limitPrice) {
      setIsLimitPriceVisible(true);
    }
  }, [orderType, limitPrice]);

  // Update close amount when percentage changes (but not during active input)
  useEffect(() => {
    // Skip automatic updates when user is actively typing
    if (isInputFocused) {
      return;
    }

    const newAmount = (closePercentage / 100) * absSize;
    setCloseAmount(newAmount.toString());
    const newUSDAmount = newAmount * currentPrice;
    setCloseAmountUSD(newUSDAmount);
    setCloseAmountUSDString(newUSDAmount.toString());

    // Track position close value changed
    if (closePercentage !== 100) {
      track(MetaMetricsEvents.PERPS_POSITION_CLOSE_VALUE_CHANGED, {
        [PerpsEventProperties.ASSET]: position.coin,
        [PerpsEventProperties.CLOSE_PERCENTAGE]: closePercentage,
        [PerpsEventProperties.CLOSE_VALUE]: newAmount * currentPrice,
      });
    }
  }, [
    closePercentage,
    absSize,
    currentPrice,
    position.coin,
    track,
    isInputFocused,
  ]);

  const handleConfirm = async () => {
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

    await handleClosePosition(
      position,
      sizeToClose || '',
      orderType,
      orderType === 'limit' ? limitPrice : undefined,
    );
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  const handleAmountPress = () => {
    setIsInputFocused(true);
  };

  const handleKeypadChange = useCallback(
    ({ value, valueAsNumber }: { value: string; valueAsNumber: number }) => {
      if (displayMode === 'usd') {
        // USD decimal input logic - preserve raw string for display
        const numericValue = isNaN(valueAsNumber) ? 0 : valueAsNumber;
        const maxValue = positionValue;
        const clampedValue = Math.min(numericValue, maxValue);

        // Calculate percentage based on USD value
        const newPercentage =
          maxValue > 0 ? (clampedValue / maxValue) * 100 : 0;
        setClosePercentage(newPercentage);
        setCloseAmountUSD(clampedValue); // Use the clamped numeric value
        // Keep exactly what user typed, but limit to 2 decimal places to ensure delete works on visible digits
        const formattedUSDString = value.includes('.')
          ? value.split('.')[0] + '.' + (value.split('.')[1] || '').slice(0, 2)
          : value;
        setCloseAmountUSDString(formattedUSDString);

        // Update close amount in asset units
        const newAmount = (newPercentage / 100) * absSize;
        setCloseAmount(newAmount.toString());
      } else {
        // Token decimal input logic - preserve raw string for display
        const numericValue = isNaN(valueAsNumber) ? 0 : valueAsNumber;
        const maxTokenAmount = absSize;
        const clampedTokenAmount = Math.min(numericValue, maxTokenAmount);

        // Calculate percentage based on token amount
        const newPercentage =
          maxTokenAmount > 0 ? (clampedTokenAmount / maxTokenAmount) * 100 : 0;
        setClosePercentage(newPercentage);
        setCloseAmount(value); // Keep the raw string value to preserve delete operations
        setCloseAmountUSD(numericValue * currentPrice);
      }
    },
    [displayMode, positionValue, absSize, currentPrice],
  );

  const handlePercentagePress = (percentage: number) => {
    const newPercentage = percentage * 100;
    setClosePercentage(newPercentage);

    // Immediately update values even when keypad is active
    const newAmount = (newPercentage / 100) * absSize;
    setCloseAmount(newAmount.toString());
    const newUSDAmount = newAmount * currentPrice;
    setCloseAmountUSD(newUSDAmount);
    setCloseAmountUSDString(newUSDAmount.toString());
  };

  const handleMaxPress = () => {
    setClosePercentage(100);

    // Immediately update values even when keypad is active
    setCloseAmount(absSize.toString());
    const newUSDAmount = absSize * currentPrice;
    setCloseAmountUSD(newUSDAmount);
    setCloseAmountUSDString(newUSDAmount.toString());
  };

  const handleDonePress = () => {
    setIsInputFocused(false);
  };

  // Tooltip handlers
  const handleTooltipPress = useCallback(
    (contentKey: PerpsTooltipContentKey) => {
      setSelectedTooltip(contentKey);
    },
    [],
  );

  const handleTooltipClose = useCallback(() => {
    setSelectedTooltip(null);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
          <Icon
            name={IconName.ArrowLeft}
            size={IconSize.Lg}
            color={IconColor.Default}
          />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text variant={TextVariant.HeadingMD}>
            {strings('perps.close_position.title')}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.orderTypeButton}
          onPress={() => setIsOrderTypeVisible(true)}
          testID={PerpsClosePositionViewSelectorsIDs.ORDER_TYPE_BUTTON}
        >
          <Text variant={TextVariant.BodyMD}>
            {orderType === 'market'
              ? strings('perps.order.market')
              : strings('perps.order.limit')}
          </Text>
          <Icon
            name={IconName.ArrowDown}
            size={IconSize.Xs}
            color={IconColor.Alternative}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.scrollViewContent,
          isInputFocused && styles.scrollViewContentWithKeypad,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Amount Display */}
        <PerpsAmountDisplay
          label={strings('perps.close_position.select_amount')}
          amount={displayMode === 'usd' ? closeAmountUSDString : closeAmount}
          maxAmount={positionValue}
          showWarning={false}
          onPress={handleAmountPress}
          isActive={isInputFocused}
          showTokenAmount={displayMode === 'token'}
          tokenAmount={formatPositionSize(closeAmount)}
          tokenSymbol={position.coin}
          showMaxAmount={false}
        />

        {/* Toggle Button for USD/Token Display */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() =>
              setDisplayMode(displayMode === 'usd' ? 'token' : 'usd')
            }
            testID={PerpsClosePositionViewSelectorsIDs.DISPLAY_TOGGLE_BUTTON}
          >
            <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
              {displayMode === 'usd'
                ? `${formatPositionSize(closeAmount)} ${position.coin}`
                : formatPrice(closeAmountUSD, { maximumDecimals: 2 })}
            </Text>
            <Icon
              name={IconName.SwapVertical}
              size={IconSize.Xs}
              color={IconColor.Alternative}
            />
          </TouchableOpacity>
        </View>

        {/* Slider - Hide when keypad is active */}
        {!isInputFocused && (
          <View style={styles.sliderSection}>
            <PerpsSlider
              value={closePercentage}
              onValueChange={setClosePercentage}
              minimumValue={0}
              maximumValue={100}
              step={1}
              showPercentageLabels
              disabled={isClosing}
            />
          </View>
        )}

        {/* Limit Price - only show for limit orders */}
        {orderType === 'limit' && !isInputFocused && (
          <View style={styles.detailsSection}>
            <TouchableOpacity onPress={() => setIsLimitPriceVisible(true)}>
              <KeyValueRow
                field={{
                  label: {
                    text: strings('perps.order.limit_price'),
                    variant: TextVariant.BodyMD,
                    color: TextColor.Alternative,
                  },
                  tooltip: {
                    title: strings('perps.tooltips.limit_price.title'),
                    content: strings('perps.tooltips.limit_price.content'),
                    size: TooltipSizes.Sm,
                    onPress: () => handleTooltipPress('limit_price'),
                  },
                }}
                value={{
                  label: {
                    text: limitPrice
                      ? `$${formatPrice(limitPrice, { maximumDecimals: 2 })}`
                      : 'Set price',
                    variant: TextVariant.BodyMD,
                    color: TextColor.Default,
                  },
                }}
              />
            </TouchableOpacity>
          </View>
        )}

        {/* Order Details - Always visible */}
        <View style={styles.detailsSection}>
          <View style={styles.detailRow}>
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              {strings('perps.close_position.margin')}
            </Text>
            <Text variant={TextVariant.BodyMD}>
              {formatPrice(effectiveMargin * (closePercentage / 100), {
                maximumDecimals: 2,
              })}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.labelWithTooltip}>
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                {strings('perps.close_position.estimated_pnl')}
              </Text>
              <TouchableOpacity
                onPress={() => handleTooltipPress('estimated_pnl')}
              >
                <Icon
                  name={IconName.Info}
                  size={IconSize.Xs}
                  color={IconColor.Muted}
                />
              </TouchableOpacity>
            </View>
            <Text
              variant={TextVariant.BodyMD}
              color={pnl >= 0 ? TextColor.Success : TextColor.Error}
            >
              {pnl >= 0 ? '+' : '-'}
              {formatPrice(Math.abs(pnl * (closePercentage / 100)), {
                maximumDecimals: 2,
              })}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.labelWithTooltip}>
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                {strings('perps.close_position.fees')}
              </Text>
              <TouchableOpacity
                onPress={() => handleTooltipPress('closing_fees')}
              >
                <Icon
                  name={IconName.Info}
                  size={IconSize.Xs}
                  color={IconColor.Muted}
                />
              </TouchableOpacity>
            </View>
            <Text variant={TextVariant.BodyMD}>
              -{formatPrice(feeResults.totalFee, { maximumDecimals: 2 })}
            </Text>
          </View>

          <View style={[styles.detailRow, styles.totalRow]}>
            <Text variant={TextVariant.BodyLGMedium}>
              {strings('perps.close_position.you_receive')}
            </Text>
            <Text variant={TextVariant.BodyLGMedium}>
              {formatPrice(Math.max(0, receiveAmount), {
                maximumDecimals: 2,
              })}
            </Text>
          </View>
        </View>

        {/* Validation Messages - Hide when keypad is active */}
        {!isInputFocused && validationResult.errors.length > 0 && (
          <View style={styles.validationSection}>
            {validationResult.errors.map((error, index) => (
              <View key={index} style={styles.errorMessage}>
                <Icon
                  name={IconName.Danger}
                  size={IconSize.Sm}
                  color={IconColor.Error}
                />
                <Text variant={TextVariant.BodySM} color={TextColor.Error}>
                  {error}
                </Text>
              </View>
            ))}
          </View>
        )}

        {!isInputFocused && validationResult.warnings.length > 0 && (
          <View style={styles.validationSection}>
            {validationResult.warnings.map((warning, index) => (
              <View key={index} style={styles.warningMessage}>
                <Icon
                  name={IconName.Warning}
                  size={IconSize.Sm}
                  color={IconColor.Warning}
                />
                <Text variant={TextVariant.BodySM} color={TextColor.Warning}>
                  {warning}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Keypad Section - Show when input is focused */}
      {isInputFocused && (
        <View style={styles.bottomSection}>
          <View style={styles.percentageButtonsContainer}>
            <Button
              variant={ButtonVariants.Secondary}
              size={ButtonSize.Md}
              label="25%"
              onPress={() => handlePercentagePress(0.25)}
              style={styles.percentageButton}
            />
            <Button
              variant={ButtonVariants.Secondary}
              size={ButtonSize.Md}
              label="50%"
              onPress={() => handlePercentagePress(0.5)}
              style={styles.percentageButton}
            />
            <Button
              variant={ButtonVariants.Secondary}
              size={ButtonSize.Md}
              label={strings('perps.deposit.max_button')}
              onPress={handleMaxPress}
              style={styles.percentageButton}
            />
            <Button
              variant={ButtonVariants.Secondary}
              size={ButtonSize.Md}
              label={strings('perps.deposit.done_button')}
              onPress={handleDonePress}
              style={styles.percentageButton}
            />
          </View>

          <Keypad
            value={displayMode === 'usd' ? closeAmountUSDString : closeAmount}
            onChange={handleKeypadChange}
            currency={displayMode === 'usd' ? 'USD' : undefined}
            decimals={displayMode === 'usd' ? 2 : marketData?.szDecimals ?? 18}
            style={styles.keypad}
          />
        </View>
      )}

      {/* Action Buttons - Hide when keypad is active */}
      {!isInputFocused && (
        <View style={styles.footer}>
          <Button
            label={
              isClosing
                ? strings('perps.close_position.closing')
                : strings('perps.close_position.button')
            }
            variant={ButtonVariants.Primary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            onPress={handleConfirm}
            isDisabled={
              isClosing ||
              (orderType === 'limit' &&
                (!limitPrice || parseFloat(limitPrice) <= 0)) ||
              (orderType === 'market' && closePercentage === 0) ||
              receiveAmount <= 0 ||
              !validationResult.isValid
            }
            loading={isClosing}
            testID={
              PerpsClosePositionViewSelectorsIDs.CLOSE_POSITION_CONFIRM_BUTTON
            }
          />
          <Button
            label={strings('perps.close_position.cancel')}
            variant={ButtonVariants.Secondary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            onPress={handleCancel}
            isDisabled={isClosing}
            testID={
              PerpsClosePositionViewSelectorsIDs.CLOSE_POSITION_CANCEL_BUTTON
            }
          />
        </View>
      )}

      {/* Order Type Bottom Sheet */}
      <PerpsOrderTypeBottomSheet
        isVisible={isOrderTypeVisible}
        onClose={() => setIsOrderTypeVisible(false)}
        onSelect={(type) => {
          setOrderType(type);
          // Clear limit price when switching to market order
          if (type === 'market') {
            setLimitPrice('');
          }
          setIsOrderTypeVisible(false);
        }}
        currentOrderType={orderType}
        asset={position.coin}
        direction={isLong ? 'long' : 'short'}
      />

      {/* Limit Price Bottom Sheet */}
      <PerpsLimitPriceBottomSheet
        isVisible={isLimitPriceVisible}
        onClose={() => setIsLimitPriceVisible(false)}
        onConfirm={(price) => {
          setLimitPrice(price);
          setIsLimitPriceVisible(false);
        }}
        asset={position.coin}
        limitPrice={limitPrice}
        currentPrice={currentPrice}
        direction={isLong ? 'short' : 'long'} // Opposite direction for closing
      />

      {/* Tooltip Bottom Sheet */}
      {selectedTooltip && (
        <PerpsBottomSheetTooltip
          isVisible
          onClose={handleTooltipClose}
          contentKey={selectedTooltip}
          key={selectedTooltip}
          {...(selectedTooltip === ('closing_fees' as PerpsTooltipContentKey)
            ? {
                data: {
                  metamaskFeeRate: feeResults.metamaskFeeRate,
                  protocolFeeRate: feeResults.protocolFeeRate,
                },
              }
            : {})}
        />
      )}
    </SafeAreaView>
  );
};

export default PerpsClosePositionView;
