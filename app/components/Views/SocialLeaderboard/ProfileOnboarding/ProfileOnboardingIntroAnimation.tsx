import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Alignment,
  Fit,
  RiveView,
  useRive,
  useRiveFile,
  useRiveNumber,
  useRiveTrigger,
  useViewModelInstance,
  type RiveError,
} from '@rive-app/react-native';
import React, { useCallback, useEffect, useState } from 'react';
import SocialOnboardingAnimation from '../../../../animations/social_v1_social-onboarding.riv';
import Logger from '../../../../util/Logger';
import {
  PROFILE_ONBOARDING_RIVE_ARTBOARD,
  PROFILE_ONBOARDING_RIVE_ASSETS,
  PROFILE_ONBOARDING_RIVE_PATHS,
  PROFILE_ONBOARDING_RIVE_STATE_MACHINE,
} from './profileOnboardingRive';
import { SocialProfileOnboardingSelectorsIDs } from './SocialProfileOnboardingView.testIds';
import { useProfileOnboardingRiveEnabled } from './useProfileOnboardingRiveEnabled';

/**
 * How long each scene plays before `continue` fires, keyed by `currentStep`.
 * Podium's dwell also covers the `init` intro. Post (3) has no entry, so it
 * stays on screen. A `continue` fired mid-transition is dropped by the state
 * machine, so each value must exceed the scene's entry animation.
 */
export const PROFILE_ONBOARDING_SCENE_DWELL_MS: Readonly<
  Partial<Record<number, number>>
> = {
  1: 4000,
  2: 3500,
};

interface ProfileOnboardingIntroAnimationProps {
  /** Static content shown when the animation is skipped or fails. */
  fallback: React.ReactNode;
}

/**
 * Intro illustration for profile onboarding. Auto-advances the Social V1
 * onboarding Rive from Podium through Activity to Post, and falls back to
 * static content offline, on low hardware over slow cellular, with Reduce
 * Motion, or on a fatal Rive error.
 */
const ProfileOnboardingIntroAnimation: React.FC<
  ProfileOnboardingIntroAnimationProps
> = ({ fallback }) => {
  const tw = useTailwind();
  const skipAnimation = !useProfileOnboardingRiveEnabled();
  const [hasRiveError, setHasRiveError] = useState(false);

  const { riveFile } = useRiveFile(
    skipAnimation ? undefined : SocialOnboardingAnimation,
    { referencedAssets: PROFILE_ONBOARDING_RIVE_ASSETS },
  );
  const { instance } = useViewModelInstance(riveFile, {
    artboardName: PROFILE_ONBOARDING_RIVE_ARTBOARD,
    async: true,
  });
  const { riveViewRef, setHybridRef } = useRive();
  const { value: currentStep } = useRiveNumber(
    PROFILE_ONBOARDING_RIVE_PATHS.CURRENT_STEP,
    instance,
  );
  const { trigger: fireContinue } = useRiveTrigger(
    PROFILE_ONBOARDING_RIVE_PATHS.CONTINUE,
    instance,
  );

  const isPlaying = !skipAnimation && !hasRiveError && Boolean(riveViewRef);
  useEffect(() => {
    const dwellMs =
      currentStep === undefined
        ? undefined
        : PROFILE_ONBOARDING_SCENE_DWELL_MS[currentStep];
    if (!isPlaying || dwellMs === undefined) {
      return undefined;
    }
    const timer = setTimeout(fireContinue, dwellMs);
    return () => clearTimeout(timer);
  }, [currentStep, fireContinue, isPlaying]);

  const handleError = useCallback((riveError: RiveError) => {
    Logger.error(
      new Error(riveError.message),
      `ProfileOnboardingIntroAnimation: Rive error (${riveError.type})`,
    );
    setHasRiveError(true);
  }, []);

  if (skipAnimation || hasRiveError) {
    return <>{fallback}</>;
  }

  return (
    <Box twClassName="flex-1">
      {riveFile && instance ? (
        <RiveView
          hybridRef={setHybridRef}
          file={riveFile}
          artboardName={PROFILE_ONBOARDING_RIVE_ARTBOARD}
          stateMachineName={PROFILE_ONBOARDING_RIVE_STATE_MACHINE}
          dataBind={instance}
          autoPlay
          fit={Fit.Contain}
          alignment={Alignment.Center}
          style={tw.style('flex-1')}
          onError={handleError}
          testID={SocialProfileOnboardingSelectorsIDs.INTRO_ANIMATION}
        />
      ) : null}
    </Box>
  );
};

export default ProfileOnboardingIntroAnimation;
