/* eslint-disable @metamask/design-tokens/color-no-hex */
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { TouchableOpacity, View } from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
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
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { DevLogger } from '../../../../../core/SDKConnect/utils/DevLogger';
import { useTheme } from '../../../../../util/theme';
import { Theme } from '../../../../../util/theme/models';
import { MetaMetricsEvents } from '../../../../hooks/useMetrics';
import {
  PerpsEventProperties,
  PerpsEventValues,
} from '../../constants/eventNames';
import { PerpsMeasurementName } from '../../constants/performanceMetrics';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { usePerpsScreenTracking } from '../../hooks/usePerpsScreenTracking';
import { formatPrice } from '../../utils/formatUtils';
import { createStyles } from './PerpsLeverageBottomSheet.styles';
import {
  LEVERAGE_COLORS,
  getLeverageRiskLevel,
} from '../../constants/leverageColors';
import { LEVERAGE_SLIDER_CONFIG } from '../../constants/perpsConfig';
import { usePerpsLiquidationPrice } from '../../hooks/usePerpsLiquidationPrice';

interface PerpsLeverageBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onConfirm: (leverage: number, inputMethod?: 'slider' | 'preset') => void;
  leverage: number;
  minLeverage: number;
  maxLeverage: number;
  currentPrice: number;
  direction: 'long' | 'short';
  asset?: string;
}

/**
 * LeverageSlider Component
 * A custom slider for selecting leverage values with visual risk indication
 *
 * @param value - Current leverage value
 * @param onValueChange - Callback when leverage changes
 * @param minValue - Minimum leverage (typically 1)
 * @param maxValue - Maximum leverage (varies by market)
 * @param colors - Theme colors
 * @param onInteraction - Optional callback when user interacts with slider
 *
 * Features:
 * - Gradient background indicating risk levels (green to red)
 * - Smooth drag and tap gestures
 * - Dynamic tick marks based on max leverage
 * - Real-time value updates during drag
 */
