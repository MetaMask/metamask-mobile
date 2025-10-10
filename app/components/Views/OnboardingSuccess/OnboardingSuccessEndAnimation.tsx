import React, { useCallback, useEffect, useRef, useMemo } from 'react';
import { View, Dimensions } from 'react-native';
import Rive, { RiveRef, Fit, Alignment } from 'rive-react-native';
import { useTheme } from '../../../util/theme';
import createStyles from './OnboardingSuccessEndAnimation.styles.ts';
import { isE2E } from '../../../util/test/utils';

import onboardingLoaderEndAnimation from '../../../animations/onboarding_loader_end_animation.riv';

interface OnboardingSuccessEndAnimationProps {
  startAnimation: boolean;
  onAnimationComplete: () => void;
}

const OnboardingSuccessEndAnimation: React.FC<
  OnboardingSuccessEndAnimationProps
> = ({
  startAnimation: _startAnimation,
  onAnimationComplete: _onAnimationComplete,
}) => {
  const { themeAppearance } = useTheme();
  const isDarkMode = themeAppearance === 'dark';

  const screenDimensions = useMemo(() => {
    const { width, height } = Dimensions.get('window');
    return {
      screenWidth: width,
      screenHeight: height,
      animationHeight: height * 0.6,
    };
  }, []);

  const styles = useMemo(
    () => createStyles(screenDimensions),
    [screenDimensions],
  );

  const riveRef = useRef<RiveRef>(null);
  const riveTimeoutId = useRef<NodeJS.Timeout | null>(null);

  const clearTimers = useCallback(() => {
    if (riveTimeoutId.current) {
      clearTimeout(riveTimeoutId.current);
      riveTimeoutId.current = null;
    }
  }, []);

  const startRiveAnimation = useCallback(() => {
    if (isE2E) {
      // Set static state for E2E tests
      if (riveRef.current) {
        riveRef.current.setInputState(
          'OnboardingLoader',
          'Dark mode',
          isDarkMode,
        );
        riveRef.current.fireState('OnboardingLoader', 'Start');
      }
      return;
    }

    if (!riveRef.current) {
      return;
    }

    if (riveTimeoutId.current) {
      clearTimeout(riveTimeoutId.current);
    }

    riveTimeoutId.current = setTimeout(() => {
      if (riveRef.current) {
        try {
          riveRef.current.setInputState(
            'OnboardingLoader',
            'Dark mode',
            isDarkMode,
          );
          riveRef.current.fireState('OnboardingLoader', 'Start');
        } catch (error) {
          console.error('Error with Rive animation:', error);
        }
      }
      riveTimeoutId.current = null;
    }, 100);
  }, [isDarkMode]);

  useEffect(() => {
    startRiveAnimation();

    return () => {
      clearTimers();
    };
  }, [startRiveAnimation, clearTimers]);

  return (
    <View
      testID="onboarding-success-end-animation"
      style={styles.animationContainer}
    >
      <View style={styles.animationWrapper}>
        <Rive
          ref={riveRef}
          source={onboardingLoaderEndAnimation}
          style={styles.riveAnimation}
          autoplay
          fit={Fit.Cover}
          alignment={Alignment.Center}
        />
      </View>
    </View>
  );
};

export default OnboardingSuccessEndAnimation;
