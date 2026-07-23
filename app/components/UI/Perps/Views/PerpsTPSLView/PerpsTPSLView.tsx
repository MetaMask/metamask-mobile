import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import { Keyboard, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import { strings } from '../../../../../../locales/i18n';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  BottomSheetFooter,
  ButtonsAlignment,
  Button,
  ButtonSize,
  ButtonVariant,
  HeaderStandard,
  KeyValueRow,
  Label,
  Text,
  TextColor,
  TextField,
  TextVariant,
} from '@metamask/design-system-react-native';
import Keypad from '../../../../../components/Base/Keypad';

import { MetaMetricsEvents } from '../../../../../core/Analytics';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
  PERPS_CONSTANTS,
  DECIMAL_PRECISION_CONFIG,
} from '@metamask/perps-controller';
import { usePerpsLivePrices } from '../../hooks/stream';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import type { PerpsNavigationParamList } from '../../types/navigation';
import {
  getPerpsTPSLViewSelector,
  PerpsTPSLViewSelectorsIDs,
} from '../../Perps.testIds';
import { usePerpsTPSLForm } from '../../hooks/usePerpsTPSLForm';
import { usePerpsLiquidationPrice } from '../../hooks/usePerpsLiquidationPrice';
import {
  formatPerpsFiat,
  PRICE_RANGES_UNIVERSAL,
  PRICE_RANGES_MINIMAL_VIEW,
} from '../../utils/formatUtils';
import { toPerpsEntryAttribution } from '../../utils/perpsAnalyticsAttribution';
import { TP_SL_VIEW_CONFIG } from '../../constants/perpsConfig';

const priceKeyTextProps = {
  variant: TextVariant.BodyMd,
  color: TextColor.TextAlternative,
} as const;

const priceValueTextProps = {
  variant: TextVariant.BodyMd,
  color: TextColor.TextDefault,
} as const;

