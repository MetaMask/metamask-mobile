/**
 * Lottie React Native mock for E2E tests
 *
 * Replaces animated Lottie components with static Views to prevent
 * Detox synchronization hangs caused by looping animations.
 */
import React from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';

interface LottieViewProps {
  source?: unknown;
  style?: StyleProp<ViewStyle>;
  autoPlay?: boolean;
  loop?: boolean;
  speed?: number;
  progress?: number;
  resizeMode?: 'cover' | 'contain' | 'center';
  renderMode?: 'AUTOMATIC' | 'HARDWARE' | 'SOFTWARE';
  cacheStrategy?: 'none' | 'weak' | 'strong';
  colorFilters?: unknown[];
  textFiltersIOS?: unknown[];
  textFiltersAndroid?: unknown[];
  onAnimationFinish?: (isCancelled: boolean) => void;
  onAnimationLoop?: () => void;
  onAnimationFailure?: (error: string) => void;
  onAnimationLoaded?: () => void;
  testID?: string;
}

/**
 * Mock LottieView component that renders a static placeholder
 * instead of running animations
 */
const LottieView = React.forwardRef<View, LottieViewProps>((props, ref) => {
  const { style, testID, onAnimationFinish, onAnimationLoaded, autoPlay } =
    props;

  // Immediately fire callbacks that the app might be waiting for
  React.useEffect(() => {
    // Small delay to simulate animation loading
    const timer = setTimeout(() => {
      if (onAnimationLoaded) {
        onAnimationLoaded();
      }
      // If autoPlay is true, also fire finish callback
      if (autoPlay && onAnimationFinish) {
        onAnimationFinish(false);
      }
    }, 10);

    return () => clearTimeout(timer);
  }, [onAnimationLoaded, onAnimationFinish, autoPlay]);

  return (
    <View
      ref={ref}
      style={style as StyleProp<ViewStyle>}
      testID={testID ?? 'lottie-mock'}
      accessibilityLabel="lottie-animation-placeholder"
    />
  );
});

LottieView.displayName = 'LottieView';

export default LottieView;
