import { Platform, TouchableOpacity as RNTouchableOpacity } from 'react-native';
import { TouchableOpacity as TemporaryTouchableOpacity } from '../../../../../component-library/components/Buttons/Button/foundation/ButtonBase/ButtonBase';
import { useCallback, useRef, useEffect } from 'react';

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
 * - This TouchableOpacity has built-in press coordination logic
 * 2. Use standard TouchableOpacity in test environments to prevent E2E test failures
 * 3. Replicate ButtonBase's conditional press logic for consistent behavior
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
 * useCoordinatedPress - Hook that replicates ButtonBase's press coordination logic
 *
 * This hook provides the exact same press coordination behavior as ButtonBase,
 * including test environment handling and TalkBack compatibility.
 */
export const useCoordinatedPress = () => {
  // Shared coordination system for maximum reliability
  // Both custom TouchableOpacity and main component use the same timestamp reference
  const lastPressTime = useRef(0);
  const COORDINATION_WINDOW = 500; // 500ms window for TalkBack compatibility and double-tap prevention

  // Immediate lock to prevent race conditions when multiple handlers check timestamp simultaneously
  const isPressing = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(
    () => () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    },
    [],
  );

  return useCallback((onPress?: () => void) => {
    // Skip coordination logic in test environments
    if (process.env.NODE_ENV === 'test') {
      onPress?.();
      return;
    }

    // Immediate lock check - prevents race condition
    if (isPressing.current) {
      return;
    }

    const now = Date.now();
    const timeSinceLastPress = now - lastPressTime.current;

    if (onPress && timeSinceLastPress > COORDINATION_WINDOW) {
      lastPressTime.current = now;
      isPressing.current = true;

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Reset after short delay to prevent immediate double-fire
      timeoutRef.current = setTimeout(() => {
        isPressing.current = false;
      }, 300); // Short timeout just to prevent race condition

      onPress();
    }
  }, []); // Empty dependency array - function never changes
};
