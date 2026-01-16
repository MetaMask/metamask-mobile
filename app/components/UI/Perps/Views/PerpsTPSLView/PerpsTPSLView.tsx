import React, { memo, useCallback, useRef, useState } from 'react';
import { Keyboard, ScrollView, TextInput, View } from 'react-native';
import TouchableOpacity from '../../../../Base/TouchableOpacity';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { strings } from '../../../../../../locales/i18n';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../component-library/components/Buttons/ButtonIcon';
import {
  IconColor,
  IconName,
} from '../../../../../component-library/components/Icons/Icon';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Keypad from '../../../../../components/Base/Keypad';
import { useTheme } from '../../../../../util/theme';

import { MetaMetricsEvents } from '../../../../hooks/useMetrics';
import {
  PerpsEventProperties,
  PerpsEventValues,
} from '../../constants/eventNames';
import { usePerpsLivePrices } from '../../hooks/stream';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import type { PerpsNavigationParamList } from '../../types/navigation';
import {
  getPerpsTPSLViewSelector,
  PerpsTPSLViewSelectorsIDs,
} from '../../Perps.testIds';
import { usePerpsTPSLForm } from '../../hooks/usePerpsTPSLForm';
import { usePerpsLiquidationPrice } from '../../hooks/usePerpsLiquidationPrice';
import { createStyles } from './PerpsTPSLView.styles';
import {
  formatPerpsFiat,
  PRICE_RANGES_UNIVERSAL,
  PRICE_RANGES_MINIMAL_VIEW,
} from '../../utils/formatUtils';
import {
  TP_SL_VIEW_CONFIG,
  PERPS_CONSTANTS,
} from '../../constants/perpsConfig';

