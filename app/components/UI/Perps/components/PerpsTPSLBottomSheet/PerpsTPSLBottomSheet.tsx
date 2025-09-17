import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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
import Keypad from '../../../../../components/Base/Keypad';
import { useTheme } from '../../../../../util/theme';

import { MetaMetricsEvents } from '../../../../hooks/useMetrics';
import {
  PerpsEventProperties,
  PerpsEventValues,
} from '../../constants/eventNames';
import { PerpsMeasurementName } from '../../constants/performanceMetrics';
import type { Position } from '../../controllers/types';
import { usePerpsPerformance } from '../../hooks';
import { usePerpsLivePrices } from '../../hooks/stream';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import {
  getPerpsTPSLBottomSheetSelector,
  PerpsTPSLBottomSheetSelectorsIDs,
} from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import { usePerpsTPSLForm } from '../../hooks/usePerpsTPSLForm';
import { usePerpsLiquidationPrice } from '../../hooks/usePerpsLiquidationPrice';
import { createStyles } from './PerpsTPSLBottomSheet.styles';
import {
  formatPerpsFiat,
  PRICE_RANGES_POSITION_VIEW,
} from '../../utils/formatUtils';
import { Button } from '@metamask/design-system-react-native';

// Quick percentage buttons constants - RoE percentages
const TAKE_PROFIT_PERCENTAGES = [10, 25, 50, 100]; // +10%, +25%, +50%, +100% RoE
const STOP_LOSS_PERCENTAGES = [5, 10, 25, 50]; // -5%, -10%, -25%, -50% RoE

interface PerpsTPSLBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onConfirm: (takeProfitPrice?: string, stopLossPrice?: string) => void;
  // Context data
  asset: string;
  currentPrice?: number;
  direction?: 'long' | 'short'; // For new orders
  position?: Position; // For existing positions
  initialTakeProfitPrice?: string;
  initialStopLossPrice?: string;
  isUpdating?: boolean;
  leverage?: number; // For new orders
  marginRequired?: string; // For new orders
  orderType?: 'market' | 'limit'; // Order type for new orders
  limitPrice?: string; // Limit price for limit orders
}

