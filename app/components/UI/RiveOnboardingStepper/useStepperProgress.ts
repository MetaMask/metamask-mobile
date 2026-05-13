import { useCallback, useEffect, useState } from 'react';
import {
  cancelAnimation,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { OnboardingStep } from './RiveOnboardingStepper.types';

export interface UseStepperProgressResult {
  currentStepIndex: number;
  /** Reanimated shared value from 0 (empty) to 1 (full) for the active step bar. */
  progress: ReturnType<typeof useSharedValue<number>>;
  isLastStep: boolean;
  advanceStep: () => void;
  /** Call this to restart the progress animation for the current step. */
  restartProgress: () => void;
  /**
   * True while the Rive transition animation is in progress.
   * Prevents rapid Continue taps from queuing overlapping animations.
   * Step 0 starts as false (no incoming transition).
   */
  isButtonDisabled: boolean;
}

export const useStepperProgress = (
  steps: OnboardingStep[],
  onStepChange?: (stepIndex: number) => void,
): UseStepperProgressResult => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);
  const progress = useSharedValue(0);

  const isLastStep = currentStepIndex === steps.length - 1;

  const startProgress = useCallback(
    (stepIndex: number) => {
      cancelAnimation(progress);

      // Step 0 is static — no Rive transition plays, so the segment should
      // appear immediately filled rather than animating left-to-right.
      if (stepIndex === 0) {
        // eslint-disable-next-line react-compiler/react-compiler
        progress.value = 1;
        return;
      }

      const duration = steps[stepIndex].durationMs;
      progress.value = 0;
      progress.value = withTiming(1, { duration });
    },
    [steps, progress],
  );

  // Start progress animation on first mount and whenever step changes.
  useEffect(() => {
    startProgress(currentStepIndex);
  }, [currentStepIndex, startProgress]);

  // Fire onStepChange whenever the step index changes.
  useEffect(() => {
    onStepChange?.(currentStepIndex);
  }, [currentStepIndex, onStepChange]);

  // Gate the Continue button while the Rive transition plays.
  // Step 0 has no incoming transition, so the button starts enabled.
  // For all subsequent steps, disable for exactly durationMs then re-enable.
  useEffect(() => {
    if (currentStepIndex === 0) return;

    const duration = steps[currentStepIndex].durationMs;
    setIsButtonDisabled(true);
    const timer = setTimeout(() => {
      setIsButtonDisabled(false);
    }, duration);

    return () => clearTimeout(timer);
  }, [currentStepIndex, steps]);

  const advanceStep = useCallback(() => {
    // Snap the current segment to full before moving on so that rapid taps
    // always produce a clean step boundary with no mid-animation bleed.
    cancelAnimation(progress);
    progress.value = 1;

    setCurrentStepIndex((prev) => {
      if (prev >= steps.length - 1) return prev;
      return prev + 1;
    });
  }, [steps.length, progress]);

  const restartProgress = useCallback(() => {
    startProgress(currentStepIndex);
  }, [startProgress, currentStepIndex]);

  return {
    currentStepIndex,
    progress,
    isLastStep,
    advanceStep,
    restartProgress,
    isButtonDisabled,
  };
};
