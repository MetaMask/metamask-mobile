/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { forwardRef, useEffect } from 'react';
import { StyleProp, ViewStyle, TouchableHighlight } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

// Internal dependencies.
import { TouchableOpacityProps } from './';

/**
 * Inner component that handles the animated opacity based on pressed state.
 * This is separated to properly use Reanimated hooks with the pressed state.
 */
const AnimatedContent = ({
  pressed,
  activeOpacity,
  disabled,
  style,
  children,
}: {
  pressed: boolean;
  activeOpacity: number;
  disabled: boolean;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}) => {
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (disabled) return;

    if (pressed) {
      // Instant feedback on press
      opacity.value = activeOpacity;
    } else {
      // Animated fade back on release
      opacity.value = withTiming(1, { duration: 250 });
    }
  }, [pressed, activeOpacity, disabled, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
        },
        animatedStyle,
      ]}
    >
      {children}
    </Animated.View>
  );
};

/**
 * TouchableOpacity component that uses Pressable from react-native-gesture-handler
 * with a nested Animated.View for opacity animations driven by pressed state.
 * This is a drop-in replacement for React Native's TouchableOpacity.
 */
const TouchableOpacity = forwardRef<
  React.ComponentRef<typeof Pressable>,
  TouchableOpacityProps
>(
  (
    {
      children,
      style,
      activeOpacity = 0.2,
      disabled = false,
      delayLongPress = 500,
      ...props
    },
    ref,
  ) => (
    <Pressable
      ref={ref}
      disabled={disabled}
      delayLongPress={delayLongPress}
      style={[{ flexDirection: 'row' }, style]}
      {...props}
    >
      {({ pressed }: { pressed: boolean }) => (
        <AnimatedContent
          pressed={pressed}
          activeOpacity={activeOpacity}
          disabled={disabled}
        >
          {children}
        </AnimatedContent>
      )}
    </Pressable>
  ),
);

TouchableOpacity.displayName = 'TouchableOpacity';

export default TouchableOpacity;
