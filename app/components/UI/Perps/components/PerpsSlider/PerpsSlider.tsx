import React, { useCallback } from 'react';
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
  withSpring
} from 'react-native-reanimated';

import Text from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import styleSheet from './PerpsSlider.styles';
import DevLogger from '../../../../../core/SDKConnect/utils/DevLogger';


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
}

const PerpsSlider: React.FC<PerpsSliderProps> = ({
  value,
  onValueChange,
  minimumValue = 0,
  maximumValue = 100,
  step = 1,
  showPercentageLabels = true,
  disabled = false,
}) => {
  const { styles } = useStyles(styleSheet, {});

  // Shared values for animations
  const sliderWidth = useSharedValue(0);
  const translateX = useSharedValue(0);

  // Convert value to position
  const valueToPosition = useCallback((val: number, width: number) => {
    'worklet';
    const percentage = (val - minimumValue) / (maximumValue - minimumValue);
    return percentage * width;
  }, [minimumValue, maximumValue]);

  // Convert position to value
  const positionToValue = useCallback((position: number, width: number) => {
    'worklet';
    if (width === 0) return minimumValue;
    const percentage = position / width;
    const rawValue = percentage * (maximumValue - minimumValue) + minimumValue;
    // Apply step
    return Math.round(rawValue / step) * step;
  }, [minimumValue, maximumValue, step]);

  // Layout handler to capture slider width
  const handleLayout = useCallback((event: { nativeEvent: { layout: { width: number } } }) => {
    const { width } = event.nativeEvent.layout;
    sliderWidth.value = width;
    // Initialize position after getting width
    translateX.value = valueToPosition(value, width);
  }, [value, valueToPosition, translateX, sliderWidth]);


  // Animated styles
  const progressStyle = useAnimatedStyle(() => ({
    width: translateX.value,
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  // JS callback wrapper
  const updateValue = useCallback((newValue: number) => {
    onValueChange(newValue);
  }, [onValueChange]);

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
      translateX.value = withSpring(newPosition, { damping: 15, stiffness: 400 });
      const newValue = positionToValue(newPosition, sliderWidth.value);
      runOnJS(updateValue)(newValue);
    });

  // Combined gesture
  const composed = Gesture.Simultaneous(tapGesture, panGesture);

  const handlePressPercentage = useCallback((percent: number) => {
    if (disabled) return;

    const newValue = (percent / 100) * (maximumValue - minimumValue) + minimumValue;
    const newPosition = valueToPosition(newValue, sliderWidth.value);
    translateX.value = withSpring(newPosition, { damping: 15, stiffness: 400 });
    onValueChange(newValue);
  }, [disabled, maximumValue, minimumValue, onValueChange, translateX, valueToPosition, sliderWidth.value]);

  const percentageSteps = [0, 25, 50, 75, 100];

  // Format percentage for display
  const displayPercentage = ((value - minimumValue) / (maximumValue - minimumValue)) * 100;
  DevLogger.log('displayPercentage', displayPercentage);

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.sliderContainer}>
        <View
          style={styles.track}
          onLayout={handleLayout}
        >
          <GestureDetector gesture={composed}>
            <Animated.View style={styles.track}>
              <Animated.View style={[styles.progress, progressStyle]} />
              <Animated.View style={[styles.thumb, thumbStyle]} />
            </Animated.View>
          </GestureDetector>
        </View>
      </View>

      {showPercentageLabels && (
        <View style={styles.percentageRow}>
          {percentageSteps.map((percent) => (
            <TouchableOpacity
              key={percent}
              onPress={() => handlePressPercentage(percent)}
              disabled={disabled}
            >
              <Text style={styles.percentageText}>{percent}%</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </GestureHandlerRootView>
  );
};

export default PerpsSlider;
