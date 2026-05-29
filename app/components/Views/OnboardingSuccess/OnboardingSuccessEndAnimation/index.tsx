import React, { useCallback, useEffect, useRef } from 'react';
import Rive, { Fit, Alignment, RiveRef, RNRiveError } from 'rive-react-native';
import { useTheme } from '../../../../util/theme';
import { getScreenDimensions } from '../../../../util/onboarding';
import { isE2E } from '../../../../util/test/utils';
import Logger from '../../../../util/Logger';
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

  const logRiveFailure = useCallback(
    (stage: string, error: Error, context?: Record<string, unknown>) => {
      Logger.error(error, {
        message: `OnboardingSuccessEndAnimation: ${stage}`,
        ...context,
      });
    },
    [],
  );

  const handleRiveError = useCallback(
    (riveError: RNRiveError) => {
      logRiveFailure(
        `Rive onError (${riveError.type})`,
        new Error(riveError.message),
        {
          riveErrorType: riveError.type,
          isDarkMode,
        },
      );
    },
    [isDarkMode, logRiveFailure],
  );

  useEffect(() => {
    if (isE2E) return;
    const timeoutId = setTimeout(() => {
      if (!riveRef.current) {
        logRiveFailure(
          'Rive ref unavailable before animation setup',
          new Error('riveRef.current is null'),
          { isDarkMode },
        );
        return;
      }

      try {
        riveRef.current.setInputState(
          'OnboardingLoader',
          'Dark mode',
          isDarkMode,
        );
        riveRef.current.fireState('OnboardingLoader', 'Only_End');
      } catch (error) {
        logRiveFailure('Rive state transition failed', error as Error, {
          stateMachine: 'OnboardingLoader',
          transition: 'Only_End',
          isDarkMode,
        });
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [isDarkMode, logRiveFailure]);

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
            onError={handleRiveError}
          />
        )}
      </Box>
    </Box>
  );
};

export default OnboardingSuccessEndAnimation;
