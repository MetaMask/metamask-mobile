import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, View } from 'react-native';
import Rive, { Alignment, Fit, type RiveRef } from 'rive-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Box,
  BoxFlexDirection,
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import Logger from '../../../util/Logger';
import StepperProgressBar from './StepperProgressBar';
import StepperContent from './StepperContent';
import { useStepperProgress } from './useStepperProgress';
import type { RiveOnboardingStepperProps } from './RiveOnboardingStepper.types';
import { RiveOnboardingStepperTestIds } from './RiveOnboardingStepper.testIds';

const DEFAULT_BUTTON_VARIANT = ButtonVariant.Primary;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backgroundAbsolute: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
  },
  contentHidden: {
    opacity: 0,
  },
  riveContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  footer: {
    paddingHorizontal: 16,
  },
});

/**
 * Generic multi-step onboarding stepper driven by a single Rive animation.
 *
 * Each step advances the animation by firing a named trigger on a Rive state
 * machine, so you only need one `.riv` file regardless of how many steps your
 * flow has.
 *
 * **Quick-start**
 * ```tsx
 * <RiveOnboardingStepper
 *   steps={[
 *     { title: 'Step 1', body: 'Description.', durationMs: 3000, buttonLabel: 'Continue' },
 *     { title: 'Step 2', body: 'Description.', durationMs: 3000, buttonLabel: 'Get started' },
 *   ]}
 *   riveConfig={{
 *     source: require('./my-animation.riv'),
 *     stateMachineName: 'MyStateMachine',
 *     triggerName: 'Next',         // fired on every "Continue" button press
 *   }}
 *   renderBackground={() => <MyGradientBackground />}
 *   textColor={TextColor.PrimaryInverse}
 *   progressBarColor="#FFFFFF"
 *   onComplete={() => navigation.navigate(Routes.HOME)}
 * />
 * ```
 *
 * **Rive file requirements**
 * - One state machine with a trigger input whose name matches `riveConfig.triggerName`.
 * - Each trigger fire should transition the animation to the next visual segment.
 *
 * @see {@link RiveOnboardingStepperProps} for the full prop reference.
 * @see {@link OnboardingStep} for per-step configuration options.
 * @see {@link RiveConfig} for animation wiring options.
 *
 * See existing MoneyOnboardingView for an example of how to use this component.
 */
const RiveOnboardingStepper = ({
  steps,
  riveConfig,
  riveStyle,
  renderBackground,
  textColor,
  progressBarColor,
  buttonVariant = DEFAULT_BUTTON_VARIANT,
  buttonIsInverse = false,
  onClose,
  closeButtonIconColor,
  onStepChange,
  onComplete,
  autoCompleteOnLastStep = false,
}: RiveOnboardingStepperProps) => {
  const riveRef = useRef<RiveRef>(null);
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

  const flatRiveStyle = useMemo(
    () => StyleSheet.flatten(riveStyle),
    [riveStyle],
  );

  const handleRivePlay = useCallback(() => setIsRiveReady(true), []);

  useEffect(() => {
    if (!autoCompleteOnLastStep || !isLastStep) return;
    const timer = setTimeout(onComplete, currentStep.durationMs);
    return () => clearTimeout(timer);
  }, [autoCompleteOnLastStep, isLastStep, currentStep?.durationMs, onComplete]);

  const handleContinue = useCallback(() => {
    if (isLastStep) {
      onComplete();
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
      style={styles.root}
      testID={RiveOnboardingStepperTestIds.CONTAINER}
    >
      {/* Configurable full-screen background */}
      <View style={styles.backgroundAbsolute} pointerEvents="none">
        {renderBackground()}
      </View>

      {/* Main content column — hidden until Rive renders its first frame */}
      <Box
        flexDirection={BoxFlexDirection.Column}
        style={[styles.content, !isRiveReady && styles.contentHidden]}
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
            textColor={textColor}
            onClose={showClose}
            closeButtonIconColor={closeButtonIconColor}
          />
        </Box>

        {/* Rive animation fills remaining space — intentionally edge-to-edge, no horizontal padding */}
        <View style={styles.riveContainer}>
          <Rive
            ref={riveRef}
            style={flatRiveStyle}
            source={riveConfig.source}
            stateMachineName={riveConfig.stateMachineName}
            fit={riveConfig.fit ?? Fit.FitWidth}
            alignment={riveConfig.alignment ?? Alignment.Center}
            autoplay
            testID={RiveOnboardingStepperTestIds.RIVE_ANIMATION}
            onPlay={handleRivePlay}
          />
        </View>
      </Box>
      {/* Footer button */}
      <Box
        style={[
          styles.footer,
          (!isRiveReady || !currentStep?.buttonLabel) && styles.contentHidden,
        ]}
      >
        <Button
          variant={buttonVariant}
          size={ButtonSize.Lg}
          isInverse={buttonIsInverse}
          onPress={handleContinue}
          isDisabled={isButtonDisabled}
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
