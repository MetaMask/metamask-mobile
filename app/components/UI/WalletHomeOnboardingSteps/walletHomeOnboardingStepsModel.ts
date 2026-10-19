import type { WalletHomeOnboardingStepHeroKind } from './walletHomeOnboardingStepHero';

export type WalletHomeOnboardingStepKind = WalletHomeOnboardingStepHeroKind;

export type StepButtonLayout = 'full_width_primary' | 'skip_and_primary_row';

export interface WalletHomeOnboardingVisibleStep {
  kind: WalletHomeOnboardingStepKind;
  buttonLayout: StepButtonLayout;
}

/** Every checklist step in order (fund → trade → notifications), before per-user filtering. */
export const WALLET_HOME_ONBOARDING_ALL_STEPS: readonly WalletHomeOnboardingVisibleStep[] =
  [
    { kind: 'fund', buttonLayout: 'full_width_primary' },
    { kind: 'trade', buttonLayout: 'skip_and_primary_row' },
    { kind: 'notifications', buttonLayout: 'skip_and_primary_row' },
  ];

/**
 * The steps this user should walk through.
 *
 * The notifications step is dropped once the OS push permission request has already been
 * asked for — that user answered the notifications question at the push pre-prompt, so
 * asking again here would be a second nudge. Users who chose "Not now" on the pre-prompt
 * never reached the OS request and still get the step.
 *
 * @see https://consensyssoftware.atlassian.net/browse/TMCU-924
 */
export function walletHomeOnboardingVisibleSteps({
  includeNotificationsStep,
}: {
  includeNotificationsStep: boolean;
}): WalletHomeOnboardingVisibleStep[] {
  return WALLET_HOME_ONBOARDING_ALL_STEPS.filter(
    (step) => includeNotificationsStep || step.kind !== 'notifications',
  );
}

/** Progress segments with 3 steps: step 1 → 25%, 2 → 50%, 3 → 75%; 100% runs on completion before exit. */
export function walletHomeOnboardingProgressDenominator(
  stepCount: number,
): number {
  return Math.max(1, stepCount) + 1;
}

export function walletHomeOnboardingProgressRatioForStep(
  stepIndex: number,
  stepCount: number,
): number {
  return (stepIndex + 1) / walletHomeOnboardingProgressDenominator(stepCount);
}

export function walletHomeOnboardingCappedVisualStepIndex(
  displayStepIndex: number,
  stepCount: number,
): number {
  return Math.min(
    displayStepIndex,
    walletHomeOnboardingMaxPersistedStepIndex(stepCount),
  );
}

export function walletHomeOnboardingMaxPersistedStepIndex(
  stepCount: number,
): number {
  return Math.max(0, stepCount - 1);
}

export function walletHomeOnboardingShouldHoldRenderForDroppedStep({
  displayStepIndex,
  stepCount,
  includeNotificationsStep,
}: {
  displayStepIndex: number;
  stepCount: number;
  includeNotificationsStep: boolean;
}): boolean {
  return (
    !includeNotificationsStep &&
    displayStepIndex > walletHomeOnboardingMaxPersistedStepIndex(stepCount)
  );
}
