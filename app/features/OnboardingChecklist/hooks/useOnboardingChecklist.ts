import { useState, useCallback } from 'react';

export const UI_MODE = {
  BANNER: 'banner',
  FLOATING: 'floating',
} as const;

export const STEP3_VARIATION = {
  SINGLE: 'single',
  MULTI: 'multi',
} as const;

export type UiMode = (typeof UI_MODE)[keyof typeof UI_MODE];
export type Step3Variation = (typeof STEP3_VARIATION)[keyof typeof STEP3_VARIATION];

export interface OnboardingSteps {
  step1: boolean;
  step2: boolean;
  step3: boolean;
}

export const useOnboardingChecklist = () => {
  const [uiMode, setUiMode] = useState<UiMode>(UI_MODE.BANNER);
  const [step3Variation, setStep3Variation] = useState<Step3Variation>(
    STEP3_VARIATION.MULTI,
  );
  const [isDismissed, setIsDismissed] = useState(false);
  const [steps, setSteps] = useState<OnboardingSteps>({
    step1: false,
    step2: false,
    step3: false,
  });

  const toggleUiMode = useCallback(() => {
    setUiMode((prev) =>
      prev === UI_MODE.BANNER ? UI_MODE.FLOATING : UI_MODE.BANNER,
    );
  }, []);

  const toggleStep3Variation = useCallback(() => {
    setStep3Variation((prev) =>
      prev === STEP3_VARIATION.MULTI
        ? STEP3_VARIATION.SINGLE
        : STEP3_VARIATION.MULTI,
    );
  }, []);

  const dismiss = useCallback(() => {
    setIsDismissed(true);
  }, []);

  const reset = useCallback(() => {
    setUiMode(UI_MODE.BANNER);
    setStep3Variation(STEP3_VARIATION.MULTI);
    setIsDismissed(false);
    setSteps({
      step1: false,
      step2: false,
      step3: false,
    });
  }, []);

  const completeStep = useCallback((step: keyof OnboardingSteps) => {
    setSteps((prev) => ({
      ...prev,
      [step]: true,
    }));
  }, []);

  return {
    uiMode,
    step3Variation,
    isDismissed,
    steps,
    toggleUiMode,
    toggleStep3Variation,
    dismiss,
    reset,
    completeStep,
  };
};
