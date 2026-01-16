import {
  useNavigation,
  useRoute,
  type NavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { View } from 'react-native';
import TouchableOpacity from '../../../../Base/TouchableOpacity';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PerpsClosePositionViewSelectorsIDs } from '../../Perps.testIds';
import { strings } from '../../../../../../locales/i18n';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import ListItem from '../../../../../component-library/components/List/ListItem';
import ListItemColumn, {
  WidthType,
} from '../../../../../component-library/components/List/ListItemColumn';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useTheme } from '../../../../../util/theme';
import Keypad from '../../../../Base/Keypad';
import type { InputMethod, OrderType, Position } from '../../controllers/types';
import type { PerpsNavigationParamList } from '../../types/navigation';
import {
  DECIMAL_PRECISION_CONFIG,
  ORDER_SLIPPAGE_CONFIG,
} from '../../constants/perpsConfig';
import {
  useMinimumOrderAmount,
  usePerpsClosePosition,
  usePerpsClosePositionValidation,
  usePerpsOrderFees,
  usePerpsRewards,
  usePerpsToasts,
  usePerpsMarketData,
} from '../../hooks';
import {
  usePerpsLivePositions,
  usePerpsLivePrices,
  usePerpsTopOfBook,
} from '../../hooks/stream';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { usePerpsMeasurement } from '../../hooks/usePerpsMeasurement';
import {
  formatPositionSize,
  formatPerpsFiat,
  PRICE_RANGES_UNIVERSAL,
} from '../../utils/formatUtils';
import {
  calculateCloseAmountFromPercentage,
  validateCloseAmountLimits,
  formatCloseAmountUSD,
} from '../../utils/positionCalculations';
import { createStyles } from './PerpsClosePositionView.styles';
import {
  PerpsEventProperties,
  PerpsEventValues,
} from '../../constants/eventNames';
import { MetaMetricsEvents } from '../../../../hooks/useMetrics';
import { TraceName } from '../../../../../util/trace';
import PerpsOrderHeader from '../../components/PerpsOrderHeader';
import PerpsAmountDisplay from '../../components/PerpsAmountDisplay';
import PerpsLimitPriceBottomSheet from '../../components/PerpsLimitPriceBottomSheet';
import PerpsSlider from '../../components/PerpsSlider/PerpsSlider';
import PerpsCloseSummary from '../../components/PerpsCloseSummary';
import { getPerpsDisplaySymbol } from '../../utils/marketUtils';

