import React, { useCallback, useEffect, useRef } from 'react';
import { TouchableOpacity, View } from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  configureReanimatedLogger,
  ReanimatedLogLevel,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import Text from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import styleSheet from './PerpsSlider.styles';
import LinearGradient from 'react-native-linear-gradient';

configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false, // Disable strict mode to suppress warnings about shared value modifications
});

interface PerpsSliderProps {
  value: number;
  onValueChange: (value: number) => void;
  minimumValue?: number;
  maximumValue?: number;
  step?: number;
  showPercentageLabels?: boolean;
  disabled?: boolean;
  progressColor?: 'default' | 'gradient';
  quickValues?: number[];
}

const PerpsSlider: React.FC<PerpsSliderProps> = ({
  value,
  onValueChange,
  minimumValue = 0,
  maximumValue = 100,
  step = 1,
  showPercentageLabels = true,
  disabled = false,
  progressColor = 'default',
  quickValues,
}) => {
  const { styles } = useStyles(styleSheet, {});

  // Shared values for animations
  const sliderWidth = useSharedValue(0);
  const translateX = useSharedValue(0);

  // Convert position to value
  const positionToValue = useCallback(
    (position: number, width: number) => {
      'worklet';
      if (width === 0) return minimumValue;
      const percentage = position / width;
      const rawValue =
        percentage * (maximumValue - minimumValue) + minimumValue;
      // Apply step
      return Math.round(rawValue / step) * step;
    },
    [minimumValue, maximumValue, step],
  );

  // Store width in a ref to avoid shared value dependency issues
  const widthRef = useRef(0);

  // Layout handler - pure React callback
  const handleLayout = useCallback(
    (event: { nativeEvent: { layout: { width: number } } }) => {
      const { width } = event.nativeEvent.layout;
      widthRef.current = width;
      // Directly mutate shared values (not tracked by React)
      sliderWidth.value = width;
      const percentage = (value - minimumValue) / (maximumValue - minimumValue);
      translateX.value = percentage * width;
    },
    [value, minimumValue, maximumValue, sliderWidth, translateX],
  );

  // Update position when value changes
  useEffect(() => {
    if (widthRef.current > 0) {
      const percentage = (value - minimumValue) / (maximumValue - minimumValue);
      const newPosition = percentage * widthRef.current;
      translateX.value = withSpring(newPosition, {
        damping: 15,
        stiffness: 400,
      });
    }
  }, [value, minimumValue, maximumValue, translateX, widthRef]);

  // Animated styles
  const progressStyle = useAnimatedStyle(() => ({
    width: translateX.value,
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  // JS callback wrapper
  const updateValue = useCallback(
    (newValue: number) => {
      onValueChange(newValue);
    },
    [onValueChange],
  );

  // Pan gesture for dragging
  const panGesture = Gesture.Pan()
    .enabled(!disabled)
    .onUpdate((event) => {
      const newPosition = Math.max(0, Math.min(event.x, sliderWidth.value));
      translateX.value = newPosition;
    })
    .onEnd(() => {
      const currentValue = positionToValue(translateX.value, sliderWidth.value);
      runOnJS(updateValue)(currentValue);
    });

  // Tap gesture for clicking on track
  const tapGesture = Gesture.Tap()
    .enabled(!disabled)
    .onEnd((event) => {
      const newPosition = Math.max(0, Math.min(event.x, sliderWidth.value));
      translateX.value = withSpring(newPosition, {
        damping: 15,
        stiffness: 400,
      });
      const newValue = positionToValue(newPosition, sliderWidth.value);
      runOnJS(updateValue)(newValue);
    });

  // Combined gesture
  const composed = Gesture.Simultaneous(tapGesture, panGesture);

  const handlePressPercentage = useCallback(
    (percent: number) => {
      if (disabled) return;

      const newValue =
        (percent / 100) * (maximumValue - minimumValue) + minimumValue;
      onValueChange(newValue);
    },
    [disabled, maximumValue, minimumValue, onValueChange],
  );

  const percentageSteps = [0, 25, 50, 75, 100];

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.sliderContainer}>
        <View style={styles.trackContainer} onLayout={handleLayout}>
          <GestureDetector gesture={composed}>
            <Animated.View style={styles.track}>
              {progressColor === 'gradient' ? (
                <Animated.View style={progressStyle}>
                  <LinearGradient
                    colors={['green', 'yellow', 'red']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gradientProgress}
                  />
                </Animated.View>
              ) : (
                <Animated.View style={[styles.progress, progressStyle]} />
              )}
              <Animated.View style={[styles.thumb, thumbStyle]} />
            </Animated.View>
          </GestureDetector>

          {/* Percentage dots positioned on the track */}
          {showPercentageLabels &&
            percentageSteps.map((percent) => {
              // Don't show dots at 0% and 100%
              if (percent === 0 || percent === 100) return null;

              let dotStyle;
              switch (percent) {
                case 25:
                  dotStyle = styles.percentageDot25;
                  break;
                case 50:
                  dotStyle = styles.percentageDot50;
                  break;
                case 75:
                  dotStyle = styles.percentageDot75;
                  break;
                default:
                  dotStyle = {};
              }

              return (
                <View
                  key={`dot-${percent}`}
                  style={[styles.percentageDot, dotStyle]}
                />
              );
            })}

          {/* Percentage labels positioned below the track */}
          {showPercentageLabels &&
            percentageSteps.map((percent) => {
              let wrapperStyle;
              switch (percent) {
                case 0:
                  wrapperStyle = styles.percentageWrapper0;
                  break;
                case 25:
                  wrapperStyle = styles.percentageWrapper25;
                  break;
                case 50:
                  wrapperStyle = styles.percentageWrapper50;
                  break;
                case 75:
                  wrapperStyle = styles.percentageWrapper75;
                  break;
                case 100:
                  wrapperStyle = styles.percentageWrapper100;
                  break;
                default:
                  wrapperStyle = {};
              }

              return (
                <TouchableOpacity
                  key={`label-${percent}`}
                  style={[styles.percentageWrapper, wrapperStyle]}
                  onPress={() => handlePressPercentage(percent)}
                  disabled={disabled}
                >
                  <Text style={styles.percentageText}>{percent}%</Text>
                </TouchableOpacity>
              );
            })}
        </View>
      </View>

      {quickValues && (
        <View style={styles.quickValuesRow}>
          {quickValues.map((val) => (
            <TouchableOpacity key={val} onPress={() => onValueChange(val)}>
              <Text>{val}x</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </GestureHandlerRootView>
  );
};

export default PerpsSlider;
