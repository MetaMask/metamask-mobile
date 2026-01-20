import React, { useEffect, useMemo, useRef } from 'react';
import { View } from 'react-native';
import Rive, { Fit, Alignment, RiveRef } from 'rive-react-native';
import { useTheme } from '../../../../util/theme';
import createStyles from './index.styles';
import { getScreenDimensions } from '../../../../util/onboarding';
import { isE2E } from '../../../../util/test/utils';

import onboardingLoaderEndAnimation from '../../../../animations/onboarding_loader.riv';

interface OnboardingSuccessEndAnimationProps {
  onAnimationComplete: () => void;
}

const OnboardingSuccessEndAnimation: React.FC<
  OnboardingSuccessEndAnimationProps
> = ({ onAnimationComplete: _onAnimationComplete }) => {
  const riveRef = useRef<RiveRef>(null);
  const { themeAppearance } = useTheme();
  const isDarkMode = themeAppearance === 'dark';

  const screenDimensions = getScreenDimensions();

  const styles = useMemo(
    () => createStyles(screenDimensions),
    [screenDimensions],
  );

  useEffect(() => {
    if (isE2E) return;
    const timeoutId = setTimeout(() => {
      if (riveRef.current) {
        try {
          // Set dark mode input
          riveRef.current.setInputState(
            'OnboardingLoader',
            'Dark mode',
            isDarkMode,
          );
          // Fire the animation trigger
          riveRef.current.fireState('OnboardingLoader', 'Only_End');
        } catch (error) {
          console.error('Error with Rive animation:', error);
        }
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [isDarkMode]);

  return (
    <View
      testID="onboarding-success-end-animation"
      style={styles.animationContainer}
    >
      <View style={styles.animationWrapper}>
        {!isE2E && (
          <Rive
            ref={riveRef}
            source={onboardingLoaderEndAnimation}
            style={styles.riveAnimation}
            autoplay
            fit={Fit.Contain}
            alignment={Alignment.Center}
          />
        )}
      </View>
    </View>
  );
};

export default OnboardingSuccessEndAnimation;
