/**
 * Persisted wallet-home post-onboarding steps (empty-balance tile).
 *
 * When non-null, the checklist tile is hidden. Distinguishes:
 * - `flow_completed` — user finished or skipped through the last step
 * - `account_funded` — aggregate balance became positive (also clears eligibility in reducer)
 */
export type WalletHomeOnboardingStepsSuppressedReason =
  | 'flow_completed'
  | 'account_funded';

export interface WalletHomeOnboardingStepsState {
  suppressedReason: WalletHomeOnboardingStepsSuppressedReason | null;
  /** Index into the visible step list (fund → trade → notifications). */
  stepIndex: number;
}

export const WALLET_HOME_ONBOARDING_STEPS_INITIAL: WalletHomeOnboardingStepsState =
  {
    suppressedReason: null,
    stepIndex: 0,
  };
