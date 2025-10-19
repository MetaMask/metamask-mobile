import { Platform, TouchableOpacity as RNTouchableOpacity } from 'react-native';
import { TouchableOpacity as TemporaryTouchableOpacity } from '../../../../../component-library/components/Buttons/Button/foundation/ButtonBase/ButtonBase';

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
