import React, { memo, useCallback, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
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
import { formatPrice } from '../../utils/formatUtils';

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
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const { startMeasure, endMeasure } = usePerpsPerformance();

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
  const currentPrice =
    livePrice ||
    initialCurrentPrice ||
    (position?.entryPrice ? parseFloat(position.entryPrice) : 0);

  // Use the TPSL form hook for all state management and business logic
  const tpslForm = usePerpsTPSLForm({
    asset,
    currentPrice,
    direction,
    position,
    initialTakeProfitPrice,
    initialStopLossPrice,
    leverage: propLeverage,
    entryPrice: position?.entryPrice
      ? parseFloat(position.entryPrice)
      : currentPrice,
    isVisible,
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

  const { isValid, hasChanges, takeProfitError, stopLossError } =
    tpslForm.validation;
  const { formattedTakeProfitPercentage, formattedStopLossPercentage } =
    tpslForm.display;

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
    (shouldCalculateLiquidation ? calculatedLiquidationPrice : null);

  useEffect(() => {
    if (isVisible) {
      startMeasure(PerpsMeasurementName.TP_SL_BOTTOM_SHEET_LOADED);
      bottomSheetRef.current?.onOpenBottomSheet(() => {
        // Measure TP/SL bottom sheet loaded when animation actually completes
        endMeasure(PerpsMeasurementName.TP_SL_BOTTOM_SHEET_LOADED);
      });
    }
  }, [isVisible, startMeasure, endMeasure]);

  const handleConfirm = useCallback(() => {
    // Parse the formatted prices back to plain numbers for storage
    const parseTakeProfitPrice = takeProfitPrice
      ? takeProfitPrice.replace(/[$,]/g, '')
      : undefined;
    const parseStopLossPrice = stopLossPrice
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

  // Show overlay if updating
  const showOverlay = isUpdating;

  const confirmDisabled = !hasChanges || !isValid;

  if (!isVisible) return null;

  return (
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

      <ScrollView contentContainerStyle={styles.content}>
        {showOverlay && (
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color={colors.primary.default} />
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
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              {strings('perps.tpsl.current_price')}
            </Text>
            <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
              {currentPrice ? formatPrice(currentPrice) : '--'}
            </Text>
          </View>
          <View style={styles.priceInfoRow}>
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              {strings('perps.tpsl.liquidation_price')}
            </Text>
            <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
              {displayLiquidationPrice &&
              displayLiquidationPrice !== 'null' &&
              displayLiquidationPrice !== '0.00'
                ? formatPrice(parseFloat(displayLiquidationPrice))
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
                style={styles.input}
                value={takeProfitPrice}
                onChangeText={handleTakeProfitPriceChange}
                placeholder={strings('perps.tpsl.trigger_price_placeholder')}
                placeholderTextColor={colors.text.muted}
                keyboardType="numeric"
                onFocus={handleTakeProfitPriceFocus}
                onBlur={handleTakeProfitPriceBlur}
              />
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
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
                style={styles.input}
                value={formattedTakeProfitPercentage}
                onChangeText={handleTakeProfitPercentageChange}
                placeholder={strings('perps.tpsl.profit_roe_placeholder')}
                placeholderTextColor={colors.text.muted}
                keyboardType="numeric"
                onFocus={handleTakeProfitPercentageFocus}
                onBlur={handleTakeProfitPercentageBlur}
              />
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
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
                style={styles.input}
                value={stopLossPrice}
                onChangeText={handleStopLossPriceChange}
                placeholder={strings('perps.tpsl.trigger_price_placeholder')}
                placeholderTextColor={colors.text.muted}
                keyboardType="numeric"
                onFocus={handleStopLossPriceFocus}
                onBlur={handleStopLossPriceBlur}
              />
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
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
                style={styles.input}
                value={formattedStopLossPercentage}
                onChangeText={handleStopLossPercentageChange}
                placeholder={strings('perps.tpsl.loss_roe_placeholder')}
                placeholderTextColor={colors.text.muted}
                keyboardType="numeric"
                onFocus={handleStopLossPercentageFocus}
                onBlur={handleStopLossPercentageBlur}
              />
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                %
              </Text>
            </View>
          </View>

          {/* Error message */}
          {!isValid && stopLossError && (
            <Text variant={TextVariant.BodySM} color={TextColor.Error}>
              {stopLossError}
            </Text>
          )}
        </View>
      </ScrollView>

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
    </BottomSheet>
  );
};

export default memo(PerpsTPSLBottomSheet);
