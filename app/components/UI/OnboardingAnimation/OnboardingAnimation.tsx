import React, { useEffect, useRef } from 'react';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box } from '@metamask/design-system-react-native';

import MetaMaskWordmark from '../../../images/branding/metamask-wordmark.svg';
import Device from '../../../util/device';
import { useTheme } from '../../../util/theme';
import { OnboardingAnimationSelectorIDs } from './OnboardingAnimation.testIds';

const WORDMARK_ASPECT_RATIO = 280.21 / 152;
const WORDMARK_LIFT = 180;
const WORDMARK_HEIGHT = {
  medium: 78,
  regular: 104,
} as const;
const WORDMARK_NUDGE = {
  medium: 6,
  regular: 8,
} as const;

/**
 * Shared layout for the onboarding landing and login screens: the MetaMask
 * wordmark lifted above the vertical center with the call-to-action column
 * anchored at the center below it.
 */
const OnboardingAnimation = ({
  children,
  startOnboardingAnimation,
  setStartFoxAnimation,
  onInteractiveContentReady,
  renderWordmark = (wordmark) => wordmark,
}: {
  children: React.ReactNode;
  startOnboardingAnimation: boolean;
  setStartFoxAnimation: (value: boolean) => void;
  // Must be referentially stable; it feeds the animation callbacks' dependencies.
  onInteractiveContentReady?: () => void;
  // Lets a screen wrap the wordmark, e.g. with a long-press target.
  renderWordmark?: (wordmark: React.ReactElement) => React.ReactNode;
}) => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const isMedium = Device.isMediumDevice();
  const wordmarkHeight = isMedium
    ? WORDMARK_HEIGHT.medium
    : WORDMARK_HEIGHT.regular;
  const wordmarkWidth = Math.round(wordmarkHeight * WORDMARK_ASPECT_RATIO);
  const wordmarkNudge = isMedium
    ? WORDMARK_NUDGE.medium
    : WORDMARK_NUDGE.regular;

  const hasStarted = useRef(false);

  useEffect(() => {
    if (!startOnboardingAnimation || hasStarted.current) {
      return;
    }
    hasStarted.current = true;
    setStartFoxAnimation(true);
    onInteractiveContentReady?.();
  }, [
    startOnboardingAnimation,
    setStartFoxAnimation,
    onInteractiveContentReady,
  ]);

  return (
    <>
      <Box twClassName="w-full flex-1" pointerEvents="box-none">
        <Box
          pointerEvents="box-none"
          twClassName="absolute left-1/2"
          style={tw.style({
            top: '50%',
            marginLeft: -(wordmarkWidth / 2),
            marginTop: -(WORDMARK_LIFT + wordmarkNudge + wordmarkHeight / 2),
          })}
        >
          {renderWordmark(
            <MetaMaskWordmark
              name="metamask-wordmark"
              width={wordmarkWidth}
              height={wordmarkHeight}
              color={colors.text.default}
              testID={OnboardingAnimationSelectorIDs.WORDMARK}
            />,
          )}
        </Box>
      </Box>
      <Box
        pointerEvents="box-none"
        twClassName="absolute left-0 right-0 flex-col px-4"
        style={tw.style({
          top: '50%',
          rowGap: isMedium ? 12 : 16,
        })}
      >
        {children}
      </Box>
    </>
  );
};

export default OnboardingAnimation;