const PerpsTPSLView: React.FC = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute<RouteProp<PerpsNavigationParamList, 'PerpsTPSL'>>();
  const tw = useTailwind();

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

  const scrollViewRef = useRef<ScrollView>(null);

  // Keypad state management
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  // Refs for TextField inputs to programmatically blur them
  const takeProfitPriceRef = useRef<TextInput>(null);
  const takeProfitPercentageRef = useRef<TextInput>(null);
  const stopLossPriceRef = useRef<TextInput>(null);
  const stopLossPercentageRef = useRef<TextInput>(null);

  // Subscribe to real-time price only when we have an asset
  // Use throttle for TP/SL screen to reduce re-renders
  const priceData = usePerpsLivePrices({
    symbols: asset ? [asset] : [],
    throttleMs: TP_SL_VIEW_CONFIG.PriceThrottleMs,
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

  // Compute keypad decimal places from current price so low-value assets
  // (e.g. PUMP at ~$0.002) get enough decimal places to enter a trigger price.
  // Formula: floor(-log10(price)) + MaxSignificantFigures, clamped to [2, MaxPriceDecimals].
  const keypadDecimals =
    currentPrice > 0 && isFinite(currentPrice)
      ? Math.min(
          Math.max(
            2,
            Math.floor(-Math.log10(currentPrice)) +
              DECIMAL_PRECISION_CONFIG.MaxSignificantFigures,
          ),
          DECIMAL_PRECISION_CONFIG.MaxPriceDecimals,
        )
      : DECIMAL_PRECISION_CONFIG.MaxPriceDecimals;

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
    ? PERPS_EVENT_VALUE.SCREEN_TYPE.EDIT_TPSL
    : PERPS_EVENT_VALUE.SCREEN_TYPE.CREATE_TPSL;

  usePerpsEventTracking({
    eventName: MetaMetricsEvents.PERPS_SCREEN_VIEWED,
    properties: {
      [PERPS_EVENT_PROPERTY.SCREEN_TYPE]: tpslScreenType,
      [PERPS_EVENT_PROPERTY.ASSET]: asset,
      [PERPS_EVENT_PROPERTY.DIRECTION]:
        actualDirection === 'long'
          ? PERPS_EVENT_VALUE.DIRECTION.LONG
          : PERPS_EVENT_VALUE.DIRECTION.SHORT,
      // Add initial TP/SL state to understand what user already has set
      [PERPS_EVENT_PROPERTY.HAS_TAKE_PROFIT]: !!initialTakeProfitPrice,
      [PERPS_EVENT_PROPERTY.HAS_STOP_LOSS]: !!initialStopLossPrice,
      [PERPS_EVENT_PROPERTY.SOURCE]: isEditingExistingPosition
        ? PERPS_EVENT_VALUE.SOURCE.POSITION_SCREEN
        : PERPS_EVENT_VALUE.SOURCE.TRADE_SCREEN,
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

      // The system keyboard is suppressed via showSoftInputOnFocus={false} on
      // each Input, which the native iOS implementation honors by swapping in
      // an empty inputView. The custom keypad is the only keyboard shown and
      // the native caret stays focused and blinking — no Keyboard.dismiss()
      // workaround needed.

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

  // Only hide the keypad when the active/focused field is the one blurring
  // (prevents hiding the keypad when the user moves focus to another field).
  const handleInputBlur = useCallback(
    (inputType: string) => {
      if (inputType === 'takeProfitPrice') {
        handleTakeProfitPriceBlur();
      } else if (inputType === 'takeProfitPercentage') {
        handleTakeProfitPercentageBlur();
      } else if (inputType === 'stopLossPrice') {
        handleStopLossPriceBlur();
      } else if (inputType === 'stopLossPercentage') {
        handleStopLossPercentageBlur();
      }

      // Only clear the keypad when the field that is blurring is still the
      // active one (i.e. the user isn't moving to another input).
      setFocusedInput((prev) => (prev === inputType ? null : prev));
    },
    [
      handleTakeProfitPriceBlur,
      handleTakeProfitPercentageBlur,
      handleStopLossPriceBlur,
      handleStopLossPercentageBlur,
    ],
  );

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
      const riskSource = isEditingExistingPosition
        ? PERPS_EVENT_VALUE.RISK_MANAGEMENT_SOURCE.POSITION_SCREEN
        : PERPS_EVENT_VALUE.RISK_MANAGEMENT_SOURCE.TRADE_SCREEN;
      const trackingData = {
        direction: actualDirection,
        source: riskSource,
        ...toPerpsEntryAttribution({ source: riskSource }),
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
      // Pass position from route params so the callback always has the correct position (avoids "No position found" when parent ref is stale)
      await onConfirm(
        position,
        parseTakeProfitPrice,
        parseStopLossPrice,
        trackingData,
      );
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

  const cancelButtonProps = useMemo(
    () => ({
      children: strings('perps.tpsl.cancel'),
      onPress: handleBack,
      size: ButtonSize.Lg,
      testID: PerpsTPSLViewSelectorsIDs.CANCEL_BUTTON,
    }),
    [handleBack],
  );

  const setButtonProps = useMemo(
    () => ({
      children: strings('perps.tpsl.set'),
      onPress: handleConfirm,
      size: ButtonSize.Lg,
      isDisabled: confirmDisabled,
      isLoading: isUpdating,
      testID: PerpsTPSLViewSelectorsIDs.SET_BUTTON,
    }),
    [handleConfirm, confirmDisabled, isUpdating],
  );

  const doneButtonProps = useMemo(
    () => ({
      children: strings('perps.tpsl.done'),
      onPress: dismissKeypad,
      size: ButtonSize.Lg,
      testID: PerpsTPSLViewSelectorsIDs.DONE_BUTTON,
    }),
    [dismissKeypad],
  );

  const entryPriceDisplay =
    position &&
    position.entryPrice !== undefined &&
    position.entryPrice !== null &&
    position.entryPrice !== 'null' &&
    position.entryPrice !== '0.00'
      ? formatPerpsFiat(position.entryPrice, {
          ranges: PRICE_RANGES_UNIVERSAL,
        })
      : PERPS_CONSTANTS.FallbackPriceDisplay;

  const currentPriceDisplay =
    currentPrice !== undefined && currentPrice !== null
      ? formatPerpsFiat(currentPrice, {
          ranges: PRICE_RANGES_UNIVERSAL,
        })
      : PERPS_CONSTANTS.FallbackPriceDisplay;

  const liquidationPriceDisplay =
    displayLiquidationPrice !== undefined &&
    displayLiquidationPrice !== null &&
    displayLiquidationPrice !== 'null' &&
    displayLiquidationPrice !== '0.00'
      ? formatPerpsFiat(displayLiquidationPrice, {
          ranges: PRICE_RANGES_UNIVERSAL,
        })
      : PERPS_CONSTANTS.FallbackPriceDisplay;

  const takeProfitHasError = !isValid && Boolean(takeProfitError);
  const stopLossHasError = !isValid && Boolean(stopLossError);

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-default')}
      edges={['bottom']}
      testID={PerpsTPSLViewSelectorsIDs.BOTTOM_SHEET}
    >
      <HeaderStandard
        includesTopInset
        title={strings('perps.tpsl.title')}
        onBack={handleBack}
        backButtonProps={{ testID: PerpsTPSLViewSelectorsIDs.BACK_BUTTON }}
      />
      <ScrollView
        ref={scrollViewRef}
        style={tw.style('flex-1')}
        contentContainerStyle={tw.style('grow px-4 pt-4 pb-6')}
        onScrollBeginDrag={Keyboard.dismiss}
        showsVerticalScrollIndicator={false}
      >
        <Box twClassName="flex-1" testID="scroll-content">
          {/* Current price and liquidation price info */}
          <Box twClassName={focusedInput ? 'mb-3 gap-2' : 'mt-4 mb-8 gap-2'}>
            {position && (
              <KeyValueRow
                keyLabel={strings('perps.tpsl.entry_price')}
                value={entryPriceDisplay}
                keyTextProps={priceKeyTextProps}
                valueTextProps={priceValueTextProps}
              />
            )}
            <KeyValueRow
              keyLabel={
                orderType === 'limit' &&
                limitPrice &&
                parseFloat(limitPrice) > 0
                  ? strings('perps.order.limit_price')
                  : strings('perps.tpsl.current_price')
              }
              value={currentPriceDisplay}
              keyTextProps={priceKeyTextProps}
              valueTextProps={priceValueTextProps}
            />
            <KeyValueRow
              keyLabel={strings('perps.tpsl.liquidation_price')}
              value={liquidationPriceDisplay}
              keyTextProps={priceKeyTextProps}
              valueTextProps={priceValueTextProps}
            />
          </Box>

          {/* Take Profit Section */}
          <Box twClassName={focusedInput ? 'mb-0' : 'mb-6'}>
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.Between}
              twClassName="mb-2 -mr-3"
            >
              <Label>
                {actualDirection === 'short'
                  ? strings('perps.tpsl.take_profit_short')
                  : strings('perps.tpsl.take_profit_long')}
              </Label>
              {Boolean(takeProfitPrice) && (
                <Button
                  variant={ButtonVariant.Tertiary}
                  size={ButtonSize.Sm}
                  onPress={handleTakeProfitClear}
                  isDisabled={inputsDisabled}
                  testID={PerpsTPSLViewSelectorsIDs.TAKE_PROFIT_CLEAR_BUTTON}
                >
                  {strings('perps.tpsl.clear')}
                </Button>
              )}
            </Box>

            <Box flexDirection={BoxFlexDirection.Row} twClassName="mb-3 gap-2">
              {TP_SL_VIEW_CONFIG.TakeProfitRoePresets.map((percentage) => (
                <Button
                  key={percentage}
                  variant={ButtonVariant.Secondary}
                  size={ButtonSize.Md}
                  twClassName="flex-1"
                  onPress={() => handleTakeProfitPercentageButton(percentage)}
                  testID={getPerpsTPSLViewSelector.takeProfitPercentageButton(
                    percentage,
                  )}
                  isDisabled={inputsDisabled}
                >
                  {`+${percentage}%`}
                </Button>
              ))}
            </Box>

            <Box flexDirection={BoxFlexDirection.Row} twClassName="mb-2 gap-2">
              <TextField
                twClassName="flex-1"
                inputRef={takeProfitPriceRef}
                isError={takeProfitHasError}
                value={takeProfitPrice}
                onChangeText={(text) => {
                  const digitCount = (text.match(/\d/g) || []).length;
                  if (digitCount > TP_SL_VIEW_CONFIG.MaxInputDigits) return;
                  handleTakeProfitPriceChange(text);
                }}
                placeholder={strings('perps.tpsl.trigger_price_placeholder')}
                isDisabled={inputsDisabled}
                onFocus={() => {
                  handleInputFocus('takeProfitPrice');
                }}
                onBlur={() => handleInputBlur('takeProfitPrice')}
                startAccessory={
                  <Text
                    variant={TextVariant.BodyMd}
                    color={TextColor.TextAlternative}
                  >
                    {strings('perps.tpsl.usd_label')}
                  </Text>
                }
                inputProps={{
                  testID: PerpsTPSLViewSelectorsIDs.TAKE_PROFIT_PRICE_INPUT,
                  showSoftInputOnFocus: false,
                }}
              />
              <TextField
                twClassName="flex-1"
                inputRef={takeProfitPercentageRef}
                isError={takeProfitHasError}
                value={formattedTakeProfitPercentage}
                onChangeText={(text) => {
                  const digitCount = (text.match(/\d/g) || []).length;
                  if (digitCount > TP_SL_VIEW_CONFIG.MaxInputDigits) return;
                  handleTakeProfitPercentageChange(text);
                }}
                placeholder={strings('perps.tpsl.profit_roe_placeholder')}
                isDisabled={inputsDisabled}
                onFocus={() => {
                  handleInputFocus('takeProfitPercentage');
                }}
                onBlur={() => handleInputBlur('takeProfitPercentage')}
                endAccessory={
                  <Text
                    variant={TextVariant.BodyMd}
                    color={TextColor.TextAlternative}
                  >
                    %
                  </Text>
                }
                inputProps={{
                  testID:
                    PerpsTPSLViewSelectorsIDs.TAKE_PROFIT_PERCENTAGE_INPUT,
                  showSoftInputOnFocus: false,
                }}
              />
            </Box>

            {Boolean(takeProfitPrice) &&
              expectedTakeProfitPnL !== undefined && (
                <Text
                  variant={TextVariant.BodyMd}
                  color={TextColor.TextAlternative}
                  twClassName="mt-2 text-right"
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
                  variant={TextVariant.BodyMd}
                  color={TextColor.TextAlternative}
                  twClassName="mt-2 text-right"
                >
                  {PERPS_CONSTANTS.FallbackDataDisplay}
                </Text>
              )}

            {!isValid && Boolean(takeProfitError) && (
              <Text variant={TextVariant.BodySm} color={TextColor.ErrorDefault}>
                {takeProfitError}
              </Text>
            )}
          </Box>

          {/* Stop Loss Section */}
          <Box twClassName={focusedInput ? 'mb-0' : 'mb-6'}>
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.Between}
              twClassName="mb-2 -mr-3"
            >
              <Label>
                {actualDirection === 'short'
                  ? strings('perps.tpsl.stop_loss_short')
                  : strings('perps.tpsl.stop_loss_long')}
              </Label>
              {Boolean(stopLossPrice) && (
                <Button
                  variant={ButtonVariant.Tertiary}
                  size={ButtonSize.Sm}
                  onPress={handleStopLossClear}
                  isDisabled={inputsDisabled}
                  testID={PerpsTPSLViewSelectorsIDs.STOP_LOSS_CLEAR_BUTTON}
                >
                  {strings('perps.tpsl.clear')}
                </Button>
              )}
            </Box>

            <Box flexDirection={BoxFlexDirection.Row} twClassName="mb-3 gap-2">
              {TP_SL_VIEW_CONFIG.StopLossRoePresets.map((percentage) => (
                <Button
                  key={percentage}
                  variant={ButtonVariant.Secondary}
                  size={ButtonSize.Md}
                  twClassName="flex-1"
                  onPress={() => handleStopLossPercentageButton(percentage)}
                  testID={getPerpsTPSLViewSelector.stopLossPercentageButton(
                    percentage,
                  )}
                  isDisabled={inputsDisabled}
                >
                  {`${percentage}%`}
                </Button>
              ))}
            </Box>

            <Box flexDirection={BoxFlexDirection.Row} twClassName="mb-2 gap-2">
              <TextField
                twClassName="flex-1"
                inputRef={stopLossPriceRef}
                isError={stopLossHasError}
                value={stopLossPrice}
                onChangeText={(text) => {
                  const digitCount = (text.match(/\d/g) || []).length;
                  if (digitCount > TP_SL_VIEW_CONFIG.MaxInputDigits) return;
                  handleStopLossPriceChange(text);
                }}
                placeholder={strings('perps.tpsl.trigger_price_placeholder')}
                isDisabled={inputsDisabled}
                onFocus={() => {
                  handleInputFocus('stopLossPrice');
                }}
                onBlur={() => handleInputBlur('stopLossPrice')}
                startAccessory={
                  <Text
                    variant={TextVariant.BodyMd}
                    color={TextColor.TextAlternative}
                  >
                    {strings('perps.tpsl.usd_label')}
                  </Text>
                }
                inputProps={{
                  testID: PerpsTPSLViewSelectorsIDs.STOP_LOSS_PRICE_INPUT,
                  showSoftInputOnFocus: false,
                }}
              />
              <TextField
                twClassName="flex-1"
                inputRef={stopLossPercentageRef}
                isError={stopLossHasError}
                value={formattedStopLossPercentage}
                onChangeText={(text) => {
                  const digitCount = (text.match(/\d/g) || []).length;
                  if (digitCount > TP_SL_VIEW_CONFIG.MaxInputDigits) return;
                  handleStopLossPercentageChange(text);
                }}
                placeholder={strings('perps.tpsl.loss_roe_placeholder')}
                isDisabled={inputsDisabled}
                onFocus={() => {
                  handleInputFocus('stopLossPercentage');
                }}
                onBlur={() => handleInputBlur('stopLossPercentage')}
                endAccessory={
                  <Text
                    variant={TextVariant.BodyMd}
                    color={TextColor.TextAlternative}
                  >
                    %
                  </Text>
                }
                inputProps={{
                  testID: PerpsTPSLViewSelectorsIDs.STOP_LOSS_PERCENTAGE_INPUT,
                  showSoftInputOnFocus: false,
                }}
              />
            </Box>

            {Boolean(stopLossPrice) && expectedStopLossPnL !== undefined && (
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
                twClassName="mt-2 text-right"
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
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
                twClassName="mt-2 text-right"
              >
                {PERPS_CONSTANTS.FallbackDataDisplay}
              </Text>
            )}

            {!isValid && Boolean(stopLossError || stopLossLiquidationError) && (
              <Text variant={TextVariant.BodySm} color={TextColor.ErrorDefault}>
                {stopLossError || stopLossLiquidationError}
              </Text>
            )}
          </Box>
        </Box>
      </ScrollView>

      <Box twClassName="px-0 pb-4 w-full">
        {focusedInput ? (
          <>
            <BottomSheetFooter primaryButtonProps={doneButtonProps} />
            <Box twClassName="px-4 pt-2 bg-default">
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
                currency={TP_SL_VIEW_CONFIG.KeypadCurrencyCode}
                decimals={
                  focusedInput === 'takeProfitPercentage' ||
                  focusedInput === 'stopLossPercentage'
                    ? TP_SL_VIEW_CONFIG.KeypadDecimals
                    : keypadDecimals
                }
              />
            </Box>
          </>
        ) : (
          <BottomSheetFooter
            buttonsAlignment={ButtonsAlignment.Horizontal}
            secondaryButtonProps={cancelButtonProps}
            primaryButtonProps={setButtonProps}
          />
        )}
      </Box>
    </SafeAreaView>
  );
};

export default memo(PerpsTPSLView);
