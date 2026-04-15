import React, { useEffect, useRef } from 'react';
import Rive, { Fit, Alignment, RiveRef } from 'rive-react-native';
import { useTheme } from '../../../../util/theme';
import { getScreenDimensions } from '../../../../util/onboarding';
import { isE2E } from '../../../../util/test/utils';
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
  const riveRef = useRef<RiveRef>(null);
  const { themeAppearance } = useTheme();
  const isDarkMode = themeAppearance === 'dark';
  const tw = useTailwind();

  const { screenWidth, screenHeight, animationHeight } = getScreenDimensions();

  useEffect(() => {
    if (isE2E) return;
    const timeoutId = setTimeout(() => {
      if (riveRef.current) {
        try {
          riveRef.current.setInputState(
            'OnboardingLoader',
            'Dark mode',
            isDarkMode,
          );
          riveRef.current.fireState('OnboardingLoader', 'Only_End');
        } catch (error) {
          console.error('Error with Rive animation:', error);
        }
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [isDarkMode]);

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
        {!isE2E && (
          <Rive
            ref={riveRef}
            source={onboardingLoaderEndAnimation}
            style={tw.style('self-center', {
              width: screenWidth,
              height: animationHeight,
            })}
            autoplay
            fit={Fit.Contain}
            alignment={Alignment.Center}
          />
        )}
      </Box>
    </Box>
  );
};

export default OnboardingSuccessEndAnimation;
