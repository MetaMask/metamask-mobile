import React, { useEffect } from 'react';
import {
  Alignment,
  Fit,
  RiveView,
  useRive,
  useRiveFile,
} from '@rive-app/react-native';
import { useTheme } from '../../../../util/theme';
import { getScreenDimensions } from '../../../../util/onboarding';
import { hasTestOverrides } from '../../../../util/test/utils';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import onboardingLoaderEndAnimation from '../../../../animations/onboarding_loader.riv';

interface OnboardingSuccessEndAnimationProps {
  onAnimationComplete: () => void;
}

const OnboardingSuccessEndAnimation: React.FC<
  OnboardingSuccessEndAnimationProps
> = ({ onAnimationComplete: _onAnimationComplete }) => {
  const { riveFile } = useRiveFile(onboardingLoaderEndAnimation);
  const { riveViewRef, setHybridRef } = useRive();
  const { themeAppearance } = useTheme();
  const isDarkMode = themeAppearance === 'dark';
  const tw = useTailwind();

  const { screenWidth, screenHeight, animationHeight } = getScreenDimensions();

  useEffect(() => {
    if (hasTestOverrides || !riveViewRef) return;
    try {
      riveViewRef.setBooleanInputValue('Dark mode', isDarkMode);
      riveViewRef.triggerInput('Only_End');
    } catch (error) {
      console.error('Error with Rive animation:', error);
    }
  }, [isDarkMode, riveViewRef]);

  return (
    <Box
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
      style={{ height: screenHeight * 0.5 }}
      testID="onboarding-success-end-animation"
    >
      <Box
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        twClassName="flex-1"
      >
        {!hasTestOverrides && riveFile && (
          <RiveView
            hybridRef={setHybridRef}
            file={riveFile}
            stateMachineName="OnboardingLoader"
            style={tw.style('self-center', {
              width: screenWidth,
              height: animationHeight,
            })}
            autoPlay
            fit={Fit.Contain}
            alignment={Alignment.Center}
          />
        )}
      </Box>
    </Box>
  );
};

export default OnboardingSuccessEndAnimation;
