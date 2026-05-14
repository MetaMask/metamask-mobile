import React, { useCallback, useEffect, useRef, useState } from 'react';
import Rive, { Alignment, Fit, type RiveRef } from 'rive-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxFlexDirection,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import Logger from '../../../util/Logger';
import StepperProgressBar from './StepperProgressBar';
import StepperContent from './StepperContent';
import { useStepperProgress } from './useStepperProgress';
import type { RiveOnboardingStepperProps } from './RiveOnboardingStepper.types';
import { RiveOnboardingStepperTestIds } from './RiveOnboardingStepper.testIds';

const DEFAULT_BUTTON_VARIANT = ButtonVariant.Primary;

/**
 * Generic multi-step onboarding stepper driven by a single Rive animation.
 *
 * Each step advances the animation by firing a named trigger on a Rive state
 * machine, so you only need one `.riv` file regardless of how many steps your
 * flow has.
 *
 * **Rive file requirements**
 * - One state machine with a trigger input whose name matches `riveConfig.triggerName`.
 * - Each trigger fire should transition the animation to the next visual segment.
 *
 * @see {@link RiveOnboardingStepperProps} for the full prop reference.
 * @see {@link OnboardingStep} for per-step configuration options.
 * @see {@link RiveConfig} for animation wiring options.
 *
 * **Example**
 * See existing MoneyOnboardingView for an example of how to use this component.
 */
const RiveOnboardingStepper = ({
  steps,
  riveConfig,
  riveStyle,
  renderBackground,
  titleTextColor,
  bodyTextColor,
  footerTextColor,
  progressBarColor,
  buttonVariant = DEFAULT_BUTTON_VARIANT,
  buttonIsInverse = false,
  onClose,
  closeButtonIconColor,
  onStepChange,
  onComplete,
  autoCompleteOnLastStep = false,
}: RiveOnboardingStepperProps) => {
  const tw = useTailwind();
  const riveRef = useRef<RiveRef>(null);
  const hasCompletedRef = useRef(false);
  const [isRiveReady, setIsRiveReady] = useState(false);

  const {
    currentStepIndex,
    progress,
    isLastStep,
    advanceStep,
    isButtonDisabled,
  } = useStepperProgress(steps, onStepChange);

  const currentStep = steps[currentStepIndex];

  const showClose =
    onClose && currentStep?.showCloseButton !== false ? onClose : undefined;

  const handleRivePlay = useCallback(() => setIsRiveReady(true), []);

  const safeAutoComplete = useCallback(() => {
    if (hasCompletedRef.current) return;
    hasCompletedRef.current = true;
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    if (!autoCompleteOnLastStep || !isLastStep) return;
    const timer = setTimeout(safeAutoComplete, currentStep.durationMs);
    return () => clearTimeout(timer);
  }, [
    autoCompleteOnLastStep,
    isLastStep,
    currentStep?.durationMs,
    safeAutoComplete,
  ]);

  const handleContinue = useCallback(() => {
    if (isLastStep) {
      onComplete();
      hasCompletedRef.current = true;
      return;
    }

    try {
      riveRef.current?.fireState(
        riveConfig.stateMachineName,
        riveConfig.triggerName,
      );
    } catch (error) {
      Logger.error(error as Error, 'RiveOnboardingStepper: fireState failed');
    }

    advanceStep();
  }, [isLastStep, onComplete, riveConfig, advanceStep]);

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={tw`flex-1`}
      testID={RiveOnboardingStepperTestIds.CONTAINER}
    >
      {/* Configurable full-screen background */}
      <Box twClassName="absolute inset-0" pointerEvents="none">
        {renderBackground()}
      </Box>

      {/* Main content column — hidden until Rive renders its first frame */}
      <Box
        flexDirection={BoxFlexDirection.Column}
        twClassName={`flex-1${!isRiveReady ? ' opacity-0' : ''}`}
      >
        {/* Progress bar */}
        <Box twClassName="px-4 pt-2">
          <StepperProgressBar
            totalSteps={steps.length}
            currentStepIndex={currentStepIndex}
            progress={progress}
            progressBarColor={progressBarColor}
          />
        </Box>

        {/* Text content with fade transition */}
        <Box twClassName="mt-4 px-4">
          <StepperContent
            key={currentStepIndex}
            title={currentStep?.title ?? ''}
            body={currentStep?.body ?? ''}
            titleTextColor={titleTextColor}
            bodyTextColor={bodyTextColor}
            onClose={showClose}
            closeButtonIconColor={closeButtonIconColor}
          />
        </Box>

        {/* Rive animation fills remaining space — intentionally edge-to-edge, no horizontal padding */}
        <Box twClassName="absolute inset-0">
          <Rive
            ref={riveRef}
            style={riveStyle}
            source={riveConfig.source}
            stateMachineName={riveConfig.stateMachineName}
            fit={riveConfig.fit ?? Fit.FitWidth}
            alignment={riveConfig.alignment ?? Alignment.Center}
            autoplay
            testID={RiveOnboardingStepperTestIds.RIVE_ANIMATION}
            onPlay={handleRivePlay}
          />
        </Box>
      </Box>
      <Box
        twClassName={`pb-4${!isRiveReady || !currentStep?.footerText ? ' opacity-0' : ''}`}
      >
        <Text
          twClassName="text-center"
          variant={TextVariant.BodyXs}
          color={footerTextColor}
          numberOfLines={1}
          testID={RiveOnboardingStepperTestIds.FOOTER_TEXT}
        >
          {currentStep.footerText}
        </Text>
      </Box>
      {/* Footer button */}
      <Box
        twClassName={`px-4${!isRiveReady || !currentStep?.buttonLabel ? ' opacity-0' : ''}`}
      >
        <Button
          variant={buttonVariant}
          size={ButtonSize.Lg}
          isInverse={buttonIsInverse}
          onPress={handleContinue}
          isDisabled={isButtonDisabled || !currentStep?.buttonLabel}
          isFullWidth
          testID={RiveOnboardingStepperTestIds.FOOTER_BUTTON}
        >
          {currentStep?.buttonLabel}
        </Button>
      </Box>
    </SafeAreaView>
  );
};

export default RiveOnboardingStepper;
