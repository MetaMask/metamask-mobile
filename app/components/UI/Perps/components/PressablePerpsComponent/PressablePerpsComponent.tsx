import { Platform, TouchableOpacity as RNTouchableOpacity } from 'react-native';
import { TouchableOpacity as TemporaryTouchableOpacity } from '../../../../../component-library/components/Buttons/Button/foundation/ButtonBase/ButtonBase';
import { useRef } from 'react';

/**
 * TouchablePerpsComponent - Platform-specific TouchableOpacity for Perps components
 *
 * WHY THIS IS NECESSARY:
 *
 * This addresses a known React Native bug where TouchableOpacity components inside ScrollViews
 * on Android often fail to respond to touch events. This is a common issue with React Native's
 * new architecture update that affects scrollable views on Android.
 *
 * The issue is documented in this outstanding Facebook PR:
 * https://github.com/facebook/react-native/pull/51835
 *
 * SOLUTION APPROACH:
 *
 * 1. Use Android-specific TouchableOpacity (from ButtonBase) in production Android environments
 * 2. Use standard TouchableOpacity in test environments to prevent E2E test failures
 * 3. Combine with press coordination system to prevent double-press issues with TalkBack
 *
 * This is a temporary workaround until React Native fixes the underlying issue on their side.
 *
 * REFERENCE:
 * - React Native Issue: https://github.com/facebook/react-native/pull/51835
 */

// Disable gesture wrapper in test environments to prevent test interference
const isE2ETest =
  process.env.IS_TEST === 'true' || process.env.METAMASK_ENVIRONMENT === 'e2e';
const isUnitTest = process.env.NODE_ENV === 'test';

export const TouchablePerpsComponent =
  Platform.OS === 'android' && !isE2ETest && !isUnitTest
    ? TemporaryTouchableOpacity
    : RNTouchableOpacity;

/**
 * useCoordinatedPress - Hook for preventing double-press issues
 *
 * This hook provides press coordination to prevent rapid successive presses,
 * which is especially important for accessibility (TalkBack) and prevents
 * accidental double-taps that could cause unintended actions.
 *
 * Uses a 100ms coordination window, matching the ButtonBase implementation.
 */
export const useCoordinatedPress = () => {
  // Shared coordination system for maximum reliability
  // Both custom TouchableOpacity and main component use the same timestamp reference
  const lastPressTime = useRef(0);
  const COORDINATION_WINDOW = 100; // 100ms window for TalkBack compatibility

  return (onPress: () => void) => {
    const now = Date.now();
    const timeSinceLastPress = now - lastPressTime.current;

    if (onPress && timeSinceLastPress > COORDINATION_WINDOW) {
      lastPressTime.current = now;
      onPress();
    }
  };
};
