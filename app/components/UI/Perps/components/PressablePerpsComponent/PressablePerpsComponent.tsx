import React, { useCallback, useRef, useState, useEffect } from 'react';
import {
  Platform,
  TouchableOpacity as RNTouchableOpacity,
  GestureResponderEvent,
  AccessibilityInfo,
} from 'react-native';

/**
 * TouchablePerpsComponent - Platform-specific TouchableOpacity for Perps components
 *
 * WHY THIS IS NECESSARY:
 *
 * This addresses a known React Native bug where TouchableOpacity components inside ScrollViews
 * on Android often fail to respond to touch events after scrolling. Cards work on load but
 * become unresponsive after scroll gestures.
 *
 * The issue is documented in this outstanding Facebook PR:
 * https://github.com/facebook/react-native/pull/51835
 *
 * SOLUTION APPROACH:
 *
 * 1. Custom AndroidTouchableOpacity with optimized thresholds on Android
 * - MAX_DURATION: 900ms (vs 150ms default) - allows much longer touches
 * - MAX_MOVEMENT: 50px (vs 5px default) - allows significant finger movement
 * - MAX_VELOCITY: 0.15 px/ms (vs 0.2 default) - very restrictive for scroll detection
 * - These thresholds prevent accidental taps while scrolling
 * 2. Use standard TouchableOpacity on iOS and in test environments
 * 3. Maintains accessibility support and TalkBack compatibility
 *
 * This is a temporary workaround until React Native fixes the underlying issue.
 *
 * REFERENCE:
 * - React Native Issue: https://github.com/facebook/react-native/pull/51835
 */

// Disable gesture wrapper in test environments to prevent test interference
const isE2ETest =
  process.env.IS_TEST === 'true' || process.env.METAMASK_ENVIRONMENT === 'e2e';
const isUnitTest = process.env.NODE_ENV === 'test';
const isTestEnvironment = isE2ETest || isUnitTest;

// Custom Android TouchableOpacity with less sensitive thresholds
const AndroidTouchableOpacity = ({
  onPress,
  onPressIn,
  onPressOut,
  children,
  ...props
}: React.ComponentProps<typeof RNTouchableOpacity>) => {
  const [isAccessibilityEnabled, setIsAccessibilityEnabled] = useState(false);
  const touchStartRef = useRef<{ time: number; x: number; y: number } | null>(
    null,
  );
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isTestEnvironment) {
      setIsAccessibilityEnabled(false);
      return;
    }

    if (!AccessibilityInfo?.isScreenReaderEnabled) {
      setIsAccessibilityEnabled(false);
      return;
    }

    AccessibilityInfo.isScreenReaderEnabled()
      .then(setIsAccessibilityEnabled)
      .catch(() => setIsAccessibilityEnabled(false));

    if (AccessibilityInfo.addEventListener) {
      const subscription = AccessibilityInfo.addEventListener(
        'screenReaderChanged',
        setIsAccessibilityEnabled,
      );
      return () => subscription?.remove();
    }
  }, []);

  const handlePressIn = (pressEvent: GestureResponderEvent) => {
    if (onPressIn) {
      onPressIn(pressEvent);
    }

    if (!isAccessibilityEnabled && onPress) {
      touchStartRef.current = {
        time: Date.now(),
        x: pressEvent.nativeEvent.locationX,
        y: pressEvent.nativeEvent.locationY,
      };

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        // This will be cancelled by onPressOut if it's a real tap
      }, 50);
    }
  };

  const handlePressOut = (pressEvent: GestureResponderEvent) => {
    if (!isAccessibilityEnabled && onPress && touchStartRef.current) {
      const now = Date.now();
      const duration = now - touchStartRef.current.time;
      const deltaX = Math.abs(
        pressEvent.nativeEvent.locationX - touchStartRef.current.x,
      );
      const deltaY = Math.abs(
        pressEvent.nativeEvent.locationY - touchStartRef.current.y,
      );

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // Very conservative thresholds to prevent accidental taps while scrolling
      const MAX_DURATION = 900; // Very long duration - only deliberate taps
      const MAX_MOVEMENT = 50; // Large movement allowance - natural finger positioning
      const velocity = Math.sqrt(deltaX * deltaX + deltaY * deltaY) / duration;
      const MAX_VELOCITY = 0.15; // Very restrictive velocity - distinguishes scrolls from taps

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

  useEffect(
    () => () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    },
    [],
  );

  let finalOnPress = onPress;
  let finalOnPressIn = onPressIn;
  let finalOnPressOut = onPressOut;

  if (!isAccessibilityEnabled) {
    finalOnPress = undefined;
    finalOnPressIn = handlePressIn;
    finalOnPressOut = handlePressOut;
  }

  return (
    <RNTouchableOpacity
      onPress={finalOnPress}
      onPressIn={finalOnPressIn}
      onPressOut={finalOnPressOut}
      {...props}
    >
      {children}
    </RNTouchableOpacity>
  );
};

export const TouchablePerpsComponent = ({
  children,
  ...props
}: React.ComponentProps<typeof RNTouchableOpacity>) => {
  // Use custom Android TouchableOpacity with less sensitive thresholds
  if (Platform.OS === 'android' && !isE2ETest && !isUnitTest) {
    return (
      <AndroidTouchableOpacity {...props}>{children}</AndroidTouchableOpacity>
    );
  }

  // Use standard TouchableOpacity on iOS and in test environments
  return <RNTouchableOpacity {...props}>{children}</RNTouchableOpacity>;
};
/**
 * useCoordinatedPress - Hook that replicates ButtonBase's press coordination logic
 *
 * This hook provides the exact same press coordination behavior as ButtonBase,
 * including test environment handling and TalkBack compatibility.
 */
export const useCoordinatedPress = () => {
  // Shared coordination system for maximum reliability
  // Both custom TouchableOpacity and main component use the same timestamp reference
  const lastPressTime = useRef(0);
  const COORDINATION_WINDOW = 100; // 100ms window for TalkBack compatibility

  return useCallback((onPress?: () => void) => {
    // Skip coordination logic in test environments
    if (process.env.NODE_ENV === 'test') {
      onPress?.();
      return;
    }

    const now = Date.now();
    const timeSinceLastPress = now - lastPressTime.current;

    if (onPress && timeSinceLastPress > COORDINATION_WINDOW) {
      lastPressTime.current = now;
      onPress();
    }
  }, []); // Empty dependency array - function never changes
};