const LeverageSlider: React.FC<{
  value: number;
  onValueChange: (value: number) => void;
  minValue: number;
  maxValue: number;
  colors: Theme['colors'];
  onInteraction?: () => void;
}> = ({ value, onValueChange, minValue, maxValue, colors, onInteraction }) => {
  const styles = createStyles(colors);
  const sliderWidth = useSharedValue(0);
  const translateX = useSharedValue(0);
  const isPressed = useSharedValue(false);
  const thumbScale = useSharedValue(1);
  const widthRef = useRef(0);
  const [gradientWidth, setGradientWidth] = useState(300);
  // Track previous value for threshold detection
  const previousValueRef = useRef(value);

  const positionToValue = useCallback(
    (position: number, width: number) => {
      'worklet';
      if (width === 0) return minValue;
      const percentage = position / width;
      const rawValue = percentage * (maxValue - minValue) + minValue;
      // Ensure value stays within bounds
      const clampedValue = Math.max(
        minValue,
        Math.min(maxValue, Math.round(rawValue)),
      );
      return clampedValue;
    },
    [minValue, maxValue],
  );

  const handleLayout = useCallback(
    (event: { nativeEvent: { layout: { width: number } } }) => {
      const { width } = event.nativeEvent.layout;
      widthRef.current = width;
      sliderWidth.value = width;
      // Make gradient wider than the track to ensure full color coverage
      setGradientWidth(width * 1.5);
      const percentage = (value - minValue) / (maxValue - minValue);
      translateX.value = percentage * width;
    },
    [value, minValue, maxValue, sliderWidth, translateX],
  );

  useEffect(() => {
    if (widthRef.current > 0) {
      const percentage = (value - minValue) / (maxValue - minValue);
      const newPosition = percentage * widthRef.current;
      // Direct assignment for instant update, no spring animation
      translateX.value = newPosition;
    }
    // Update previous value ref when value changes externally
    previousValueRef.current = value;
  }, [value, minValue, maxValue, translateX]);

  const progressStyle = useAnimatedStyle(() => ({
    width: translateX.value,
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { scale: thumbScale.value }],
  }));

  const updateValue = useCallback(
    (newValue: number) => {
      onValueChange(newValue);
      onInteraction?.();
    },
    [onValueChange, onInteraction],
  );

  // Haptic feedback callbacks
  const triggerHapticFeedback = useCallback(
    (impactStyle: ImpactFeedbackStyle) => {
      impactAsync(impactStyle);
    },
    [],
  );

  // Check if value crosses leverage thresholds
  const checkThresholdCrossing = useCallback(
    (newValue: number) => {
      const prevValue = previousValueRef.current;
      // Define leverage thresholds based on risk levels
      const thresholds = [2, 5, 10, 20];

      for (const threshold of thresholds) {
        // Check if we crossed the threshold in either direction
        if (
          (prevValue < threshold && newValue >= threshold) ||
          (prevValue > threshold && newValue <= threshold)
        ) {
          runOnJS(triggerHapticFeedback)(ImpactFeedbackStyle.Light);
          break;
        }
      }

      previousValueRef.current = newValue;
    },
    [triggerHapticFeedback],
  );

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      isPressed.value = true;
      thumbScale.value = 1.1; // Subtle scale effect, instant
      runOnJS(triggerHapticFeedback)(ImpactFeedbackStyle.Medium);
    })
    .onUpdate((event) => {
      const newPosition = Math.max(0, Math.min(event.x, sliderWidth.value));
      translateX.value = newPosition;
      // Real-time value update during drag
      const currentValue = positionToValue(newPosition, sliderWidth.value);
      runOnJS(updateValue)(currentValue);
      runOnJS(checkThresholdCrossing)(currentValue);
    })
    .onEnd(() => {
      isPressed.value = false;
      thumbScale.value = 1; // Direct assignment, no spring
      const currentValue = positionToValue(translateX.value, sliderWidth.value);
      runOnJS(updateValue)(currentValue);
      runOnJS(triggerHapticFeedback)(ImpactFeedbackStyle.Medium);
    })
    .onFinalize(() => {
      isPressed.value = false;
      thumbScale.value = 1; // Direct assignment, no spring
    });

  const tapGesture = Gesture.Tap().onEnd((event) => {
    const newPosition = Math.max(0, Math.min(event.x, sliderWidth.value));
    translateX.value = newPosition; // Direct assignment for instant response
    const newValue = positionToValue(newPosition, sliderWidth.value);
    runOnJS(updateValue)(newValue);
    runOnJS(checkThresholdCrossing)(newValue);
    runOnJS(triggerHapticFeedback)(ImpactFeedbackStyle.Light);
  });

  const composed = Gesture.Simultaneous(tapGesture, panGesture);

  // Generate tick marks based on max leverage using configuration constants
  const tickMarks = useMemo(() => {
    const marks = [];
    let step: number = LEVERAGE_SLIDER_CONFIG.TICK_STEP_MEDIUM;

    if (maxValue <= LEVERAGE_SLIDER_CONFIG.MAX_LEVERAGE_LOW_THRESHOLD) {
      step = LEVERAGE_SLIDER_CONFIG.TICK_STEP_LOW;
    } else if (
      maxValue <= LEVERAGE_SLIDER_CONFIG.MAX_LEVERAGE_MEDIUM_THRESHOLD
    ) {
      step = LEVERAGE_SLIDER_CONFIG.TICK_STEP_MEDIUM;
    } else {
      step = LEVERAGE_SLIDER_CONFIG.TICK_STEP_HIGH;
    }

    // Ensure we don't generate marks beyond maxValue
    for (let i = step; i < maxValue; i += step) {
      if (i >= maxValue) break; // Extra safety check
      const percentage = (i - minValue) / (maxValue - minValue);
      marks.push({ value: i, percentage });
    }

    return marks;
  }, [minValue, maxValue]);

  return (
    <GestureHandlerRootView style={styles.leverageSliderContainer}>
      <GestureDetector gesture={composed}>
        <View style={styles.leverageTrack} onLayout={handleLayout}>
          {/* Progress bar with clipped gradient */}
          <Animated.View style={[styles.progressContainer, progressStyle]}>
            {/* Using leverage risk colors - will be replaced with design tokens */}
            <LinearGradient
              colors={[
                LEVERAGE_COLORS.SAFE,
                LEVERAGE_COLORS.SAFE_LIGHT,
                LEVERAGE_COLORS.CAUTION,
                colors.warning.default,
                LEVERAGE_COLORS.MEDIUM,
                colors.error.default,
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.gradientStyle, { width: gradientWidth || 300 }]}
            />
          </Animated.View>

          {/* Tick marks */}
          {tickMarks.map((mark) => (
            <View
              key={mark.value}
              style={[styles.tickMark, { left: `${mark.percentage * 100}%` }]}
            />
          ))}

          {/* Thumb */}
          <Animated.View
            style={[styles.leverageThumb, thumbStyle]}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          />
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
};