const PerpsTPSLView: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<PerpsNavigationParamList, 'PerpsTPSL'>>();

  // Extract params from navigation route
  const {
    asset,
    currentPrice: initialCurrentPrice,
    direction,
    position,
    initialTakeProfitPrice,
    initialStopLossPrice,
    leverage: propLeverage,
    orderType,
    limitPrice,
    amount,
    szDecimals,
    onConfirm,
  } = route.params;

  const [isUpdating, setIsUpdating] = useState(false);
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const scrollViewRef = useRef<ScrollView>(null);

  // Keypad state management
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  // Refs for TextInput components to programmatically blur them
  const takeProfitPriceRef = useRef<TextInput>(null);
  const takeProfitPercentageRef = useRef<TextInput>(null);
  const stopLossPriceRef = useRef<TextInput>(null);
  const stopLossPercentageRef = useRef<TextInput>(null);

  // Subscribe to real-time price only when we have an asset
  // Use throttle for TP/SL screen to reduce re-renders
  const priceData = usePerpsLivePrices({
    symbols: asset ? [asset] : [],
    throttleMs: TP_SL_VIEW_CONFIG.PRICE_THROTTLE_MS,
  });
  const livePrice = priceData[asset]?.price
    ? parseFloat(priceData[asset].price)
    : undefined;

  // Use the current market price if available, otherwise use entry price
  // For new orders, use initialCurrentPrice
  // For existing positions, prefer live price over initial price over entry price
  const spotPrice =
    livePrice ||
    initialCurrentPrice ||
    (position?.entryPrice ? parseFloat(position.entryPrice) : 0);

  // For display purposes, use limit price for limit orders, otherwise use spot price
  const hasValidLimitPrice =
    orderType === 'limit' && limitPrice && parseFloat(limitPrice) > 0;
  const currentPrice = hasValidLimitPrice ? parseFloat(limitPrice) : spotPrice;

  // Determine the entry price based on order type
  // For limit orders, use the limit price as entry price if available
  // For market orders or when limit price is not set, use spot price
  // Ensure we always have a valid price > 0 for calculations
  let effectiveEntryPrice: number;
  if (position?.entryPrice) {
    effectiveEntryPrice = parseFloat(position.entryPrice);
  } else if (
    orderType === 'limit' &&
    limitPrice &&
    parseFloat(limitPrice) > 0
  ) {
    effectiveEntryPrice = parseFloat(limitPrice);
  } else if (spotPrice > 0) {
    effectiveEntryPrice = spotPrice;
  } else {
    effectiveEntryPrice = livePrice || initialCurrentPrice || 0;
  }

  // Determine direction for tracking events
  let actualDirection: 'long' | 'short';
  if (position) {
    actualDirection = parseFloat(position.size) > 0 ? 'long' : 'short';
  } else {
    actualDirection = direction || 'long';
  }

  // Calculate liquidation price for new orders (when there's no existing position)
  const shouldCalculateLiquidation =
    !position && currentPrice > 0 && propLeverage && actualDirection && asset;
  const { liquidationPrice: calculatedLiquidationPrice } =
    usePerpsLiquidationPrice({
      entryPrice: shouldCalculateLiquidation ? currentPrice : 0,
      leverage: shouldCalculateLiquidation ? propLeverage : 0,
      direction: shouldCalculateLiquidation ? actualDirection : 'long',
      asset: shouldCalculateLiquidation ? asset : '',
    });

  // Use position's liquidation price if available, otherwise use calculated price
  const displayLiquidationPrice =
    position?.liquidationPrice ||
    (shouldCalculateLiquidation ? calculatedLiquidationPrice : undefined);

  // Use the TPSL form hook for all state management and business logic
  const tpslForm = usePerpsTPSLForm({
    asset,
    currentPrice,
    direction,
    position,
    initialTakeProfitPrice,
    initialStopLossPrice,
    leverage: propLeverage,
    entryPrice: effectiveEntryPrice,
    isVisible: true,
    liquidationPrice: displayLiquidationPrice,
    orderType,
    amount,
    szDecimals,
  });

  // Extract form state and handlers for easier access
  const { takeProfitPrice, stopLossPrice } = tpslForm.formState;

  const {
    handleTakeProfitPriceChange,
    handleTakeProfitPercentageChange,
    handleStopLossPriceChange,
    handleStopLossPercentageChange,
    handleTakeProfitPriceFocus,
    handleTakeProfitPriceBlur,
    handleTakeProfitPercentageFocus,
    handleTakeProfitPercentageBlur,
    handleStopLossPriceFocus,
    handleStopLossPriceBlur,
    handleStopLossPercentageFocus,
    handleStopLossPercentageBlur,
  } = tpslForm.handlers;

  const {
    handleTakeProfitPercentageButton,
    handleStopLossPercentageButton,
    handleTakeProfitOff,
    handleStopLossOff,
  } = tpslForm.buttons;

  const {
    isValid,
    hasChanges,
    takeProfitError,
    stopLossError,
    stopLossLiquidationError,
  } = tpslForm.validation;
  const {
    formattedTakeProfitPercentage,
    formattedStopLossPercentage,
    expectedTakeProfitPnL,
    expectedStopLossPnL,
  } = tpslForm.display;

  // Determine if this is create (new order) or edit (existing position) TP/SL
  const isEditingExistingPosition = !!position;
  const tpslScreenType = isEditingExistingPosition
    ? PerpsEventValues.SCREEN_TYPE.EDIT_TPSL
    : PerpsEventValues.SCREEN_TYPE.CREATE_TPSL;

  usePerpsEventTracking({
    eventName: MetaMetricsEvents.PERPS_SCREEN_VIEWED,
    properties: {
      [PerpsEventProperties.SCREEN_TYPE]: tpslScreenType,
      [PerpsEventProperties.ASSET]: asset,
      [PerpsEventProperties.DIRECTION]:
        actualDirection === 'long'
          ? PerpsEventValues.DIRECTION.LONG
          : PerpsEventValues.DIRECTION.SHORT,
      // Add initial TP/SL state to understand what user already has set
      [PerpsEventProperties.HAS_TAKE_PROFIT]: !!initialTakeProfitPrice,
      [PerpsEventProperties.HAS_STOP_LOSS]: !!initialStopLossPrice,
    },
  });

  // Handle back button press
  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Keypad handlers
  const handleKeypadChange = useCallback(
    ({ value }: { value: string; valueAsNumber: number }) => {
      if (focusedInput === 'takeProfitPrice') {
        handleTakeProfitPriceChange(value);
      } else if (focusedInput === 'takeProfitPercentage') {
        handleTakeProfitPercentageChange(value);
      } else if (focusedInput === 'stopLossPrice') {
        handleStopLossPriceChange(value);
      } else if (focusedInput === 'stopLossPercentage') {
        const trimmedValue = value.trim();
        const valueToUse =
          trimmedValue.length === 1 && trimmedValue !== '0'
            ? `-${value}`
            : value.trim();
        handleStopLossPercentageChange(valueToUse);
      }
    },
    [
      focusedInput,
      handleTakeProfitPriceChange,
      handleTakeProfitPercentageChange,
      handleStopLossPriceChange,
      handleStopLossPercentageChange,
    ],
  );

  const handleInputFocus = useCallback(
    (inputType: string) => {
      setFocusedInput(inputType);

      // Auto-scroll to keep input visible when keypad is active
      if (scrollViewRef.current) {
        let yOffset = 0;

        // Calculate scroll position based on which input is focused
        switch (inputType) {
          case 'takeProfitPrice':
          case 'takeProfitPercentage':
            yOffset = 150; // Take Profit section
            break;
          case 'stopLossPrice':
          case 'stopLossPercentage':
            yOffset = 350; // Stop Loss section
            break;
        }

        scrollViewRef.current.scrollTo({
          y: yOffset,
          animated: true,
        });
      }

      // Call the appropriate original focus handler
      switch (inputType) {
        case 'takeProfitPrice':
          handleTakeProfitPriceFocus();
          break;
        case 'takeProfitPercentage':
          handleTakeProfitPercentageFocus();
          break;
        case 'stopLossPrice':
          handleStopLossPriceFocus();
          break;
        case 'stopLossPercentage':
          handleStopLossPercentageFocus();
          break;
      }
    },
    [
      handleTakeProfitPriceFocus,
      handleTakeProfitPercentageFocus,
      handleStopLossPriceFocus,
      handleStopLossPercentageFocus,
    ],
  );

  const handleInputBlur = useCallback(() => {
    // Call the appropriate original blur handler based on which input was focused
    if (focusedInput === 'takeProfitPrice') {
      handleTakeProfitPriceBlur();
    } else if (focusedInput === 'takeProfitPercentage') {
      handleTakeProfitPercentageBlur();
    } else if (focusedInput === 'stopLossPrice') {
      handleStopLossPriceBlur();
    } else if (focusedInput === 'stopLossPercentage') {
      handleStopLossPercentageBlur();
    }

    setFocusedInput(null);
  }, [
    focusedInput,
    handleTakeProfitPriceBlur,
    handleTakeProfitPercentageBlur,
    handleStopLossPriceBlur,
    handleStopLossPercentageBlur,
  ]);

  const dismissKeypad = useCallback(() => {
    // Blur the currently focused input to trigger onBlur events
    if (focusedInput === 'takeProfitPrice') {
      takeProfitPriceRef.current?.blur();
    } else if (focusedInput === 'takeProfitPercentage') {
      takeProfitPercentageRef.current?.blur();
    } else if (focusedInput === 'stopLossPrice') {
      stopLossPriceRef.current?.blur();
    } else if (focusedInput === 'stopLossPercentage') {
      stopLossPercentageRef.current?.blur();
    }
    setFocusedInput(null);
  }, [focusedInput]);

  const handleConfirm = useCallback(async () => {
    if (focusedInput) {
      dismissKeypad();
    }

    // Parse the formatted prices back to plain numbers for storage
    // Check for non-empty strings (empty strings should be treated as undefined)
    const parseTakeProfitPrice = takeProfitPrice?.trim()
      ? takeProfitPrice.replace(/[$,]/g, '')
      : undefined;
    const parseStopLossPrice = stopLossPrice?.trim()
      ? stopLossPrice.replace(/[$,]/g, '')
      : undefined;

    setIsUpdating(true);
    try {
      // Pass tracking data to avoid duplicate position fetch in controller
      // Use appropriate source based on context:
      // - POSITION_SCREEN when editing TP/SL on an existing position
      // - TRADE_SCREEN when setting TP/SL for a new order
      const trackingData = {
        direction: actualDirection,
        source: isEditingExistingPosition
          ? PerpsEventValues.RISK_MANAGEMENT_SOURCE.POSITION_SCREEN
          : PerpsEventValues.RISK_MANAGEMENT_SOURCE.TRADE_SCREEN,
        positionSize: position?.size ? Math.abs(parseFloat(position.size)) : 0,
        takeProfitPercentage: formattedTakeProfitPercentage
          ? parseFloat(formattedTakeProfitPercentage.replace('%', ''))
          : undefined,
        stopLossPercentage: formattedStopLossPercentage
          ? parseFloat(formattedStopLossPercentage.replace('%', ''))
          : undefined,
        isEditingExistingPosition,
        entryPrice: effectiveEntryPrice,
      };
      await onConfirm(parseTakeProfitPrice, parseStopLossPrice, trackingData);
      navigation.goBack();
    } finally {
      setIsUpdating(false);
    }
  }, [
    focusedInput,
    takeProfitPrice,
    stopLossPrice,
    onConfirm,
    dismissKeypad,
    navigation,
    actualDirection,
    position,
    formattedTakeProfitPercentage,
    formattedStopLossPercentage,
    isEditingExistingPosition,
    effectiveEntryPrice,
  ]);

  const confirmDisabled = !hasChanges || !isValid || isUpdating;
  const inputsDisabled = isUpdating;

  // Wrapper handlers to dismiss keyboard before clearing
  const handleTakeProfitClear = useCallback(() => {
    if (focusedInput) {
      dismissKeypad();
    }
    handleTakeProfitOff();
  }, [focusedInput, dismissKeypad, handleTakeProfitOff]);

  const handleStopLossClear = useCallback(() => {
    if (focusedInput) {
      dismissKeypad();
    }
    handleStopLossOff();
  }, [focusedInput, dismissKeypad, handleStopLossOff]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Simple header with back button and title */}
      <View style={styles.header}>
        <View style={styles.headerBackButton}>
          <ButtonIcon
            iconName={IconName.ArrowLeft}
            iconColor={IconColor.Default}
            size={ButtonIconSizes.Md}
            onPress={handleBack}
            testID={PerpsTPSLViewSelectorsIDs.BACK_BUTTON}
          />
        </View>
        <View style={styles.headerTitleContainer}>
          <Text variant={TextVariant.HeadingSM} color={TextColor.Default}>
            {strings('perps.tpsl.title')}
          </Text>
        </View>
      </View>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        onScrollBeginDrag={Keyboard.dismiss}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.scrollContent} testID="scroll-content">
          {/* Current price and liquidation price info */}
          <View
            style={
              focusedInput
                ? styles.priceInfoContainerCondensed
                : styles.priceInfoContainer
            }
          >
            {position && (
              <View style={styles.priceInfoRow}>
                <Text
                  variant={TextVariant.BodyMD}
                  color={TextColor.Alternative}
                >
                  {strings('perps.tpsl.entry_price')}
                </Text>
                <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
                  {position.entryPrice !== undefined &&
                  position.entryPrice !== null &&
                  position.entryPrice !== 'null' &&
                  position.entryPrice !== '0.00'
                    ? formatPerpsFiat(position.entryPrice, {
                        ranges: PRICE_RANGES_UNIVERSAL,
                      })
                    : PERPS_CONSTANTS.FALLBACK_PRICE_DISPLAY}
                </Text>
              </View>
            )}
            <View style={styles.priceInfoRow}>
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                {orderType === 'limit' &&
                limitPrice &&
                parseFloat(limitPrice) > 0
                  ? strings('perps.order.limit_price')
                  : strings('perps.tpsl.current_price')}
              </Text>
              <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
                {currentPrice !== undefined && currentPrice !== null
                  ? formatPerpsFiat(currentPrice, {
                      ranges: PRICE_RANGES_UNIVERSAL,
                    })
                  : PERPS_CONSTANTS.FALLBACK_PRICE_DISPLAY}
              </Text>
            </View>
            <View style={styles.priceInfoRow}>
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                {strings('perps.tpsl.liquidation_price')}
              </Text>
              <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
                {displayLiquidationPrice !== undefined &&
                displayLiquidationPrice !== null &&
                displayLiquidationPrice !== 'null' &&
                displayLiquidationPrice !== '0.00'
                  ? formatPerpsFiat(displayLiquidationPrice, {
                      ranges: PRICE_RANGES_UNIVERSAL,
                    })
                  : PERPS_CONSTANTS.FALLBACK_PRICE_DISPLAY}
              </Text>
            </View>
          </View>

          {/* Take Profit Section */}
          <View style={focusedInput ? styles.sectionCondensed : styles.section}>
            {/* Section title row with Clear button */}
            <View style={styles.sectionTitleRow}>
              <Text variant={TextVariant.HeadingSM} color={TextColor.Default}>
                {actualDirection === 'short'
                  ? strings('perps.tpsl.take_profit_short')
                  : strings('perps.tpsl.take_profit_long')}
              </Text>
              {Boolean(takeProfitPrice) && (
                <TouchableOpacity
                  onPress={handleTakeProfitClear}
                  disabled={inputsDisabled}
                >
                  <Text variant={TextVariant.BodyMD} color={TextColor.Primary}>
                    {strings('perps.tpsl.clear')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Percentage buttons */}
            <View style={styles.percentageButtonsContainer}>
              {TP_SL_VIEW_CONFIG.TAKE_PROFIT_ROE_PRESETS.map((percentage) => (
                <TouchableOpacity
                  key={percentage}
                  style={styles.percentageButton}
                  onPress={() => handleTakeProfitPercentageButton(percentage)}
                  testID={getPerpsTPSLViewSelector.takeProfitPercentageButton(
                    percentage,
                  )}
                  disabled={inputsDisabled}
                >
                  <Text
                    variant={TextVariant.BodySM}
                    color={TextColor.Default}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    +{percentage}%
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Input row */}
            <View style={styles.inputRow}>
              {/* Price Input */}
              <View
                style={[
                  styles.inputContainer,
                  !isValid && takeProfitError && styles.inputError,
                ]}
              >
                <Text
                  variant={TextVariant.BodyMD}
                  color={TextColor.Alternative}
                >
                  {strings('perps.tpsl.usd_label')}
                </Text>
                <TextInput
                  ref={takeProfitPriceRef}
                  style={styles.input}
                  value={takeProfitPrice}
                  onChangeText={(text) => {
                    const digitCount = (text.match(/\d/g) || []).length;
                    if (digitCount > TP_SL_VIEW_CONFIG.MAX_INPUT_DIGITS) return;
                    handleTakeProfitPriceChange(text);
                  }}
                  placeholder={strings('perps.tpsl.trigger_price_placeholder')}
                  placeholderTextColor={colors.text.muted}
                  showSoftInputOnFocus={false}
                  editable={!inputsDisabled}
                  onFocus={() => {
                    handleInputFocus('takeProfitPrice');
                  }}
                  onBlur={() => {
                    handleTakeProfitPriceBlur();
                    handleInputBlur();
                  }}
                  selectionColor={colors.primary.default}
                  cursorColor={colors.primary.default}
                />
              </View>

              {/* RoE Percentage Input */}
              <View
                style={[
                  styles.inputContainer,
                  !isValid && takeProfitError && styles.inputError,
                ]}
              >
                <TextInput
                  ref={takeProfitPercentageRef}
                  style={styles.input}
                  value={formattedTakeProfitPercentage}
                  onChangeText={(text) => {
                    const digitCount = (text.match(/\d/g) || []).length;
                    if (digitCount > TP_SL_VIEW_CONFIG.MAX_INPUT_DIGITS) return;
                    handleTakeProfitPercentageChange(text);
                  }}
                  placeholder={strings('perps.tpsl.profit_roe_placeholder')}
                  placeholderTextColor={colors.text.muted}
                  showSoftInputOnFocus={false}
                  editable={!inputsDisabled}
                  onFocus={() => {
                    handleInputFocus('takeProfitPercentage');
                  }}
                  onBlur={() => {
                    handleTakeProfitPercentageBlur();
                    handleInputBlur();
                  }}
                  selectionColor={colors.primary.default}
                  cursorColor={colors.primary.default}
                />
                <Text
                  variant={TextVariant.BodyMD}
                  color={TextColor.Alternative}
                >
                  %
                </Text>
              </View>
            </View>

            {/* Expected Profit/Loss for Take Profit */}
            {Boolean(takeProfitPrice) &&
              expectedTakeProfitPnL !== undefined && (
                <Text
                  variant={TextVariant.BodyMD}
                  color={TextColor.Alternative}
                  style={styles.expectedPnLText}
                >
                  {expectedTakeProfitPnL >= 0
                    ? strings('perps.tpsl.expected_profit', {
                        amount: formatPerpsFiat(
                          Math.abs(expectedTakeProfitPnL),
                          {
                            ranges: PRICE_RANGES_MINIMAL_VIEW,
                          },
                        ),
                      })
                    : strings('perps.tpsl.expected_loss', {
                        amount: formatPerpsFiat(
                          Math.abs(expectedTakeProfitPnL),
                          {
                            ranges: PRICE_RANGES_MINIMAL_VIEW,
                          },
                        ),
                      })}
                </Text>
              )}
            {Boolean(takeProfitPrice) &&
              expectedTakeProfitPnL === undefined && (
                <Text
                  variant={TextVariant.BodyMD}
                  color={TextColor.Alternative}
                  style={styles.expectedPnLText}
                >
                  {PERPS_CONSTANTS.FALLBACK_DATA_DISPLAY}
                </Text>
              )}

            {/* Error message */}
            {!isValid && Boolean(takeProfitError) && (
              <Text variant={TextVariant.BodySM} color={TextColor.Error}>
                {takeProfitError}
              </Text>
            )}
          </View>

          {/* Stop Loss Section */}
          <View style={focusedInput ? styles.sectionCondensed : styles.section}>
            {/* Section title row with Clear button */}
            <View style={styles.sectionTitleRow}>
              <Text variant={TextVariant.HeadingSM} color={TextColor.Default}>
                {actualDirection === 'short'
                  ? strings('perps.tpsl.stop_loss_short')
                  : strings('perps.tpsl.stop_loss_long')}
              </Text>
              {Boolean(stopLossPrice) && (
                <TouchableOpacity
                  onPress={handleStopLossClear}
                  disabled={inputsDisabled}
                >
                  <Text variant={TextVariant.BodyMD} color={TextColor.Primary}>
                    {strings('perps.tpsl.clear')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Percentage buttons */}
            <View style={styles.percentageButtonsContainer}>
              {TP_SL_VIEW_CONFIG.STOP_LOSS_ROE_PRESETS.map((percentage) => (
                <TouchableOpacity
                  key={percentage}
                  style={styles.percentageButton}
                  onPress={() => handleStopLossPercentageButton(percentage)}
                  testID={getPerpsTPSLViewSelector.stopLossPercentageButton(
                    percentage,
                  )}
                  disabled={inputsDisabled}
                >
                  <Text
                    variant={TextVariant.BodySM}
                    color={TextColor.Default}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {percentage}%
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Input row */}
            <View style={styles.inputRow}>
              {/* Price Input */}
              <View
                style={[
                  styles.inputContainer,
                  !isValid && stopLossError && styles.inputError,
                ]}
              >
                <Text
                  variant={TextVariant.BodyMD}
                  color={TextColor.Alternative}
                >
                  {strings('perps.tpsl.usd_label')}
                </Text>
                <TextInput
                  ref={stopLossPriceRef}
                  style={styles.input}
                  value={stopLossPrice}
                  onChangeText={(text) => {
                    const digitCount = (text.match(/\d/g) || []).length;
                    if (digitCount > TP_SL_VIEW_CONFIG.MAX_INPUT_DIGITS) return;
                    handleStopLossPriceChange(text);
                  }}
                  placeholder={strings('perps.tpsl.trigger_price_placeholder')}
                  placeholderTextColor={colors.text.muted}
                  showSoftInputOnFocus={false}
                  editable={!inputsDisabled}
                  onFocus={() => {
                    handleInputFocus('stopLossPrice');
                  }}
                  onBlur={() => {
                    handleStopLossPriceBlur();
                    handleInputBlur();
                  }}
                  selectionColor={colors.primary.default}
                  cursorColor={colors.primary.default}
                />
              </View>

              {/* Percentage Input */}
              <View
                style={[
                  styles.inputContainer,
                  !isValid && stopLossError && styles.inputError,
                ]}
              >
                <TextInput
                  ref={stopLossPercentageRef}
                  style={styles.input}
                  value={formattedStopLossPercentage}
                  onChangeText={(text) => {
                    const digitCount = (text.match(/\d/g) || []).length;
                    if (digitCount > TP_SL_VIEW_CONFIG.MAX_INPUT_DIGITS) return;
                    handleStopLossPercentageChange(text);
                  }}
                  placeholder={strings('perps.tpsl.loss_roe_placeholder')}
                  placeholderTextColor={colors.text.muted}
                  showSoftInputOnFocus={false}
                  editable={!inputsDisabled}
                  onFocus={() => {
                    handleInputFocus('stopLossPercentage');
                  }}
                  onBlur={() => {
                    handleStopLossPercentageBlur();
                    handleInputBlur();
                  }}
                  selectionColor={colors.primary.default}
                  cursorColor={colors.primary.default}
                />
                <Text
                  variant={TextVariant.BodyMD}
                  color={TextColor.Alternative}
                >
                  %
                </Text>
              </View>
            </View>

            {/* Expected Profit/Loss for Stop Loss */}
            {Boolean(stopLossPrice) && expectedStopLossPnL !== undefined && (
              <Text
                variant={TextVariant.BodyMD}
                color={TextColor.Alternative}
                style={styles.expectedPnLText}
              >
                {expectedStopLossPnL >= 0
                  ? strings('perps.tpsl.expected_profit', {
                      amount: formatPerpsFiat(Math.abs(expectedStopLossPnL), {
                        ranges: PRICE_RANGES_MINIMAL_VIEW,
                      }),
                    })
                  : strings('perps.tpsl.expected_loss', {
                      amount: formatPerpsFiat(Math.abs(expectedStopLossPnL), {
                        ranges: PRICE_RANGES_MINIMAL_VIEW,
                      }),
                    })}
              </Text>
            )}
            {Boolean(stopLossPrice) && expectedStopLossPnL === undefined && (
              <Text
                variant={TextVariant.BodyMD}
                color={TextColor.Alternative}
                style={styles.expectedPnLText}
              >
                {PERPS_CONSTANTS.FALLBACK_DATA_DISPLAY}
              </Text>
            )}

            {/* Error message */}
            {!isValid && Boolean(stopLossError || stopLossLiquidationError) && (
              <Text variant={TextVariant.BodySM} color={TextColor.Error}>
                {stopLossError || stopLossLiquidationError}
              </Text>
            )}
          </View>
        </View>
      </ScrollView>

      <View style={styles.keypadFooter}>
        {focusedInput ? (
          <>
            <Button
              style={styles.doneButton}
              label={strings('perps.tpsl.done')}
              variant={ButtonVariants.Primary}
              size={ButtonSize.Lg}
              width={ButtonWidthTypes.Full}
              onPress={dismissKeypad}
            />
            <View style={styles.keypadContainer}>
              <Keypad
                value={(() => {
                  if (focusedInput === 'takeProfitPrice')
                    return takeProfitPrice;
                  if (focusedInput === 'takeProfitPercentage')
                    return formattedTakeProfitPercentage;
                  if (focusedInput === 'stopLossPrice') return stopLossPrice;
                  return formattedStopLossPercentage;
                })()}
                onChange={handleKeypadChange}
                currency={TP_SL_VIEW_CONFIG.KEYPAD_CURRENCY_CODE}
                decimals={TP_SL_VIEW_CONFIG.KEYPAD_DECIMALS}
              />
            </View>
          </>
        ) : (
          <View style={styles.footer}>
            <View style={styles.footerButtonsRow}>
              <Button
                style={styles.footerButton}
                label={strings('perps.tpsl.cancel')}
                variant={ButtonVariants.Secondary}
                size={ButtonSize.Lg}
                onPress={handleBack}
              />
              <Button
                style={styles.footerButton}
                label={strings('perps.tpsl.set')}
                variant={ButtonVariants.Primary}
                size={ButtonSize.Lg}
                onPress={handleConfirm}
                isDisabled={confirmDisabled}
                loading={isUpdating}
                testID={PerpsTPSLViewSelectorsIDs.BOTTOM_SHEET}
              />
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

export default memo(PerpsTPSLView);
