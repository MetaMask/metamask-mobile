/* eslint-disable @metamask/design-tokens/color-no-hex */
import React, {
  useRef,
  useState,
  useMemo,
  useCallback,
  useEffect,
} from 'react';
import { View, TouchableOpacity } from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import BottomSheetFooter from '../../../../../component-library/components/BottomSheets/BottomSheetFooter';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import { useTheme } from '../../../../../util/theme';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconSize,
  IconName,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import { DevLogger } from '../../../../../core/SDKConnect/utils/DevLogger';
import { RISK_MANAGEMENT } from '../../constants/hyperLiquidConfig';
import { formatPrice } from '../../utils/formatUtils';
import { createStyles } from './PerpsLeverageBottomSheet.styles';
import { strings } from '../../../../../../locales/i18n';
import { Theme } from '../../../../../util/theme/models';

interface PerpsLeverageBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onConfirm: (leverage: number) => void;
  leverage: number;
  minLeverage: number;
  maxLeverage: number;
  currentPrice: number;
  liquidationPrice: number;
  direction: 'long' | 'short';
}

// Custom Leverage Slider Component
const LeverageSlider: React.FC<{
  value: number;
  onValueChange: (value: number) => void;
  minValue: number;
  maxValue: number;
  colors: Theme['colors'];
}> = ({ value, onValueChange, minValue, maxValue, colors }) => {
  const styles = createStyles(colors);
  const sliderWidth = useSharedValue(0);
  const translateX = useSharedValue(0);
  const widthRef = useRef(0);
  const [gradientWidth, setGradientWidth] = useState(300);

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
      translateX.value = withSpring(newPosition, {
        damping: 15,
        stiffness: 400,
      });
    }
  }, [value, minValue, maxValue, translateX]);

  const progressStyle = useAnimatedStyle(() => ({
    width: translateX.value,
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const updateValue = useCallback(
    (newValue: number) => {
      onValueChange(newValue);
    },
    [onValueChange],
  );

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      const newPosition = Math.max(0, Math.min(event.x, sliderWidth.value));
      translateX.value = newPosition;
    })
    .onEnd(() => {
      const currentValue = positionToValue(translateX.value, sliderWidth.value);
      runOnJS(updateValue)(currentValue);
    });

  const tapGesture = Gesture.Tap().onEnd((event) => {
    const newPosition = Math.max(0, Math.min(event.x, sliderWidth.value));
    translateX.value = withSpring(newPosition, { damping: 15, stiffness: 400 });
    const newValue = positionToValue(newPosition, sliderWidth.value);
    runOnJS(updateValue)(newValue);
  });

  const composed = Gesture.Simultaneous(tapGesture, panGesture);

  // Generate tick marks based on max leverage
  const tickMarks = useMemo(() => {
    const marks = [];
    let step = 10;

    if (maxValue <= 20) {
      step = 5;
    } else if (maxValue <= 50) {
      step = 10;
    } else {
      step = 20;
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
            <LinearGradient
              colors={[
                '#4CAF50',
                '#8BC34A',
                '#CDDC39',
                colors.warning.default,
                '#FF6B35',
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
          <Animated.View style={[styles.leverageThumb, thumbStyle]} />
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
  // liquidationPrice: initialLiquidationPrice, // TODO: Use for display
  direction,
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const [tempLeverage, setTempLeverage] = useState(initialLeverage);

  useEffect(() => {
    if (isVisible) {
      bottomSheetRef.current?.onOpenBottomSheet();
    }
  }, [isVisible]);

  const handleConfirm = () => {
    DevLogger.log(`Confirming leverage: ${tempLeverage}`);
    onConfirm(tempLeverage);
    onClose();
  };

  // Calculate liquidation price based on leverage
  const calculatedLiquidationPrice = useMemo(() => {
    if (!currentPrice || tempLeverage === 0) return 0;

    const maintenanceMargin = RISK_MANAGEMENT.maintenanceMargin;
    const leverageRatio = 1 / tempLeverage;

    if (direction === 'long') {
      const liquidationRatio = 1 - (leverageRatio - maintenanceMargin);
      return currentPrice * liquidationRatio;
    }
    const liquidationRatio = 1 + (leverageRatio - maintenanceMargin);
    return currentPrice * liquidationRatio;
  }, [currentPrice, tempLeverage, direction]);

  // Calculate liquidation percentage drop
  const calculateLiquidationDrop = useCallback((lev: number) => {
    if (lev === 0) return 0;

    // For perpetual futures with isolated margin:
    // Initial Margin = Position Value / Leverage
    // The maximum loss before liquidation is approximately the initial margin
    //
    // Since position PnL is amplified by leverage, a 1% price move = leverage% PnL
    // Therefore, liquidation occurs when price moves by approximately: 100% / leverage
    //
    // For example:
    // - 10x leverage: ~10% price move causes 100% loss of margin
    // - 20x leverage: ~5% price move causes 100% loss of margin
    // - 50x leverage: ~2% price move causes 100% loss of margin
    //
    // The exact formula depends on the exchange's liquidation engine,
    // but this gives a good approximation

    // Simple formula: liquidation distance ≈ 100 / leverage
    const liquidationPercentage = 100 / lev;

    // Round to 1 decimal place for display
    return Math.round(liquidationPercentage * 10) / 10;
  }, []);

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

  // Determine leverage risk level for text color
  const getLeverageTextStyle = useCallback(() => {
    const percentage =
      (tempLeverage - minLeverage) / (maxLeverage - minLeverage);

    if (percentage < 0.4) {
      return styles.leverageTextLow;
    } else if (percentage < 0.7) {
      return styles.leverageTextMedium;
    }
    return styles.leverageTextHigh;
  }, [tempLeverage, minLeverage, maxLeverage, styles]);

  // Determine warning text style and icon color based on leverage
  const getWarningStyles = useCallback(() => {
    const percentage =
      (tempLeverage - minLeverage) / (maxLeverage - minLeverage);

    if (percentage < 0.4) {
      return {
        textStyle: styles.warningTextLow,
        iconColor: IconColor.Warning,
      };
    } else if (percentage < 0.7) {
      return {
        textStyle: styles.warningTextMedium,
        iconColor: IconColor.Warning,
      };
    }
    return {
      textStyle: styles.warningTextHigh,
      iconColor: IconColor.Error,
    };
  }, [tempLeverage, minLeverage, maxLeverage, styles]);

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
        <View style={styles.warningContainer}>
          <Icon
            name={IconName.Danger}
            size={IconSize.Sm}
            color={warningStyles.iconColor}
            style={styles.warningIcon}
          />
          <Text variant={TextVariant.BodyMD} style={warningStyles.textStyle}>
            You will be liquidated if price{' '}
            {direction === 'long' ? 'drops' : 'rises'} by{' '}
            {calculateLiquidationDrop(tempLeverage)}%
          </Text>
        </View>

        {/* Price information */}
        {currentPrice ? (
          <View style={styles.priceInfoContainer}>
            <View style={styles.priceRow}>
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                {strings('perps.order.leverage_modal.liquidation_price')}
              </Text>
              <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
                {formatPrice(calculatedLiquidationPrice)}
              </Text>
            </View>
            <View style={styles.priceRow}>
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                {strings('perps.order.leverage_modal.entry_price')}
              </Text>
              <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
                {formatPrice(currentPrice)}
              </Text>
            </View>
            <View style={styles.priceRow}>
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                {strings('perps.order.leverage_modal.liquidation_distance')}
              </Text>
              <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
                {(
                  (Math.abs(currentPrice - calculatedLiquidationPrice) /
                    currentPrice) *
                  100
                ).toFixed(2)}
                %
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
          />
          <View style={styles.sliderLabels}>
            <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
              {minLeverage}x
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
              onPress={() => setTempLeverage(value)}
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

export default PerpsLeverageBottomSheet;