const PerpsLeverageBottomSheet: React.FC<PerpsLeverageBottomSheetProps> = ({
  isVisible,
  onClose,
  onConfirm,
  leverage: initialLeverage,
  minLeverage,
  maxLeverage,
  currentPrice,
  direction,
  asset = '',
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const [tempLeverage, setTempLeverage] = useState(initialLeverage);
  const [inputMethod, setInputMethod] = useState<'slider' | 'preset'>('slider');
  const { track } = usePerpsEventTracking();
  const hasTrackedLeverageView = useRef(false);

  // Dynamically calculate liquidation price based on tempLeverage
  const { liquidationPrice: calculatedLiquidationPrice } =
    usePerpsLiquidationPrice({
      entryPrice: currentPrice,
      leverage: tempLeverage,
      direction,
      asset,
    });

  // Use calculated liquidation price, converting from string to number
  const dynamicLiquidationPrice = parseFloat(calculatedLiquidationPrice) || 0;

  // Track screen load performance
  usePerpsScreenTracking({
    screenName: PerpsMeasurementName.LEVERAGE_BOTTOM_SHEET_LOADED,
    dependencies: [isVisible],
  });

  useEffect(() => {
    if (isVisible) {
      bottomSheetRef.current?.onOpenBottomSheet();
    } else {
      // Reset the flag and leverage when the bottom sheet is closed
      hasTrackedLeverageView.current = false;
      setTempLeverage(initialLeverage);
    }
  }, [isVisible, initialLeverage]);

  // Track leverage screen viewed event - separate concern
  useEffect(() => {
    if (isVisible && !hasTrackedLeverageView.current) {
      track(MetaMetricsEvents.PERPS_LEVERAGE_SCREEN_VIEWED, {
        [PerpsEventProperties.ASSET]: asset,
        [PerpsEventProperties.DIRECTION]:
          direction === 'long'
            ? PerpsEventValues.DIRECTION.LONG
            : PerpsEventValues.DIRECTION.SHORT,
      });
      hasTrackedLeverageView.current = true;
    }
  }, [isVisible, direction, asset, track]);

  const handleConfirm = () => {
    DevLogger.log(
      `Confirming leverage: ${tempLeverage}, method: ${inputMethod}`,
    );

    onConfirm(tempLeverage, inputMethod);
    onClose();
  };

  /**
   * Calculate liquidation percentage distance from current price
   * This is protocol-agnostic, using the provider's calculated liquidation price
   *
   * @returns Percentage distance to liquidation (e.g., 20 means 20% price movement to liquidation)
   *
   * For long positions: Shows how much price needs to drop to trigger liquidation
   * For short positions: Shows how much price needs to rise to trigger liquidation
   */
  const liquidationDropPercentage = useMemo(() => {
    // Validate inputs
    if (currentPrice === 0 || !currentPrice) return 0;

    // Special case for 1x leverage - theoretical 100% price movement to liquidation
    if (tempLeverage === 1) {
      return 100; // Show 100% for 1x leverage
    }

    // If liquidation price is invalid/still calculating, use theoretical calculation
    if (!dynamicLiquidationPrice || dynamicLiquidationPrice === 0) {
      // Theoretical calculation: 1 / leverage * 100
      // For 2x: 50%, for 5x: 20%, for 10x: 10%, etc.
      const theoreticalPercentage = (1 / tempLeverage) * 100;
      return theoreticalPercentage >= 99.9 ? 100 : theoreticalPercentage;
    }

    // Use actual liquidation price when available
    const percentageDrop =
      (Math.abs(currentPrice - dynamicLiquidationPrice) / currentPrice) * 100;

    // Return 100% for very high percentages, otherwise return calculated value
    return percentageDrop >= 99.9 ? 100 : percentageDrop;
  }, [currentPrice, dynamicLiquidationPrice, tempLeverage]);

  // Generate dynamic leverage options based on maxLeverage
  const quickSelectValues = useMemo(() => {
    DevLogger.log(
      `Generating leverage options for maxLeverage: ${maxLeverage}`,
    );
    const baseOptions = [2, 5, 10, 20, 40];
    const filtered = baseOptions.filter((option) => option <= maxLeverage);
    DevLogger.log(`Available leverage options: ${filtered.join(', ')}`);
    return filtered;
  }, [maxLeverage]);

  /**
   * Determine leverage risk level for text color
   * Maps leverage percentage to appropriate style matching the gradient colors
   * @returns Style object for leverage text color
   */
  const getLeverageTextStyle = useCallback(() => {
    const percentage =
      (tempLeverage - minLeverage) / (maxLeverage - minLeverage);
    const riskLevel = getLeverageRiskLevel(percentage);

    switch (riskLevel) {
      case 'safe':
        return styles.leverageTextSafe;
      case 'caution':
        return styles.leverageTextCaution;
      case 'medium':
        return styles.leverageTextMedium;
      case 'high':
      default:
        return styles.leverageTextHigh;
    }
  }, [tempLeverage, minLeverage, maxLeverage, styles]);

  /**
   * Determine warning styles based on leverage risk level
   * Returns appropriate styles for warning container, text, icon, and price colors
   * Colors match the gradient to provide visual consistency
   *
   * @returns Object containing textStyle, containerStyle, iconColor, and priceColor
   */
  const getWarningStyles = useCallback(() => {
    const percentage =
      (tempLeverage - minLeverage) / (maxLeverage - minLeverage);
    const riskLevel = getLeverageRiskLevel(percentage);

    switch (riskLevel) {
      case 'safe':
        return {
          textStyle: styles.warningTextSafe,
          containerStyle: styles.warningContainerSafe,
          iconColor: IconColor.Success,
          priceColor: LEVERAGE_COLORS.SAFE,
        };
      case 'caution':
        return {
          textStyle: styles.warningTextCaution,
          containerStyle: styles.warningContainerCaution,
          iconColor: IconColor.Warning,
          priceColor: LEVERAGE_COLORS.CAUTION,
        };
      case 'medium':
        return {
          textStyle: styles.warningTextMedium,
          containerStyle: styles.warningContainerMedium,
          iconColor: IconColor.Warning,
          priceColor: LEVERAGE_COLORS.MEDIUM,
        };
      case 'high':
      default:
        return {
          textStyle: styles.warningTextHigh,
          containerStyle: styles.warningContainerHigh,
          iconColor: IconColor.Error,
          priceColor: colors.error.default,
        };
    }
  }, [tempLeverage, minLeverage, maxLeverage, styles, colors]);

  const warningStyles = getWarningStyles();

  const footerButtonProps = [
    {
      label: `Set ${tempLeverage}x`,
      variant: ButtonVariants.Primary,
      size: ButtonSize.Lg,
      onPress: handleConfirm,
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
          {strings('perps.order.leverage_modal.title')}
        </Text>
      </BottomSheetHeader>

      <View style={styles.container}>
        {/* Large leverage display */}
        <View style={styles.leverageDisplay}>
          <Text
            variant={TextVariant.DisplayMD}
            style={[styles.leverageText, getLeverageTextStyle()]}
          >
            {tempLeverage}x
          </Text>
        </View>

        {/* Liquidation warning */}
        <View style={[styles.warningContainer, warningStyles.containerStyle]}>
          <Icon
            name={IconName.Danger}
            size={IconSize.Sm}
            color={warningStyles.iconColor}
            style={styles.warningIcon}
          />
          <Text
            variant={TextVariant.BodySM}
            style={[warningStyles.textStyle, styles.warningText]}
          >
            You will be liquidated if price{' '}
            {direction === 'long' ? 'drops' : 'rises'} by{' '}
            {liquidationDropPercentage.toFixed(1)}%
          </Text>
        </View>

        {/* Price information */}
        {currentPrice ? (
          <View style={styles.priceInfoContainer}>
            <View style={styles.priceRow}>
              <Text
                variant={TextVariant.BodyMD}
                style={{ color: warningStyles.priceColor }}
              >
                {strings('perps.order.leverage_modal.liquidation_price')}
              </Text>
              <View style={styles.priceValueContainer}>
                <Icon
                  name={IconName.Danger}
                  size={IconSize.Xs}
                  color={warningStyles.priceColor}
                  style={styles.priceIcon}
                />
                <Text
                  variant={TextVariant.BodyMD}
                  style={{ color: warningStyles.priceColor }}
                >
                  {formatPrice(dynamicLiquidationPrice)}
                </Text>
              </View>
            </View>
            <View style={styles.priceRow}>
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                {strings('perps.order.leverage_modal.current_price')}
              </Text>
              <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
                {formatPrice(currentPrice)}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.priceInfoContainer}>
            <Text
              variant={TextVariant.BodyMD}
              color={TextColor.Alternative}
              style={styles.emptyPriceInfo}
            >
              Price information unavailable
            </Text>
          </View>
        )}

        {/* Custom Leverage Slider */}
        <View style={styles.sliderContainer}>
          <LeverageSlider
            value={tempLeverage}
            onValueChange={setTempLeverage}
            minValue={minLeverage}
            maxValue={maxLeverage}
            colors={colors}
            onInteraction={() => setInputMethod('slider')}
          />
          <View style={styles.sliderLabels}>
            <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
              {minLeverage}x
            </Text>
            <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
              {Math.floor((minLeverage + maxLeverage) / 2)}x
            </Text>
            <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
              {maxLeverage}x
            </Text>
          </View>
        </View>

        {/* Quick select buttons */}
        <View style={styles.quickSelectButtons}>
          {quickSelectValues.map((value) => (
            <TouchableOpacity
              key={value}
              style={[
                styles.quickSelectButton,
                tempLeverage === value && styles.quickSelectButtonActive,
              ]}
              onPress={() => {
                setTempLeverage(value);
                setInputMethod('preset');
                // Add haptic feedback for quick select buttons
                impactAsync(ImpactFeedbackStyle.Light);
              }}
            >
              <Text
                variant={TextVariant.BodyLGMedium}
                color={
                  tempLeverage === value ? TextColor.Primary : TextColor.Default
                }
                style={styles.quickSelectText}
              >
                {value}x
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <BottomSheetFooter buttonPropsArray={footerButtonProps} />
    </BottomSheet>
  );
};

PerpsLeverageBottomSheet.displayName = 'PerpsLeverageBottomSheet';

export default memo(
  PerpsLeverageBottomSheet,
  (prevProps, nextProps) =>
    prevProps.isVisible === nextProps.isVisible &&
    prevProps.leverage === nextProps.leverage &&
    prevProps.minLeverage === nextProps.minLeverage &&
    prevProps.maxLeverage === nextProps.maxLeverage &&
    prevProps.direction === nextProps.direction,
);
