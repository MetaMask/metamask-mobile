import type { WalletHomeOnboardingStepHeroKind } from './walletHomeOnboardingStepHero';

export type WalletHomeOnboardingStepKind = WalletHomeOnboardingStepHeroKind;

export type StepButtonLayout = 'full_width_primary' | 'skip_and_primary_row';

export interface WalletHomeOnboardingVisibleStep {
  kind: WalletHomeOnboardingStepKind;
  buttonLayout: StepButtonLayout;
}

/** Ordered checklist steps (fund → trade → notifications). */
export const WALLET_HOME_ONBOARDING_VISIBLE_STEPS: WalletHomeOnboardingVisibleStep[] =
  [
    { kind: 'fund', buttonLayout: 'full_width_primary' },
    { kind: 'trade', buttonLayout: 'skip_and_primary_row' },
    { kind: 'notifications', buttonLayout: 'skip_and_primary_row' },
  ];

/** Progress segments: step 1 → 25%, 2 → 50%, 3 → 75%; 100% runs on completion before exit. */
export const WALLET_HOME_ONBOARDING_PROGRESS_DENOMINATOR =
  WALLET_HOME_ONBOARDING_VISIBLE_STEPS.length + 1;

export function walletHomeOnboardingProgressRatioForStep(
  stepIndex: number,
): number {
  return (stepIndex + 1) / WALLET_HOME_ONBOARDING_PROGRESS_DENOMINATOR;
}

export function walletHomeOnboardingCappedVisualStepIndex(
  displayStepIndex: number,
): number {
  return Math.min(
    displayStepIndex,
    WALLET_HOME_ONBOARDING_VISIBLE_STEPS.length - 1,
  );
}

export function walletHomeOnboardingMaxPersistedStepIndex(): number {
  return Math.max(0, WALLET_HOME_ONBOARDING_VISIBLE_STEPS.length - 1);
}
