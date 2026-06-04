import React, { useEffect, useRef, useState } from 'react';
import Rive, { Fit, Alignment, RiveRef } from 'rive-react-native';
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

const ANIMATION_START_DELAY_MS = 200;
const ONLY_END_TRANSITION_DELAY_MS = 100;

const OnboardingSuccessEndAnimation: React.FC<
  OnboardingSuccessEndAnimationProps
> = ({ onAnimationComplete: _onAnimationComplete }) => {
  const riveRef = useRef<RiveRef>(null);
  const { themeAppearance } = useTheme();
  const isDarkMode = themeAppearance === 'dark';
  const tw = useTailwind();
  const [shouldStartAnimation, setShouldStartAnimation] =
    useState(hasTestOverrides);

  const { screenWidth, screenHeight, animationHeight } = getScreenDimensions();

  useEffect(() => {
    if (hasTestOverrides) return;

    const startTimeoutId = setTimeout(() => {
      setShouldStartAnimation(true);
    }, ANIMATION_START_DELAY_MS);

    return () => clearTimeout(startTimeoutId);
  }, []);

  useEffect(() => {
    if (hasTestOverrides || !shouldStartAnimation) return;

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
    }, ONLY_END_TRANSITION_DELAY_MS);

    return () => clearTimeout(timeoutId);
  }, [isDarkMode, shouldStartAnimation]);

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
        {!hasTestOverrides && shouldStartAnimation && (
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
