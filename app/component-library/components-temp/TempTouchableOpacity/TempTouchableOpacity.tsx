/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useState, useEffect, useRef } from 'react';
import {
  TouchableOpacity as RNTouchableOpacity,
  Platform,
  AccessibilityInfo,
  GestureResponderEvent,
} from 'react-native';

// Internal dependencies.
import { TempTouchableOpacityProps } from './TempTouchableOpacity.types';

const TempTouchableOpacity = ({
  onPress,
  onPressIn,
  onPressOut,
  disabled,
  shouldEnableAndroidPressIn = false,
  children,
  ...props
}: TempTouchableOpacityProps) => {
  // Track accessibility state - initialized as false
  const [isAccessibilityEnabled, setIsAccessibilityEnabled] = useState(false);

  // Tap emulator state for ScrollView compatibility
  const touchStartRef = useRef<{ time: number; x: number; y: number } | null>(
    null,
  );
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if we're in a test environment (consolidated)
  const isTestEnvironment =
    process.env.NODE_ENV === 'test' ||
    process.env.IS_TEST === 'true' ||
    process.env.METAMASK_ENVIRONMENT === 'e2e';

  useEffect(() => {
    if (isTestEnvironment) {
      setIsAccessibilityEnabled(false);
      return;
    }

    // In production, check accessibility state
    if (!AccessibilityInfo?.isScreenReaderEnabled) {
      setIsAccessibilityEnabled(false);
      return;
    }

    AccessibilityInfo.isScreenReaderEnabled()
      .then(setIsAccessibilityEnabled)
      .catch(() => setIsAccessibilityEnabled(false));

    // Listen for accessibility changes
    if (AccessibilityInfo.addEventListener) {
      const subscription = AccessibilityInfo.addEventListener(
        'screenReaderChanged',
        setIsAccessibilityEnabled,
      );
      return () => subscription?.remove();
    }
  }, [isTestEnvironment]);

  // Check if we should apply Android press handling
  const shouldApplyAndroidPressHandling =
    shouldEnableAndroidPressIn &&
    Platform.OS === 'android' &&
    !isTestEnvironment;

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
      }, 50); // 50ms delay to let ScrollView pan gesture win (reduced for responsiveness)
    }
  };

  const handlePressOut = (pressEvent: GestureResponderEvent) => {
    if (
      shouldApplyAndroidPressHandling &&
      !isAccessibilityEnabled &&
      onPress &&
      touchStartRef.current
    ) {
      const now = Date.now();
      const duration = now - touchStartRef.current.time;
      const deltaX = Math.abs(
        pressEvent.nativeEvent.locationX - touchStartRef.current.x,
      );
      const deltaY = Math.abs(
        pressEvent.nativeEvent.locationY - touchStartRef.current.y,
      );

      // Clear the timeout since we're handling it here
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // Very strict tap detection to prevent scroll interference
      const MAX_DURATION = 150; // 150ms max duration (very strict)
      const MAX_MOVEMENT = 5; // 5px max movement (very strict)

      // Calculate velocity to better distinguish taps from scrolls
      const velocity = Math.sqrt(deltaX * deltaX + deltaY * deltaY) / duration;
      const MAX_VELOCITY = 0.2; // 0.2 px/ms max velocity for taps (very strict)

      // Only fire onPress if it's a very clear tap
      if (
        duration < MAX_DURATION &&
        deltaX < MAX_MOVEMENT &&
        deltaY < MAX_MOVEMENT &&
        velocity < MAX_VELOCITY
      ) {
        onPress(pressEvent);
      }

      touchStartRef.current = null;
    }
  };

  // Cleanup timeout on unmount
  useEffect(
    () => () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    },
    [],
  );

  // Determine onPress, onPressIn, and onPressOut handlers based on conditions
  let finalOnPress: ((event: GestureResponderEvent) => void) | undefined =
    onPress;
  let finalOnPressIn: ((event: GestureResponderEvent) => void) | undefined =
    onPressIn;
  let finalOnPressOut: ((event: GestureResponderEvent) => void) | undefined;

  if (shouldApplyAndroidPressHandling) {
    if (isAccessibilityEnabled) {
      // If accessibility is enabled, use normal handlers
      finalOnPress = onPress;
      finalOnPressIn = onPressIn;
      finalOnPressOut = onPressOut; // No special onPressOut handling needed
    } else {
      // If accessibility is disabled, use tap emulator
      finalOnPress = undefined; // We handle this in onPressOut
      finalOnPressIn = handlePressIn;
      finalOnPressOut = handlePressOut;
    }
  }

  return (
    <RNTouchableOpacity
      disabled={disabled}
      onPress={disabled ? undefined : finalOnPress}
      onPressIn={disabled ? undefined : finalOnPressIn}
      onPressOut={disabled ? undefined : finalOnPressOut}
      {...props}
    >
      {children}
    </RNTouchableOpacity>
  );
};

export default TempTouchableOpacity;
