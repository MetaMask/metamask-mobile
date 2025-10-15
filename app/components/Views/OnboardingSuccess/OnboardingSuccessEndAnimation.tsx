import React, { useMemo } from 'react';
import { View } from 'react-native';
import Rive, { Fit, Alignment } from 'rive-react-native';
import { useTheme } from '../../../util/theme';
import createStyles from './OnboardingSuccessEndAnimation.styles.ts';
import { useScreenDimensions } from '../../../hooks/useScreenDimensions';
import { useRiveAnimation } from '../../../hooks/useRiveAnimation';

import onboardingLoaderEndAnimation from '../../../animations/onboarding_loader.riv';

interface OnboardingSuccessEndAnimationProps {
  onAnimationComplete: () => void;
}

const OnboardingSuccessEndAnimation: React.FC<
  OnboardingSuccessEndAnimationProps
> = ({ onAnimationComplete: _onAnimationComplete }) => {
  const { themeAppearance } = useTheme();
  const isDarkMode = themeAppearance === 'dark';

  const screenDimensions = useScreenDimensions();

  const styles = useMemo(
    () => createStyles(screenDimensions),
    [screenDimensions],
  );

  const { riveRef } = useRiveAnimation(isDarkMode, {
    stateMachineName: 'OnboardingLoader',
    darkModeInputName: 'Dark mode',
    startTriggerName: 'Only_End',
  });

  return (
    <View
      testID="onboarding-success-end-animation"
      style={styles.animationContainer}
    >
      <View style={styles.animationWrapper}>
        <Rive
          ref={riveRef}
          source={onboardingLoaderEndAnimation}
          stateMachineName="OnboardingLoader"
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
