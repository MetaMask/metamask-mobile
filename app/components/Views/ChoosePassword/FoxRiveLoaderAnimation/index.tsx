import React, { useEffect, useMemo, useRef } from 'react';
import { View, ActivityIndicator } from 'react-native';
import Rive, { Fit, Alignment, RiveRef } from 'rive-react-native';
import { useTheme } from '../../../../util/theme';
import createStyles from './index.styles';

import onboardingRiveFile from '../../../../animations/fox_loading.riv';
import { getScreenDimensions } from '../../../../util/onboarding';
import { isE2E } from '../../../../util/test/utils';

interface FoxRiveLoaderAnimationProps {}

const FoxRiveLoaderAnimation: React.FC<FoxRiveLoaderAnimationProps> = () => {
  const riveRef = useRef<RiveRef>(null);
  const { colors } = useTheme();

  const screenDimensions = getScreenDimensions();

  const styles = useMemo(
    () => createStyles(colors, screenDimensions),
    [colors, screenDimensions],
  );

  useEffect(() => {
    if (isE2E) return;
    const timeoutId = setTimeout(() => {
      if (riveRef.current) {
        riveRef.current.fireState('FoxRaiseUp', 'Loader2');
      }
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [riveRef]);

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
