import React, { useCallback, useEffect, useMemo } from 'react';
import { View, ActivityIndicator } from 'react-native';
import Rive, { Fit, Alignment } from 'rive-react-native';
import { useTheme } from '../../../../util/theme';
import createStyles from './index.styles';
import { useRiveAnimation } from '../../../../hooks/useRiveAnimation';

import onboardingRiveFile from '../../../../animations/fox_loading.riv';
import { getScreenDimensions } from '../../../../util/onboarding';

interface FoxRiveLoaderAnimationProps {}

const FoxRiveLoaderAnimation: React.FC<FoxRiveLoaderAnimationProps> = () => {
  const { colors, themeAppearance } = useTheme();
  const isDarkMode = themeAppearance === 'dark';

  const screenDimensions = getScreenDimensions();

  const styles = useMemo(
    () => createStyles(colors, screenDimensions),
    [colors, screenDimensions],
  );

  const { riveRef, clearRiveTimer } = useRiveAnimation(isDarkMode, {
    stateMachineName: 'FoxRaiseUp',
    darkModeInputName: '',
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
    <View testID="fox-rive-loader-animation" style={styles.animationContainer}>
      <View style={styles.animationWrapper}>
        <Rive
          ref={riveRef}
          source={onboardingRiveFile}
          style={styles.riveAnimation}
          autoplay
          fit={Fit.Contain}
          alignment={Alignment.Center}
        />
      </View>
      <View style={styles.textWrapper}>
        <ActivityIndicator size="large" color={colors.text.default} />
      </View>
    </View>
  );
};

export default FoxRiveLoaderAnimation;