const PerpsTPSLBottomSheet: React.FC<PerpsTPSLBottomSheetProps> = ({
  isVisible,
  onClose,
  onConfirm,
  asset,
  currentPrice: initialCurrentPrice,
  direction,
  position,
  initialTakeProfitPrice,
  initialStopLossPrice,
  isUpdating = false,
  leverage: propLeverage,
  orderType,
  limitPrice,
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const { startMeasure, endMeasure } = usePerpsPerformance();

  // Keypad state management
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  // Refs for TextInput components to programmatically blur them
  const takeProfitPriceRef = useRef<TextInput>(null);
  const takeProfitPercentageRef = useRef<TextInput>(null);
  const stopLossPriceRef = useRef<TextInput>(null);
  const stopLossPercentageRef = useRef<TextInput>(null);

  const { track } = usePerpsEventTracking();

  // Subscribe to real-time price only when visible and we have an asset
  // Use 1s debounce for TP/SL bottom sheet
  const priceData = usePerpsLivePrices({
    symbols: isVisible && asset ? [asset] : [],
    throttleMs: 1000,
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
  const currentPrice =
    orderType === 'limit' && limitPrice && parseFloat(limitPrice) > 0
      ? parseFloat(limitPrice)
      : spotPrice;

  // Determine the entry price based on order type
  // For limit orders, use the limit price as entry price if available
  // For market orders or when limit price is not set, use spot price
  // Ensure we always have a valid price > 0 for calculations
  const effectiveEntryPrice = position?.entryPrice
    ? parseFloat(position.entryPrice)
    : orderType === 'limit' && limitPrice && parseFloat(limitPrice) > 0
    ? parseFloat(limitPrice)
    : spotPrice > 0
    ? spotPrice
    : livePrice || initialCurrentPrice || 0;

  // Determine direction for tracking events
  const actualDirection = position
    ? parseFloat(position.size) > 0
      ? 'long'
      : 'short'
    : direction;

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
    isVisible,
    liquidationPrice: displayLiquidationPrice,
    orderType,
  });

  // Extract form state and handlers for easier access
  const {
    takeProfitPrice,
    stopLossPrice,
    selectedTpPercentage,
    selectedSlPercentage,
    tpUsingPercentage,
    slUsingPercentage,
  } = tpslForm.formState;

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
  const { formattedTakeProfitPercentage, formattedStopLossPercentage } =
    tpslForm.display;

  useEffect(() => {
    if (isVisible) {
      startMeasure(PerpsMeasurementName.TP_SL_BOTTOM_SHEET_LOADED);
      bottomSheetRef.current?.onOpenBottomSheet(() => {
        // Measure TP/SL bottom sheet loaded when animation actually completes
        endMeasure(PerpsMeasurementName.TP_SL_BOTTOM_SHEET_LOADED);
      });
    }
  }, [isVisible, startMeasure, endMeasure]);

  // Scroll to bottom when keypad opens
  // useEffect(() => {
  //   if (focusedInput) {
  //     // Small delay to ensure the keypad is rendered
  //     scrollViewRef.current?.scrollToEnd({ animated: true });
  //   }
  // }, [focusedInput]);

  const handleConfirm = useCallback(() => {
    // Parse the formatted prices back to plain numbers for storage
    // Check for non-empty strings (empty strings should be treated as undefined)
    const parseTakeProfitPrice = takeProfitPrice?.trim()
      ? takeProfitPrice.replace(/[$,]/g, '')
      : undefined;
    const parseStopLossPrice = stopLossPrice?.trim()
      ? stopLossPrice.replace(/[$,]/g, '')
      : undefined;

    // Track stop loss and take profit set events
    if (parseStopLossPrice) {
      track(MetaMetricsEvents.PERPS_STOP_LOSS_SET, {
        [PerpsEventProperties.ASSET]: asset,
        [PerpsEventProperties.DIRECTION]:
          actualDirection === 'long'
            ? PerpsEventValues.DIRECTION.LONG
            : PerpsEventValues.DIRECTION.SHORT,
        [PerpsEventProperties.STOP_LOSS_PRICE]: parseFloat(parseStopLossPrice),
        [PerpsEventProperties.INPUT_METHOD]: slUsingPercentage
          ? PerpsEventValues.INPUT_METHOD.PERCENTAGE_BUTTON
          : PerpsEventValues.INPUT_METHOD.MANUAL,
      });
    }

    if (parseTakeProfitPrice) {
      track(MetaMetricsEvents.PERPS_TAKE_PROFIT_SET, {
        [PerpsEventProperties.ASSET]: asset,
        [PerpsEventProperties.DIRECTION]:
          actualDirection === 'long'
            ? PerpsEventValues.DIRECTION.LONG
            : PerpsEventValues.DIRECTION.SHORT,
        [PerpsEventProperties.TAKE_PROFIT_PRICE]:
          parseFloat(parseTakeProfitPrice),
        [PerpsEventProperties.INPUT_METHOD]: tpUsingPercentage
          ? PerpsEventValues.INPUT_METHOD.PERCENTAGE_BUTTON
          : PerpsEventValues.INPUT_METHOD.MANUAL,
      });
    }

    onConfirm(parseTakeProfitPrice, parseStopLossPrice);
    // Don't close immediately - let the parent handle closing after update completes
  }, [
    takeProfitPrice,
    stopLossPrice,
    onConfirm,
    actualDirection,
    asset,
    slUsingPercentage,
    tpUsingPercentage,
    track,
  ]);

  // Handle close without saving
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

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
        handleStopLossPercentageChange(value);
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

  // Show overlay if updating
  const showOverlay = isUpdating;

  const confirmDisabled = !hasChanges || !isValid;

  if (!isVisible) return null;

  console.log('focusedInput', focusedInput);

  return (
    <>
      <BottomSheet
        ref={bottomSheetRef}
        shouldNavigateBack={false}
        onClose={handleClose}
        testID={PerpsTPSLBottomSheetSelectorsIDs.BOTTOM_SHEET}
      >
        <BottomSheetHeader onClose={handleClose}>
          <Text variant={TextVariant.HeadingMD}>
            {strings('perps.tpsl.title')}
          </Text>
        </BottomSheetHeader>
        <ScrollView ref={scrollViewRef} contentContainerStyle={styles.content}>
          <TouchableOpacity
            style={styles.scrollContent}
            activeOpacity={1}
            testID="scroll-content"
            onPress={() => {
              if (focusedInput) {
                dismissKeypad();
              }
            }}
          >
            {showOverlay && (
              <View style={styles.overlay}>
                <ActivityIndicator
                  size="large"
                  color={colors.primary.default}
                />
              </View>
            )}

            {/* Description text */}
            <Text
              variant={TextVariant.BodyMD}
              color={TextColor.Default}
              style={styles.description}
            >
              {strings('perps.tpsl.description')}
            </Text>

            {/* Current price and liquidation price info */}
            <View style={styles.priceInfoContainer}>
              <View style={styles.priceInfoRow}>
                <Text
                  variant={TextVariant.BodyMD}
                  color={TextColor.Alternative}
                >
                  {orderType === 'limit' &&
                  limitPrice &&
                  parseFloat(limitPrice) > 0
                    ? strings('perps.order.limit_price')
                    : strings('perps.tpsl.current_price')}
                </Text>
                <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
                  {currentPrice
                    ? formatPerpsFiat(currentPrice, {
                        ranges: PRICE_RANGES_POSITION_VIEW,
                      })
                    : '--'}
                </Text>
              </View>
              <View style={styles.priceInfoRow}>
                <Text
                  variant={TextVariant.BodyMD}
                  color={TextColor.Alternative}
                >
                  {strings('perps.tpsl.liquidation_price')}
                </Text>
                <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
                  {displayLiquidationPrice &&
                  displayLiquidationPrice !== 'null' &&
                  displayLiquidationPrice !== '0.00'
                    ? formatPerpsFiat(displayLiquidationPrice, {
                        ranges: PRICE_RANGES_POSITION_VIEW,
                      })
                    : '--'}
                </Text>
              </View>
            </View>

            {/* Take Profit Section */}
            <View style={styles.section}>
              <Text
                variant={TextVariant.HeadingSM}
                color={TextColor.Default}
                style={styles.sectionTitle}
              >
                {actualDirection === 'short'
                  ? strings('perps.tpsl.take_profit_short')
                  : strings('perps.tpsl.take_profit_long')}
              </Text>

              {/* Percentage buttons */}
              <View style={styles.percentageButtonsContainer}>
                <TouchableOpacity
                  style={[
                    styles.percentageButton,
                    !takeProfitPrice && styles.percentageButtonOff,
                  ]}
                  onPress={handleTakeProfitOff}
                  disabled={!!focusedInput}
                >
                  <Text variant={TextVariant.BodySM} color={TextColor.Default}>
                    {strings('perps.tpsl.off')}
                  </Text>
                </TouchableOpacity>
                {TAKE_PROFIT_PERCENTAGES.map((percentage) => (
                  <TouchableOpacity
                    key={percentage}
                    style={[
                      styles.percentageButton,
                      selectedTpPercentage === percentage &&
                        styles.percentageButtonActiveTP,
                    ]}
                    onPress={() => handleTakeProfitPercentageButton(percentage)}
                    testID={getPerpsTPSLBottomSheetSelector.takeProfitPercentageButton(
                      percentage,
                    )}
                    disabled={!!focusedInput}
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
                  <TextInput
                    ref={takeProfitPriceRef}
                    style={styles.input}
                    value={takeProfitPrice}
                    onChangeText={(text) => {
                      const digitCount = (text.match(/\d/g) || []).length;
                      if (digitCount > 9) return; // Block input beyond 9 digits
                      handleTakeProfitPriceChange(text);
                    }}
                    placeholder={strings(
                      'perps.tpsl.trigger_price_placeholder',
                    )}
                    placeholderTextColor={colors.text.muted}
                    showSoftInputOnFocus={false}
                    editable
                    onFocus={() => {
                      console.log('onFocus', 'takeProfitPrice');
                      handleInputFocus('takeProfitPrice');
                    }}
                    onBlur={() => {
                      handleTakeProfitPriceBlur();
                      handleInputBlur();
                    }}
                    selectionColor={colors.primary.default}
                    cursorColor={colors.primary.default}
                  />
                  <Text
                    variant={TextVariant.BodyMD}
                    color={TextColor.Alternative}
                  >
                    {strings('perps.tpsl.usd_label')}
                  </Text>
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
                      if (digitCount > 9) return; // Block input beyond 9 digits
                      handleTakeProfitPercentageChange(text);
                    }}
                    placeholder={strings('perps.tpsl.profit_roe_placeholder')}
                    placeholderTextColor={colors.text.muted}
                    showSoftInputOnFocus={false}
                    editable
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

              {/* Error message */}
              {!isValid && takeProfitError && (
                <Text variant={TextVariant.BodySM} color={TextColor.Error}>
                  {takeProfitError}
                </Text>
              )}
            </View>

            {/* Stop Loss Section */}
            <View style={styles.section}>
              <Text
                variant={TextVariant.HeadingSM}
                color={TextColor.Default}
                style={styles.sectionTitle}
              >
                {actualDirection === 'short'
                  ? strings('perps.tpsl.stop_loss_short')
                  : strings('perps.tpsl.stop_loss_long')}
              </Text>

              {/* Percentage buttons */}
              <View style={styles.percentageButtonsContainer}>
                <TouchableOpacity
                  style={[
                    styles.percentageButton,
                    !stopLossPrice && styles.percentageButtonOff,
                  ]}
                  onPress={handleStopLossOff}
                  disabled={!!focusedInput}
                >
                  <Text variant={TextVariant.BodySM} color={TextColor.Default}>
                    {strings('perps.tpsl.off')}
                  </Text>
                </TouchableOpacity>
                {STOP_LOSS_PERCENTAGES.map((percentage) => (
                  <TouchableOpacity
                    key={percentage}
                    style={[
                      styles.percentageButton,
                      selectedSlPercentage === percentage &&
                        styles.percentageButtonActiveSL,
                    ]}
                    onPress={() => handleStopLossPercentageButton(percentage)}
                    testID={getPerpsTPSLBottomSheetSelector.stopLossPercentageButton(
                      percentage,
                    )}
                    disabled={!!focusedInput}
                  >
                    <Text
                      variant={TextVariant.BodySM}
                      color={TextColor.Default}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      -{percentage}%
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
                  <TextInput
                    ref={stopLossPriceRef}
                    style={styles.input}
                    value={stopLossPrice}
                    onChangeText={(text) => {
                      const digitCount = (text.match(/\d/g) || []).length;
                      if (digitCount > 9) return; // Block input beyond 9 digits
                      handleStopLossPriceChange(text);
                    }}
                    placeholder={strings(
                      'perps.tpsl.trigger_price_placeholder',
                    )}
                    placeholderTextColor={colors.text.muted}
                    showSoftInputOnFocus={false}
                    editable
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
                  <Text
                    variant={TextVariant.BodyMD}
                    color={TextColor.Alternative}
                  >
                    {strings('perps.tpsl.usd_label')}
                  </Text>
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
                      if (digitCount > 9) return; // Block input beyond 9 digits
                      handleStopLossPercentageChange(text);
                    }}
                    placeholder={strings('perps.tpsl.loss_roe_placeholder')}
                    placeholderTextColor={colors.text.muted}
                    showSoftInputOnFocus={false}
                    editable
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

              {/* Error message */}
              {!isValid &&
                Boolean(stopLossError || stopLossLiquidationError) && (
                  <Text variant={TextVariant.BodySM} color={TextColor.Error}>
                    {stopLossError || stopLossLiquidationError}
                  </Text>
                )}
            </View>
          </TouchableOpacity>
        </ScrollView>
        {/* {console.log('focusedInput body', focusedInput)} */}
        {/* Keypad Section - Show when input is focused */}
        {/* </View> */}

        <View style={styles.keypadFooter}>
          <BottomSheetFooter
            buttonPropsArray={[
              {
                label: isUpdating
                  ? strings('perps.tpsl.updating')
                  : strings('perps.tpsl.set'),
                variant: ButtonVariants.Primary,
                size: ButtonSize.Lg,
                onPress: handleConfirm,
                isDisabled: confirmDisabled,
                loading: isUpdating,
              },
            ]}
          />
        </View>
      </BottomSheet>

      {focusedInput && (
        <View style={styles.keypadContainer}>
          <Keypad
            value={
              focusedInput === 'takeProfitPrice'
                ? takeProfitPrice
                : focusedInput === 'takeProfitPercentage'
                ? formattedTakeProfitPercentage
                : focusedInput === 'stopLossPrice'
                ? stopLossPrice
                : formattedStopLossPercentage
            }
            onChange={handleKeypadChange}
            // USD_PERPS is not a real currency - it's a custom configuration
            // that allows 5 decimal places for crypto prices, overriding the
            // default USD configuration which only allows 2 decimal places.
            currency="USD_PERPS"
            decimals={5}
          />
          <Button onPress={dismissKeypad} style={styles.keypadDismissButton}>
            {strings('perps.tpsl.dismiss_tpsl_keypad')}
          </Button>
        </View>
      )}
    </>
  );
};

export default memo(PerpsTPSLBottomSheet);
