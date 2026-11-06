/**
 * TEMPORARY. The debug panel cannot reach the gate's hook state, so the
 * flow publishes its machine step here and the panel reads it. Pattern of
 * `kalshiRelinkRequest.ts`. Delete with the demo onboarding.
 */

import type { OnboardingStep } from './kalshiDemoOnboardingMachine';

let step: OnboardingStep | 'unknown' = 'unknown';
const listeners = new Set<() => void>();

export const setKalshiOnboardingState = (next: OnboardingStep): void => {
  if (step === next) {
    return;
  }
  step = next;
  for (const listener of listeners) {
    listener();
  }
};

export const getKalshiOnboardingState = (): OnboardingStep | 'unknown' => step;

export const subscribeKalshiOnboardingState = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
