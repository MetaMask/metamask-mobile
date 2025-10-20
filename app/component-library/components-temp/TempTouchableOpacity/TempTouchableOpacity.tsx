/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useState, useEffect, useRef } from 'react';
import {
  TouchableOpacity as RNTouchableOpacity,
  Platform,
  AccessibilityInfo,
  GestureResponderEvent,
  TouchableOpacityProps,
} from 'react-native';

// Internal dependencies.
interface TempTouchableOpacityProps extends TouchableOpacityProps {
  /**
   * Function to trigger when pressing the button.
   */
  onPress?: (event: GestureResponderEvent) => void;
  /**
   * Function to trigger when pressing in the button.
   */
  onPressIn?: (event: GestureResponderEvent) => void;
  /**
   * Optional prop to enable Android press handling.
   * @default true
   */
  shouldEnableAndroidPressIn?: boolean;
  /**
   * Optional param to disable the button.
   */
  disabled?: boolean;
  /**
   * Child components to render inside the touchable.
   */
  children?: React.ReactNode;
}

const TempTouchableOpacity = ({
  onPress,
  onPressIn,
  disabled,
  shouldEnableAndroidPressIn = true,
  children,
  ...props
}: TempTouchableOpacityProps) => {
  // Track accessibility state - initialized as false
  const [isAccessibilityEnabled, setIsAccessibilityEnabled] = useState(false);

  // Tap emulator state for ScrollView compatibility
  const touchStartRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check accessibility state and handle errors
    AccessibilityInfo.isScreenReaderEnabled()
      .then(setIsAccessibilityEnabled)
      .catch(() => {
        // Keep as false if there's an error
        setIsAccessibilityEnabled(false);
      });

    // Listen for accessibility changes
    const subscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      setIsAccessibilityEnabled,
    );

    return () => subscription?.remove();
  }, []);

  // Check if we should apply Android press handling
  const isE2ETest =
    process.env.IS_TEST === 'true' ||
    process.env.METAMASK_ENVIRONMENT === 'e2e';
  const isUnitTest = process.env.NODE_ENV === 'test';
  const shouldApplyAndroidPressHandling =
    shouldEnableAndroidPressIn &&
    Platform.OS === 'android' &&
    !isE2ETest &&
    !isUnitTest;

  // Tap emulator for ScrollView compatibility
  const handlePressIn = (pressEvent: GestureResponderEvent) => {
    if (onPressIn) {
      onPressIn(pressEvent);
    }

    if (shouldApplyAndroidPressHandling && !isAccessibilityEnabled && onPress) {
      // Record touch start for tap emulation
      touchStartRef.current = {
        time: Date.now(),
        x: pressEvent.nativeEvent.locationX,
        y: pressEvent.nativeEvent.locationY,
      };

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set a delay to allow ScrollView to win if user is scrolling
      timeoutRef.current = setTimeout(() => {
        // This will be cancelled by onPressOut if it's a real tap
      }, 100); // 100ms delay to let ScrollView pan gesture win
    }
  };

  const handlePressOut = (pressEvent: GestureResponderEvent) => {
    if (shouldApplyAndroidPressHandling && !isAccessibilityEnabled && onPress && touchStartRef.current) {
      const now = Date.now();
      const duration = now - touchStartRef.current.time;
      const deltaX = Math.abs(pressEvent.nativeEvent.locationX - touchStartRef.current.x);
      const deltaY = Math.abs(pressEvent.nativeEvent.locationY - touchStartRef.current.y);

      // Clear the timeout since we're handling it here
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // Only fire if it's a real tap (short duration, small movement)
      const MAX_DURATION = 300; // 300ms max duration
      const MAX_MOVEMENT = 20; // 20px max movement

      if (duration < MAX_DURATION && deltaX < MAX_MOVEMENT && deltaY < MAX_MOVEMENT) {
        onPress(pressEvent);
      }

      touchStartRef.current = null;
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  // Determine onPress and onPressIn handlers based on conditions
  let finalOnPress: ((event: GestureResponderEvent) => void) | undefined =
    onPress;
  let finalOnPressIn: ((event: GestureResponderEvent) => void) | undefined =
    onPressIn;

  if (shouldApplyAndroidPressHandling) {
    if (isAccessibilityEnabled) {
      // If accessibility is enabled, use normal handlers
      finalOnPress = onPress;
      finalOnPressIn = onPressIn;
    } else {
      // If accessibility is disabled, use tap emulator
      finalOnPress = undefined; // We handle this in onPressOut
      finalOnPressIn = handlePressIn;
    }
  }

  return (
    <RNTouchableOpacity
      disabled={disabled}
      onPress={disabled ? undefined : finalOnPress}
      onPressIn={disabled ? undefined : finalOnPressIn}
      onPressOut={disabled ? undefined : handlePressOut}
      {...props}
    >
      {children}
    </RNTouchableOpacity>
  );
};

export default TempTouchableOpacity;
