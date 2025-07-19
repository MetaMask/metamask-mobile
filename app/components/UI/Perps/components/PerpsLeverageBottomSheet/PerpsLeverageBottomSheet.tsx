/* eslint-disable @metamask/design-tokens/color-no-hex */
import React, {
  useRef,
  useState,
  useMemo,
  useCallback,
  useEffect,
} from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
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
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
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
import { Theme } from '../../../../../util/theme/models';
import { DevLogger } from '../../../../../core/SDKConnect/utils/DevLogger';
import { RISK_MANAGEMENT } from '../../constants/hyperLiquidConfig';
import { formatPrice } from '../../utils/formatUtils';
import Routes from '../../../../../constants/navigation/Routes';

interface LeverageRouteParams {
  leverage: number;
  minLeverage?: number;
  maxLeverage?: number;
  currentPrice?: number;
  liquidationPrice?: number;
  direction?: 'long' | 'short';
}

const createStyles = (colors: Theme['colors']) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    leverageDisplay: {
      alignItems: 'center',
      paddingTop: 16,
      paddingBottom: 24,
    },
    leverageText: {
      fontSize: 48,
      fontWeight: '600',
      lineHeight: 56,
    },
    leverageTextLow: {
      color: colors.text.default,
    },
    leverageTextMedium: {
      color: colors.warning.default,
    },
    leverageTextHigh: {
      color: colors.error.default,
    },
    warningContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      backgroundColor: colors.background.alternative,
      borderRadius: 8,
      marginBottom: 24,
    },
    warningIcon: {
      marginRight: 8,
    },
    warningTextLow: {
      color: colors.text.alternative,
    },
    warningTextMedium: {
      color: colors.warning.default,
    },
    warningTextHigh: {
      color: colors.error.default,
    },
    priceInfoContainer: {
      backgroundColor: colors.background.alternative,
      borderRadius: 8,
      padding: 16,
      marginBottom: 32,
    },
    priceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
    },
    sliderContainer: {
      marginBottom: 16,
    },
    sliderLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 8,
    },
    quickSelectButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 24,
      marginBottom: 16,
    },
    quickSelectButton: {
      flex: 1,
      marginHorizontal: 4,
      paddingVertical: 12,
      alignItems: 'center',
      backgroundColor: colors.background.alternative,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border.muted,
    },
    quickSelectButtonActive: {
      backgroundColor: colors.primary.muted,
      borderColor: colors.primary.default,
    },
    quickSelectText: {
      fontWeight: '500',
    },
    leverageSliderContainer: {
      paddingVertical: 8,
    },
    leverageTrack: {
      height: 6,
      backgroundColor: colors.border.muted,
      borderRadius: 3,
      position: 'relative',
    },
    leverageThumb: {
      width: 24,
      height: 24,
      backgroundColor: colors.background.default,
      borderRadius: 12,
      position: 'absolute',
      top: -9,
      left: -12,
      shadowColor: colors.shadow.default,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 3,
      borderWidth: 2,
      borderColor: colors.border.default,
    },
    leverageGradient: {
      flex: 1,
      borderRadius: 3,
    },
    progressContainer: {
      height: 6,
      borderRadius: 3,
      overflow: 'hidden',
      position: 'absolute',
      left: 0,
      top: 0,
    },
    gradientStyle: {
      position: 'absolute',
      left: 0,
      top: 0,
      height: 6,
    },
    emptyPriceInfo: {
      textAlign: 'center',
      paddingVertical: 16,
    },
    tickMark: {
      position: 'absolute',
      width: 4,
      height: 4,
      backgroundColor: colors.border.muted,
      borderRadius: 2,
      top: 1,
    },
  });

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
      setGradientWidth(width);
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
      <View style={styles.leverageTrack} onLayout={handleLayout}>
        <GestureDetector gesture={composed}>
          <Animated.View style={styles.leverageTrack}>
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
                style={[
                  styles.gradientStyle,
                  { width: Math.max(gradientWidth, 300) },
                ]}
              />
            </Animated.View>

            <Animated.View style={[styles.leverageThumb, thumbStyle]} />
          </Animated.View>
        </GestureDetector>

        {/* Tick marks */}
        {tickMarks.map((mark) => (
          <View
            key={mark.value}
            style={[styles.tickMark, { left: `${mark.percentage * 100}%` }]}
          />
        ))}
      </View>
    </GestureHandlerRootView>
  );
};

const PerpsLeverageBottomSheet: React.FC = () => {
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<{ params: LeverageRouteParams }, 'params'>>();
  const {
    leverage,
    minLeverage = 1,
    maxLeverage = 50,
    currentPrice,
    direction = 'long',
  } = route.params || {};

  const { colors } = useTheme();
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const [tempLeverage, setTempLeverage] = useState(leverage || 10);
  const styles = createStyles(colors);

  useEffect(() => {
    bottomSheetRef.current?.onOpenBottomSheet();
  }, []);

  const handleConfirm = () => {
    DevLogger.log(`Confirming leverage: ${tempLeverage}`);
    // Navigate directly to the order screen with the update
    navigation.navigate(Routes.PERPS.ORDER, {
      leverageUpdate: tempLeverage,
    });
  };

  const handleClose = () => {
    DevLogger.log('Closing leverage bottom sheet');
    navigation.goBack();
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
    const maintenanceMargin = RISK_MANAGEMENT.maintenanceMargin;
    const leverageRatio = 1 / lev;
    return Math.round((leverageRatio - maintenanceMargin) * 100);
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

  return (
    <BottomSheet ref={bottomSheetRef}>
      <BottomSheetHeader onClose={handleClose}>
        <Text variant={TextVariant.HeadingMD}>Leverage</Text>
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
            You will be liquidated if price drops by{' '}
            {calculateLiquidationDrop(tempLeverage)}%
          </Text>
        </View>

        {/* Price information */}
        {currentPrice ? (
          <View style={styles.priceInfoContainer}>
            <View style={styles.priceRow}>
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                Liquidation price
              </Text>
              <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
                {formatPrice(calculatedLiquidationPrice)}
              </Text>
            </View>
            <View style={styles.priceRow}>
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                Current price
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
