import { useState, useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectSeedphraseBackedUp } from '../../../reducers/user/selectors';
import { selectAccountGroupBalanceForEmptyState } from '../../../selectors/assets/balances';

export const UI_MODE = {
  BANNER: 'banner',
  FLOATING: 'floating',
} as const;

export const STEP3_VARIATION = {
  SINGLE: 'single',
  MULTI: 'multi',
} as const;

export const DESIGN_STYLE = {
  MODERN_FINTECH: 1,
  INTEGRATED_MINIMALIST: 2,
  GLASSMORPHISM: 3,
  MINI_BAR: 4,
  LAYOUT_A: 5,
  LAYOUT_B: 6,
  LAYOUT_C: 7,
} as const;

export type UiMode = (typeof UI_MODE)[keyof typeof UI_MODE];
export type Step3Variation = (typeof STEP3_VARIATION)[keyof typeof STEP3_VARIATION];
export type DesignStyle = (typeof DESIGN_STYLE)[keyof typeof DESIGN_STYLE];

export interface OnboardingSteps {
  step1: boolean;
  step2: boolean;
  step3: boolean;
}

// Prototype Shortcut: Shared state object
const sharedState = {
  steps: {
    step1: false,
    step2: false,
    step3: false,
  } as OnboardingSteps,
  isDismissed: false,
  uiMode: UI_MODE.BANNER as UiMode,
  step3Variation: STEP3_VARIATION.MULTI as Step3Variation,
  designStyle: DESIGN_STYLE.MODERN_FINTECH as DesignStyle,
  isExpanded: false,
};

const listeners = new Set<() => void>();
const notify = () => {
  listeners.forEach((listener) => listener());
};

export const useOnboardingChecklist = () => {
  const [, setTick] = useState(0);

  useEffect(() => {
    const handleChange = () => setTick((t) => t + 1);
    listeners.add(handleChange);
    return () => {
      listeners.delete(handleChange);
    };
  }, []);

  const isSeedphraseBackedUp = useSelector(selectSeedphraseBackedUp);
  const accountGroupBalance = useSelector(selectAccountGroupBalanceForEmptyState);

  // Auto-detect Step 1: SRP Backup
  useEffect(() => {
    if (isSeedphraseBackedUp && !sharedState.steps.step1) {
      sharedState.steps.step1 = true;
      notify();
    }
  }, [isSeedphraseBackedUp]);

  // Auto-detect Step 2: Non-zero balance
  useEffect(() => {
    const hasBalance = (accountGroupBalance?.totalBalanceInUserCurrency ?? 0) > 0;
    if (hasBalance && !sharedState.steps.step2) {
      sharedState.steps.step2 = true;
      notify();
    }
  }, [accountGroupBalance]);

  const toggleUiMode = useCallback(() => {
    sharedState.uiMode = sharedState.uiMode === UI_MODE.BANNER ? UI_MODE.FLOATING : UI_MODE.BANNER;
    notify();
  }, []);

  const cycleDesignStyle = useCallback(() => {
    if (sharedState.designStyle === DESIGN_STYLE.MODERN_FINTECH) {
      sharedState.designStyle = DESIGN_STYLE.INTEGRATED_MINIMALIST;
    } else if (sharedState.designStyle === DESIGN_STYLE.INTEGRATED_MINIMALIST) {
      sharedState.designStyle = DESIGN_STYLE.GLASSMORPHISM;
    } else if (sharedState.designStyle === DESIGN_STYLE.GLASSMORPHISM) {
      sharedState.designStyle = DESIGN_STYLE.MINI_BAR;
    } else if (sharedState.designStyle === DESIGN_STYLE.MINI_BAR) {
      sharedState.designStyle = DESIGN_STYLE.LAYOUT_A;
    } else if (sharedState.designStyle === DESIGN_STYLE.LAYOUT_A) {
      sharedState.designStyle = DESIGN_STYLE.LAYOUT_B;
    } else if (sharedState.designStyle === DESIGN_STYLE.LAYOUT_B) {
      sharedState.designStyle = DESIGN_STYLE.LAYOUT_C;
    } else {
      sharedState.designStyle = DESIGN_STYLE.MODERN_FINTECH;
    }
    notify();
  }, []);

  const toggleStep3Variation = useCallback(() => {
    sharedState.step3Variation = sharedState.step3Variation === STEP3_VARIATION.MULTI
      ? STEP3_VARIATION.SINGLE
      : STEP3_VARIATION.MULTI;
    notify();
  }, []);

  const dismiss = useCallback(() => {
    sharedState.isDismissed = true;
    notify();
  }, []);

  const setIsExpanded = useCallback((val: boolean) => {
    sharedState.isExpanded = val;
    notify();
  }, []);

  const reset = useCallback(() => {
    sharedState.uiMode = UI_MODE.BANNER;
    sharedState.step3Variation = STEP3_VARIATION.MULTI;
    sharedState.designStyle = DESIGN_STYLE.MODERN_FINTECH;
    sharedState.isDismissed = false;
    sharedState.isExpanded = false;
    sharedState.steps = {
      step1: false,
      step2: false,
      step3: false,
    };
    notify();
  }, []);

  const completeStep = useCallback((step: keyof OnboardingSteps) => {
    sharedState.steps[step] = true;
    notify();
  }, []);

  const isAllCompleted = Object.values(sharedState.steps).every(Boolean);
  const hasBalance = (accountGroupBalance?.totalBalanceInUserCurrency ?? 0) > 0;
  const shouldShow = !sharedState.isDismissed && !isAllCompleted && !hasBalance;

  return {
    uiMode: sharedState.uiMode,
    step3Variation: sharedState.step3Variation,
    designStyle: sharedState.designStyle,
    isDismissed: sharedState.isDismissed,
    isExpanded: sharedState.isExpanded,
    setIsExpanded,
    steps: sharedState.steps,
    shouldShow,
    isAllCompleted,
    hasBalance,
    toggleUiMode,
    cycleDesignStyle,
    toggleStep3Variation,
    dismiss,
    reset,
    completeStep,
  };
};
