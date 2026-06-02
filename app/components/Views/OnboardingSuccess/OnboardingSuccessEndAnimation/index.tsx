import React, { useEffect, useRef, useState } from 'react';
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

/** Debug: increase/decrease to test crash timing (start at 5000, then reduce). */
const ANIMATION_START_DELAY_MS = 5000;
const ONLY_END_TRANSITION_DELAY_MS = 100;

const OnboardingSuccessEndAnimation: React.FC<
  OnboardingSuccessEndAnimationProps
> = ({ onAnimationComplete: _onAnimationComplete }) => {
  const riveRef = useRef<RiveRef>(null);
  const { themeAppearance } = useTheme();
  const isDarkMode = themeAppearance === 'dark';
  const tw = useTailwind();
  const [shouldStartAnimation, setShouldStartAnimation] = useState(isE2E);

  const { screenWidth, screenHeight, animationHeight } = getScreenDimensions();

  useEffect(() => {
    if (isE2E) return;

    const startTimeoutId = setTimeout(() => {
      setShouldStartAnimation(true);
    }, ANIMATION_START_DELAY_MS);

    return () => clearTimeout(startTimeoutId);
  }, []);

  useEffect(
    () => () => {
      try {
        riveRef.current?.stop();
      } catch {
        // Native view may already be torn down on unmount
      }
    },
    [],
  );

  useEffect(() => {
    if (isE2E || !shouldStartAnimation) return;

    const timeoutId = setTimeout(() => {
      if (riveRef.current) {
        try {
          riveRef.current.setInputState(
            'OnboardingLoader',
            'Dark mode',
            isDarkMode,
          );
          riveRef.current.fireState('OnboardingLoader', 'Only_End');
        } catch {
          // Rive may not be ready yet; animation still plays via autoplay
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
        {!isE2E && shouldStartAnimation && (
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