const PerpsClosePositionView: React.FC = () => {
  const theme = useTheme();
  const styles = createStyles(theme);
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const route =
    useRoute<RouteProp<PerpsNavigationParamList, 'PerpsClosePosition'>>();
  const { position } = route.params as { position: Position };

  const inputMethodRef = useRef<InputMethod>('default');
  const isAmountInitializedRef = useRef(false);

  const { showToast, PerpsToastOptions } = usePerpsToasts();

  // Get market data for szDecimals with automatic error toast handling
  const { marketData, isLoading: isLoadingMarketData } = usePerpsMarketData({
    asset: position.coin,
    showErrorToast: true,
  });

  // Track screen load performance with unified hook (immediate measurement)
  usePerpsMeasurement({
    traceName: TraceName.PerpsClosePositionView,
  });

  // State for order type and bottom sheets
  const [orderType, setOrderType] = useState<OrderType>('market');
  const [isLimitPriceVisible, setIsLimitPriceVisible] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isUserInputActive, setIsUserInputActive] = useState(false);

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

  // Use ref to access latest price without triggering fee recalculations
  // This prevents continuous recalculations on every WebSocket price update
  const currentPriceRef = useRef(currentPrice);
  currentPriceRef.current = currentPrice;

  // Get top of book data for maker/taker fee determination
  const currentTopOfBook = usePerpsTopOfBook({
    symbol: position.coin,
  });

  // Subscribe to live position updates for this coin
  // This ensures margin and PnL values include real-time funding fees
  const { positions: livePositions } = usePerpsLivePositions({
    throttleMs: 1000,
  });
  const livePosition = useMemo(
    () => livePositions.find((p) => p.coin === position.coin) || position,
    [livePositions, position],
  );

  // Determine position direction using live position data
  const isLong = parseFloat(livePosition.size) > 0;
  const absSize = Math.abs(parseFloat(livePosition.size));
  // Calculate effective price for calculations
  // For limit orders, use limit price when available; otherwise use current market price
  const effectivePrice = useMemo(() => {
    if (orderType === 'limit' && limitPrice) {
      const parsed = parseFloat(limitPrice);
      if (!isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }
    return currentPrice;
  }, [orderType, limitPrice, currentPrice]);

  // Calculate display values directly from closePercentage for immediate updates
  const { closeAmount, calculatedUSDString } = useMemo(() => {
    // During loading, return '0' as temporary state (not a default - intentional for loading UX)
    if (isLoadingMarketData) {
      return {
        closeAmount: '0',
        calculatedUSDString: '0.00',
      };
    }

    // Defensive fallback if market data fails to load - prevents crashes
    // Real szDecimals should come from market data (varies by asset)
    const szDecimals =
      marketData?.szDecimals ?? DECIMAL_PRECISION_CONFIG.FALLBACK_SIZE_DECIMALS;

    const { tokenAmount, usdValue } = calculateCloseAmountFromPercentage({
      percentage: closePercentage,
      positionSize: absSize,
      currentPrice: effectivePrice,
      szDecimals,
    });

    return {
      closeAmount: tokenAmount.toString(),
      calculatedUSDString: formatCloseAmountUSD(usdValue),
    };
  }, [
    closePercentage,
    absSize,
    effectivePrice,
    marketData?.szDecimals,
    isLoadingMarketData,
  ]);

  // Use calculated USD string when not in input mode, user input when typing
  const displayUSDString =
    isInputFocused || isUserInputActive
      ? closeAmountUSDString
      : calculatedUSDString;

  // Use live position data which includes real-time funding fees
  // HyperLiquid's marginUsed already includes accumulated PnL
  const marginUsed = parseFloat(livePosition.marginUsed);

  // Use unrealizedPnl from live position (includes funding fees)
  const unrealizedPnl = parseFloat(livePosition.unrealizedPnl);

  // Keep pnl reference for backwards compatibility with event tracking
  const pnl = unrealizedPnl;

  // Calculate position value and effective margin
  // For limit orders, use limit price for display calculations
  const positionValue = useMemo(() => {
    const priceToUse =
      orderType === 'limit' && limitPrice
        ? parseFloat(limitPrice)
        : currentPrice;
    return absSize * priceToUse;
  }, [absSize, orderType, limitPrice, currentPrice]);

  // Calculate P&L based on effective price (limit price for limit orders)
  // Use ref for market price to prevent recalculation on every WebSocket update
  const entryPrice = parseFloat(position.entryPrice);
  const effectivePnL = useMemo(() => {
    // Calculate P&L based on the effective price (limit price for limit orders)
    // For long positions: (effectivePrice - entryPrice) * absSize
    // For short positions: (entryPrice - effectivePrice) * absSize
    if (orderType === 'market') {
      return pnl;
    }
    const priceToUse = limitPrice ? parseFloat(limitPrice) : currentPrice;
    const priceDiff = isLong
      ? priceToUse - entryPrice
      : entryPrice - priceToUse;
    return priceDiff * absSize;
  }, [entryPrice, absSize, isLong, orderType, limitPrice, currentPrice, pnl]); // Exclude effectivePrice from deps

  // Calculate fees using the unified fee hook
  const closingValue = useMemo(
    () => positionValue * (closePercentage / 100),
    [positionValue, closePercentage],
  );
  const closingValueString = useMemo(
    () => closingValue.toString(),
    [closingValue],
  );

  const feeResults = usePerpsOrderFees({
    orderType,
    amount: closingValueString,
    coin: position.coin,
    isClosing: true,
    limitPrice,
    direction: isLong ? 'short' : 'long',
    currentAskPrice: currentTopOfBook?.bestAsk
      ? Number.parseFloat(currentTopOfBook.bestAsk)
      : undefined,
    currentBidPrice: currentTopOfBook?.bestBid
      ? Number.parseFloat(currentTopOfBook.bestBid)
      : undefined,
  });

  // Simple boolean calculation for rewards state
  const hasValidAmount = useMemo(
    () => closePercentage > 0 && closingValue > 0,
    [closePercentage, closingValue],
  );

  // Get rewards state using the new hook
  const rewardsState = usePerpsRewards({
    feeResults,
    hasValidAmount,
    isFeesLoading: feeResults.isLoadingMetamaskFee,
    orderAmount: closingValueString,
  });

  // Calculate what user will receive (margin - fees)
  // Round each component separately to match what user sees in UI
  // This ensures: displayed margin - displayed fees = displayed receive amount
  const receiveAmount = useMemo(() => {
    const marginPortion = (closePercentage / 100) * marginUsed;
    // Round margin and fees to 2 decimals (what user sees)
    const roundedMargin = Math.round(marginPortion * 100) / 100;
    const roundedFees = Math.round(feeResults.totalFee * 100) / 100;
    // Subtract rounded values for transparent calculation
    return roundedMargin - roundedFees;
  }, [closePercentage, marginUsed, feeResults.totalFee]);

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
    currentPrice: effectivePrice,
    positionSize: absSize,
    positionValue,
    minimumOrderAmount,
    closingValue,
    remainingPositionValue,
    receiveAmount,
    isPartialClose,
    skipValidation: isInputFocused,
  });

  const { handleClosePosition, isClosing } = usePerpsClosePosition();

  const unrealizedPnlPercent = useMemo(() => {
    const initialMargin = marginUsed - pnl; // Back-calculate initial margin
    return initialMargin > 0 ? (pnl / initialMargin) * 100 : 0;
  }, [marginUsed, pnl]);

  usePerpsEventTracking({
    eventName: MetaMetricsEvents.PERPS_SCREEN_VIEWED,
    properties: {
      [PerpsEventProperties.SCREEN_TYPE]:
        PerpsEventValues.SCREEN_TYPE.POSITION_CLOSE,
      [PerpsEventProperties.ASSET]: position.coin,
      [PerpsEventProperties.DIRECTION]: isLong
        ? PerpsEventValues.DIRECTION.LONG
        : PerpsEventValues.DIRECTION.SHORT,
      [PerpsEventProperties.POSITION_SIZE]: absSize,
      [PerpsEventProperties.UNREALIZED_PNL_DOLLAR]: pnl,
      [PerpsEventProperties.UNREALIZED_PNL_PERCENT]: unrealizedPnlPercent,
      [PerpsEventProperties.SOURCE]: PerpsEventValues.SOURCE.PERP_ASSET_SCREEN,
      [PerpsEventProperties.RECEIVED_AMOUNT]: receiveAmount,
    },
  });

  // Initialize USD values when price data is available (only once, not on price updates)
  useEffect(() => {
    if (!isAmountInitializedRef.current && absSize > 0 && effectivePrice > 0) {
      const initialUSDAmount = absSize * effectivePrice;
      setCloseAmountUSDString(formatCloseAmountUSD(initialUSDAmount));
      isAmountInitializedRef.current = true;
    }
  }, [absSize, effectivePrice]);

  // Sync closeAmountUSDString with calculatedUSDString when user is not actively editing
  // This prevents the jump when focusing input after price updates
  useEffect(() => {
    if (!isUserInputActive && isAmountInitializedRef.current) {
      setCloseAmountUSDString(calculatedUSDString);
    }
  }, [calculatedUSDString, isUserInputActive]);

  // Auto-open limit price bottom sheet when switching to limit order
  useEffect(() => {
    if (orderType === 'limit' && !limitPrice) {
      setIsLimitPriceVisible(true);
    }
  }, [orderType, limitPrice]);

  const handleConfirm = async () => {
    // For full close, don't send size parameter
    const sizeToClose = closePercentage === 100 ? undefined : closeAmount;
    const isFullClose = closePercentage === 100;

    // For limit orders, validate price
    if (orderType === 'limit' && !limitPrice) {
      return;
    }

    // Go back immediately to close the position screen
    navigation.goBack();

    await handleClosePosition({
      position: livePosition,
      size: sizeToClose || '',
      orderType,
      limitPrice: orderType === 'limit' ? limitPrice : undefined,
      trackingData: {
        totalFee: feeResults.totalFee,
        marketPrice: currentPrice,
        receivedAmount: receiveAmount,
        realizedPnl: effectivePnL * (closePercentage / 100),
        metamaskFeeRate: feeResults.metamaskFeeRate,
        feeDiscountPercentage: feeResults.feeDiscountPercentage,
        metamaskFee: feeResults.metamaskFee,
        estimatedPoints: rewardsState.estimatedPoints,
        inputMethod: inputMethodRef.current,
      },
      marketPrice: priceData[position.coin]?.price,
      // Always pass slippage parameters for price context
      // For 100% closes, omit usdAmount to bypass $10 minimum validation
      slippage: {
        usdAmount: isFullClose ? undefined : closingValueString,
        priceAtCalculation: effectivePrice,
        maxSlippageBps:
          orderType === 'limit'
            ? ORDER_SLIPPAGE_CONFIG.DEFAULT_LIMIT_SLIPPAGE_BPS // 1% for limit orders
            : ORDER_SLIPPAGE_CONFIG.DEFAULT_MARKET_SLIPPAGE_BPS, // 3% for market orders
      },
    });
  };

  const handleAmountPress = () => {
    setIsInputFocused(true);
  };

  const handleKeypadChange = useCallback(
    ({ value }: { value: string; valueAsNumber: number }) => {
      inputMethodRef.current = 'keypad';
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
    inputMethodRef.current = 'percentage';
    const newPercentage = percentage * 100;
    setClosePercentage(newPercentage);

    // Update USD input to match calculated value for keypad display consistency
    const newUSDAmount = (newPercentage / 100) * absSize * effectivePrice;
    setCloseAmountUSDString(formatCloseAmountUSD(newUSDAmount));
  };

  const handleMaxPress = () => {
    inputMethodRef.current = 'max';
    setClosePercentage(100);

    // Update USD input to match calculated value for keypad display consistency
    const newUSDAmount = absSize * effectivePrice;
    setCloseAmountUSDString(formatCloseAmountUSD(newUSDAmount));
  };

  const handleDonePress = () => {
    setIsInputFocused(false);
    setIsUserInputActive(false);
  };

  const handleSliderChange = (value: number) => {
    inputMethodRef.current = 'slider';
    setClosePercentage(value);

    // Update USD input to match calculated value for keypad display consistency
    const newUSDAmount = (value / 100) * absSize * effectivePrice;
    setCloseAmountUSDString(formatCloseAmountUSD(newUSDAmount));
  };

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
    <PerpsCloseSummary
      totalMargin={(closePercentage / 100) * marginUsed}
      totalPnl={effectivePnL * (closePercentage / 100)}
      totalFees={feeResults.totalFee}
      feeDiscountPercentage={rewardsState.feeDiscountPercentage}
      metamaskFeeRate={feeResults.metamaskFeeRate}
      protocolFeeRate={feeResults.protocolFeeRate}
      originalMetamaskFeeRate={feeResults.originalMetamaskFeeRate}
      receiveAmount={receiveAmount}
      shouldShowRewards={rewardsState.shouldShowRewardsRow}
      estimatedPoints={rewardsState.estimatedPoints}
      bonusBips={rewardsState.bonusBips}
      isLoadingFees={feeResults.isLoadingMetamaskFee}
      isLoadingRewards={rewardsState.isLoading}
      hasRewardsError={rewardsState.hasError}
      accountOptedIn={rewardsState.accountOptedIn}
      rewardsAccount={rewardsState.account}
      isInputFocused={isInputFocused}
      testIDs={{
        feesTooltip: PerpsClosePositionViewSelectorsIDs.FEES_TOOLTIP_BUTTON,
        receiveTooltip:
          PerpsClosePositionViewSelectorsIDs.YOU_RECEIVE_TOOLTIP_BUTTON,
        pointsTooltip: PerpsClosePositionViewSelectorsIDs.POINTS_TOOLTIP_BUTTON,
      }}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      <PerpsOrderHeader
        asset={position.coin}
        price={currentPrice}
        priceChange={parseFloat(
          priceData[position.coin]?.percentChange24h ?? '0',
        )}
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
          tokenAmount={formatPositionSize(closeAmount, marketData?.szDecimals)}
          hasError={filteredErrors.length > 0}
          tokenSymbol={position.coin}
          showMaxAmount={false}
        />

        {/* Toggle Button for USD/Token Display */}
        <View style={styles.toggleContainer}>
          <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
            {`${formatPositionSize(closeAmount, marketData?.szDecimals)} ${getPerpsDisplaySymbol(position.coin)}`}
          </Text>
        </View>

        {/* Slider - Hidden when keypad/input is focused */}
        {!isInputFocused && (
          <View style={styles.sliderSection}>
            <PerpsSlider
              value={closePercentage}
              onValueChange={handleSliderChange}
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
                    </View>
                  </ListItemColumn>
                  <ListItemColumn widthType={WidthType.Auto}>
                    <Text
                      variant={TextVariant.BodyLGMedium}
                      color={TextColor.Default}
                    >
                      {limitPrice
                        ? `${formatPerpsFiat(limitPrice, {
                            ranges: PRICE_RANGES_UNIVERSAL,
                          })}`
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
              <View key={`error-${index}`} style={styles.errorMessage}>
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
              !validationResult.isValid
            }
            loading={isClosing}
            testID={
              PerpsClosePositionViewSelectorsIDs.CLOSE_POSITION_CONFIRM_BUTTON
            }
          />
        )}
      </View>

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
    </SafeAreaView>
  );
};

export default PerpsClosePositionView;
