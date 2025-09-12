import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
import { useTheme } from '../../../../../util/theme';
import Keypad from '../../../../Base/Keypad';
import type { OrderType, Position } from '../../controllers/types';
import type { PerpsNavigationParamList } from '../../types/navigation';
import {
  useMinimumOrderAmount,
  usePerpsOrderFees,
  usePerpsClosePositionValidation,
  usePerpsClosePosition,
  usePerpsToasts,
} from '../../hooks';
import { usePerpsLivePrices } from '../../hooks/stream';
import { formatPositionSize, formatPrice } from '../../utils/formatUtils';
import {
  calculateCloseAmountFromPercentage,
  validateCloseAmountLimits,
} from '../../utils/positionCalculations';
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
import {
  PerpsClosePositionViewSelectorsIDs,
  PerpsOrderViewSelectorsIDs,
} from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import { MetaMetricsEvents } from '../../../../hooks/useMetrics';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { usePerpsScreenTracking } from '../../hooks/usePerpsScreenTracking';
import ListItem from '../../../../../component-library/components/List/ListItem';
import ListItemColumn, {
  WidthType,
} from '../../../../../component-library/components/List/ListItemColumn';
import PerpsOrderHeader from '../../components/PerpsOrderHeader';

const PerpsClosePositionView: React.FC = () => {
  const theme = useTheme();
  const styles = createStyles(theme);
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const route =
    useRoute<RouteProp<PerpsNavigationParamList, 'PerpsClosePosition'>>();
  const { position } = route.params as { position: Position };

  const hasTrackedCloseView = useRef(false);
  const { track } = usePerpsEventTracking();

  const { showToast, PerpsToastOptions } = usePerpsToasts();

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
  const [isUserInputActive, setIsUserInputActive] = useState(false);
  const [selectedTooltip, setSelectedTooltip] =
    useState<PerpsTooltipContentKey | null>(null);

  // State for close amount
  const [closePercentage, setClosePercentage] = useState(100); // Default to 100% (full close)
  const [closeAmountUSDString, setCloseAmountUSDString] = useState('0'); // Raw string for USD input (user input only)

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

  // Determine position direction
  const isLong = parseFloat(position.size) > 0;
  const absSize = Math.abs(parseFloat(position.size));

  // Calculate display values directly from closePercentage for immediate updates
  const { closeAmount, calculatedUSDString } = useMemo(() => {
    const { tokenAmount, usdValue } = calculateCloseAmountFromPercentage({
      percentage: closePercentage,
      positionSize: absSize,
      currentPrice,
    });

    return {
      closeAmount: tokenAmount.toString(),
      calculatedUSDString: usdValue.toFixed(2),
    };
  }, [closePercentage, absSize, currentPrice]);

  // Use calculated USD string when not in input mode, user input when typing
  const displayUSDString =
    isInputFocused || isUserInputActive
      ? closeAmountUSDString
      : calculatedUSDString;

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

  // Calculate what user will receive (margin - fees, P&L is settled separately)
  const receiveAmount =
    (closePercentage / 100) * effectiveMargin - feeResults.totalFee;

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

  const { handleClosePosition, isClosing } = usePerpsClosePosition();

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
    setCloseAmountUSDString(initialUSDAmount.toFixed(2));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentionally excluding currentPrice to prevent updates on price changes
  }, [absSize]);

  // Auto-open limit price bottom sheet when switching to limit order
  useEffect(() => {
    if (orderType === 'limit' && !limitPrice) {
      setIsLimitPriceVisible(true);
    }
  }, [orderType, limitPrice]);

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

    // Go back immediately to close the position screen
    navigation.goBack();

    await handleClosePosition(
      position,
      sizeToClose || '',
      orderType,
      orderType === 'limit' ? limitPrice : undefined,
    );
  };

  const handleAmountPress = () => {
    setIsInputFocused(true);
  };

  const handleKeypadChange = useCallback(
    ({ value }: { value: string; valueAsNumber: number }) => {
      const previousValue = closeAmountUSDString;
      // Special handling for decimal point deletion
      // If previous value had a decimal and new value is the same, force remove the decimal
      let adjustedValue = value;

      // Check if we're stuck on a decimal (e.g., "2." -> "2." means delete didn't work)
      if (previousValue.endsWith('.') && value === previousValue) {
        adjustedValue = value.slice(0, -1);
      }
      // Also handle case where decimal is in middle (e.g., "2.5" -> "2." should become "25")
      else if (
        previousValue.includes('.') &&
        value.endsWith('.') &&
        value.length === previousValue.length - 1
      ) {
        // User deleted a digit after decimal, remove the decimal too
        adjustedValue = value.replace('.', '');
      }

      // Set both focus flags immediately to prevent useEffect interference
      if (!isInputFocused) {
        setIsInputFocused(true);
      }
      if (!isUserInputActive) {
        setIsUserInputActive(true);
      }

      // Enforce 9-digit limit (ignoring non-digits). Block the change if exceeded.
      const digitCount = (adjustedValue.match(/\d/g) || []).length;
      if (digitCount > 9) {
        return; // Ignore input that would exceed 9 digits
      }

      // USD decimal input logic - preserve raw string for display
      // Use adjustedValue instead of original value
      const numericValue = parseFloat(adjustedValue) || 0;
      const clampedValue = validateCloseAmountLimits({
        amount: numericValue,
        maxAmount: positionValue,
      });

      // For USD mode, preserve user input exactly as typed for proper delete operations
      // Only limit decimal places if there are digits after the decimal point
      let formattedUSDString = adjustedValue;
      if (adjustedValue.includes('.')) {
        const parts = adjustedValue.split('.');
        const integerPart = parts[0] || '';
        const decimalPart = parts[1] || '';

        // If there's a decimal part, limit it to 2 digits
        if (decimalPart.length > 0) {
          formattedUSDString = integerPart + '.' + decimalPart.slice(0, 2);
        } else {
          // Keep the decimal point if user just typed it (like "2.")
          formattedUSDString = integerPart + '.';
        }
      }

      // Update all states in batch to prevent race conditions
      setCloseAmountUSDString(formattedUSDString);

      // Calculate percentage and token amount
      const newPercentage =
        positionValue > 0 ? (clampedValue / positionValue) * 100 : 0;

      // Update percentage (amount and token values are calculated automatically)
      setClosePercentage(newPercentage);
    },
    [positionValue, isInputFocused, isUserInputActive, closeAmountUSDString],
  );

  const handlePercentagePress = (percentage: number) => {
    const newPercentage = percentage * 100;
    setClosePercentage(newPercentage);

    // Update USD input to match calculated value for keypad display consistency
    const newUSDAmount = (newPercentage / 100) * absSize * currentPrice;
    setCloseAmountUSDString(newUSDAmount.toFixed(2));
  };

  const handleMaxPress = () => {
    setClosePercentage(100);

    // Update USD input to match calculated value for keypad display consistency
    const newUSDAmount = absSize * currentPrice;
    setCloseAmountUSDString(newUSDAmount.toFixed(2));
  };

  const handleDonePress = () => {
    setIsInputFocused(false);
    setIsUserInputActive(false);
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

  const realizedPnl = useMemo(() => {
    const price = Math.abs(pnl * (closePercentage / 100));
    const formattedPrice = formatPrice(price, {
      maximumDecimals: 2,
    });

    return { formattedPrice, price, isNegative: pnl < 0 };
  }, [pnl, closePercentage]);

  // Hide provider-level limit price required error on this UI
  // Only display the minimum amount error (e.g. minimum $10) and suppress others
  const filteredErrors = useMemo(() => {
    const minimumAmountErrorPrefix = strings(
      'perps.order.validation.minimum_amount',
      {
        amount: '',
      },
    ).replace(/\s+$/, '');
    // The actual minimum amount string includes the amount placeholder; match by key detection.
    return validationResult.errors.filter((err) =>
      err.startsWith(minimumAmountErrorPrefix),
    );
  }, [validationResult.errors]);

  const Summary = (
    <View
      style={[
        styles.summaryContainer,
        isInputFocused && styles.paddingHorizontal,
      ]}
    >
      <View style={styles.summaryRow}>
        <View style={styles.summaryLabel}>
          <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
            {strings('perps.close_position.margin')}
          </Text>
        </View>
        <View style={styles.summaryValue}>
          <Text variant={TextVariant.BodyMD}>
            {formatPrice(effectiveMargin * (closePercentage / 100), {
              maximumDecimals: 2,
            })}
          </Text>
          <View style={styles.inclusiveFeeRow}>
            <Text variant={TextVariant.BodySM} color={TextColor.Default}>
              {strings('perps.close_position.includes_pnl')}
            </Text>
            <Text
              variant={TextVariant.BodySM}
              color={
                realizedPnl.isNegative ? TextColor.Error : TextColor.Success
              }
            >
              {realizedPnl.isNegative ? '-' : '+'}
              {realizedPnl.formattedPrice}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryLabel}>
          <TouchableOpacity
            onPress={() => handleTooltipPress('closing_fees')}
            style={styles.labelWithTooltip}
          >
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              {strings('perps.close_position.fees')}
            </Text>
            <Icon
              name={IconName.Info}
              size={IconSize.Xs}
              color={IconColor.Muted}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.summaryValue}>
          <Text variant={TextVariant.BodyMD}>
            -{formatPrice(feeResults.totalFee, { maximumDecimals: 2 })}
          </Text>
        </View>
      </View>

      <View style={[styles.summaryRow, styles.summaryTotalRow]}>
        <View style={styles.summaryLabel}>
          <Text variant={TextVariant.BodyMD}>
            {strings('perps.close_position.you_receive')}
          </Text>
        </View>
        <View style={styles.summaryValue}>
          <Text variant={TextVariant.BodyMD}>
            {formatPrice(Math.max(0, receiveAmount), {
              maximumDecimals: 2,
            })}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <PerpsOrderHeader
        asset={position.coin}
        price={currentPrice}
        priceChange={parseFloat(
          priceData[position.coin]?.percentChange24h ?? '0',
        )}
        orderType={orderType}
        onOrderTypePress={() => setIsOrderTypeVisible(true)}
        title={strings('perps.close_position.title')}
        isLoading={isClosing}
      />

      <ScrollView
        style={styles.content}
        alwaysBounceVertical={false}
        contentContainerStyle={[
          styles.scrollViewContent,
          isInputFocused && styles.scrollViewContentWithKeypad,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Amount Display */}
        <PerpsAmountDisplay
          label={strings('perps.close_position.select_amount')}
          amount={displayUSDString}
          showWarning={false}
          onPress={handleAmountPress}
          isActive={isInputFocused}
          tokenAmount={formatPositionSize(closeAmount)}
          hasError={filteredErrors.length > 0}
          tokenSymbol={position.coin}
          showMaxAmount={false}
        />

        {/* Toggle Button for USD/Token Display */}
        <View style={styles.toggleContainer}>
          <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
            {`${formatPositionSize(closeAmount)} ${position.coin}`}
          </Text>
        </View>

        {/* Slider - Hidden when keypad/input is focused */}
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

        {/* Limit Price - only show for limit orders (still hidden during input to avoid overlap) */}
        {orderType === 'limit' && !isInputFocused && (
          <View style={styles.detailsWrapper}>
            <View style={[styles.detailItem, styles.detailListItem]}>
              <TouchableOpacity onPress={() => setIsLimitPriceVisible(true)}>
                <ListItem>
                  <ListItemColumn widthType={WidthType.Fill}>
                    <View style={styles.detailLeft}>
                      <Text
                        variant={TextVariant.BodyLGMedium}
                        color={TextColor.Alternative}
                      >
                        {strings('perps.order.limit_price')}
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleTooltipPress('limit_price')}
                        style={styles.infoIcon}
                      >
                        <Icon
                          name={IconName.Info}
                          size={IconSize.Sm}
                          color={IconColor.Muted}
                          testID={
                            PerpsOrderViewSelectorsIDs.LIMIT_PRICE_INFO_ICON
                          }
                        />
                      </TouchableOpacity>
                    </View>
                  </ListItemColumn>
                  <ListItemColumn widthType={WidthType.Auto}>
                    <Text
                      variant={TextVariant.BodyLGMedium}
                      color={TextColor.Default}
                    >
                      {limitPrice
                        ? `${formatPrice(limitPrice, { maximumDecimals: 2 })}`
                        : 'Set price'}
                    </Text>
                  </ListItemColumn>
                </ListItem>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Order Details moved to footer summary */}

        {/* Validation Messages - keep visible while typing */}
        {/* Filter the errors and only show minimum $10 error */}
        {filteredErrors.length > 0 && (
          <View style={styles.validationSection}>
            {filteredErrors.map((error, index) => (
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
      </ScrollView>

      {/* Keypad Section - Show when input is focused; keep summary and slider above */}
      {isInputFocused && (
        <View style={styles.bottomSection}>
          {/* Summary shown above keypad while editing */}
          {Summary}
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
            value={closeAmountUSDString}
            onChange={handleKeypadChange}
            currency={'USD'}
            decimals={2}
            style={styles.keypad}
          />
        </View>
      )}

      {/* Summary + Action Buttons - Always visible (button hidden when keypad active) */}
      <View style={[styles.footer, styles.footerWithSummary]}>
        {/* Summary Section (not shown here if input focused, as it's rendered above keypad) */}
        {!isInputFocused && Summary}
        {!isInputFocused && (
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
        )}
      </View>

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
        onClose={() => {
          setIsLimitPriceVisible(false);
          // If user dismisses without entering a price, revert order type to market
          if (orderType === 'limit' && !limitPrice) {
            setOrderType('market');
            showToast(
              PerpsToastOptions.positionManagement.closePosition.limitClose
                .partial.switchToMarketOrderMissingLimitPrice,
            );
          }
        }}
        onConfirm={(price) => {
          setLimitPrice(price);
          // Close after confirmation explicitly
          setIsLimitPriceVisible(false);
        }}
        asset={position.coin}
        limitPrice={limitPrice}
        currentPrice={currentPrice}
        direction={isLong ? 'short' : 'long'} // Opposite direction for closing
        isClosingPosition
      />

      {/* Tooltip Bottom Sheet */}
      {selectedTooltip ? (
        <PerpsBottomSheetTooltip
          isVisible
          onClose={handleTooltipClose}
          contentKey={selectedTooltip as PerpsTooltipContentKey}
          key={selectedTooltip}
          {...(selectedTooltip === 'closing_fees'
            ? {
                data: {
                  metamaskFeeRate: feeResults.metamaskFeeRate,
                  protocolFeeRate: feeResults.protocolFeeRate,
                },
              }
            : {})}
        />
      ) : null}
    </SafeAreaView>
  );
};

export default PerpsClosePositionView;
