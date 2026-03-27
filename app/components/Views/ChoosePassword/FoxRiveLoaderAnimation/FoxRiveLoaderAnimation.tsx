import React, { useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator } from 'react-native';
import Rive, { Fit, Alignment, RiveRef } from 'rive-react-native';
import { useTheme } from '../../../../util/theme';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import onboardingRiveFile from '../../../../animations/fox_loading.riv';
import { getScreenDimensions } from '../../../../util/onboarding';
import { isE2E } from '../../../../util/test/utils';

interface FoxRiveLoaderAnimationProps {}

const FoxRiveLoaderAnimation: React.FC<FoxRiveLoaderAnimationProps> = () => {
  const riveRef = useRef<RiveRef>(null);
  const { colors } = useTheme();
  const tw = useTailwind();
  const { screenWidth, animationHeight } = getScreenDimensions();

  const animationWrapperStyle = useMemo(
    () => ({ width: screenWidth, height: animationHeight }),
    [screenWidth, animationHeight],
  );

  const riveAnimationStyle = useMemo(
    () => ({
      ...tw.style('self-center bg-background-default'),
      width: screenWidth * 0.4,
      height: animationHeight,
    }),
    [screenWidth, animationHeight, tw],
  );

  const textWrapperStyle = useMemo(
    () => ({ width: screenWidth }),
    [screenWidth],
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
    <Box
      testID="fox-rive-loader-animation"
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Start}
      twClassName="flex-1 bg-background-default pt-[30px]"
    >
      <Box
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        twClassName="bg-background-default"
        style={animationWrapperStyle}
      >
        <Rive
          ref={riveRef}
          source={onboardingRiveFile}
          style={riveAnimationStyle}
          autoplay
          fit={Fit.Contain}
          alignment={Alignment.Center}
        />
      </Box>
      <Box
        justifyContent={BoxJustifyContent.End}
        twClassName="px-5"
        style={textWrapperStyle}
      >
        <ActivityIndicator size="large" color={colors.text.default} />
      </Box>
    </Box>
  );
};

export default FoxRiveLoaderAnimation;
