import React, { useCallback, useEffect, useMemo } from 'react';
import { View, ActivityIndicator } from 'react-native';
import Rive, { Fit, Alignment } from 'rive-react-native';
import { useTheme } from '../../../util/theme';
import createStyles from './OnboardingSuccessAnimation.styles.ts';
import { useScreenDimensions } from '../../../hooks/useScreenDimensions';
import { useRiveAnimation } from '../../../hooks/useRiveAnimation';

import onboardingRiveFile from '../../../animations/fox_loading.riv';

interface OnboardingSuccessAnimationProps {}

const OnboardingSuccessAnimation: React.FC<
  OnboardingSuccessAnimationProps
> = () => {
  const { colors, themeAppearance } = useTheme();
  const isDarkMode = themeAppearance === 'dark';

  const screenDimensions = useScreenDimensions();

  const styles = useMemo(
    () => createStyles(colors, screenDimensions),
    [colors, screenDimensions],
  );

  const { riveRef, clearRiveTimer } = useRiveAnimation(isDarkMode, {
    stateMachineName: 'FoxRaiseUp',
    darkModeInputName: '', // fox_loading.riv doesn't have Dark mode input
    startTriggerName: 'Loader2',
  });

  const clearTimers = useCallback(() => {
    clearRiveTimer();
  }, [clearRiveTimer]);

  useEffect(
    () => () => {
      clearTimers();
    },
    [clearTimers],
  );

  return (
    <View
      testID="onboarding-success-animation"
      style={styles.animationContainer}
    >
      <View style={styles.animationWrapper}>
        <Rive
          ref={riveRef}
          source={onboardingRiveFile}
          style={styles.riveAnimation}
          autoplay
          fit={Fit.Cover}
          alignment={Alignment.Center}
        />
      </View>
      <View style={styles.textWrapper}>
        <ActivityIndicator size="large" color={colors.text.default} />
      </View>
    </View>
  );
};

export default OnboardingSuccessAnimation;
