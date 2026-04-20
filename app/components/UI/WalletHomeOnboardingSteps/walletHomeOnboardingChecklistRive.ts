import type { WalletHomeOnboardingStepHeroKind } from './walletHomeOnboardingStepHero';

/**
 * Names for `onboard_checklist_v05.riv` — must match Rive artboards / state machine inputs.
 *
 * The file contains three artboards (`01_*` … `03_*`). We drive which one is shown from the
 * wallet-home post-onboarding step (`fund` → 1, `trade` → 2, `notifications` → 3) via
 * {@link WALLET_HOME_ONBOARDING_CHECKLIST_RIVE_ARTBOARD}.
 */
export const WALLET_HOME_ONBOARDING_CHECKLIST_RIVE_STATE_MACHINE =
  'State Machine 1';

/** Trigger on {@link WALLET_HOME_ONBOARDING_CHECKLIST_RIVE_STATE_MACHINE} before leaving the step. */
export const WALLET_HOME_ONBOARDING_CHECKLIST_RIVE_OUTRO_TRIGGER = 'Outro';

/** Time after firing outro before the slide-out starts (lets Rive outro read on screen). */
export const WALLET_HOME_ONBOARDING_CHECKLIST_OUTRO_HOLD_MS = 920;

/** Slide current step off to the left. */
export const WALLET_HOME_ONBOARDING_CHECKLIST_SLIDE_OUT_MS = 300;

/** Slide the next step in from the right. */
export const WALLET_HOME_ONBOARDING_CHECKLIST_SLIDE_IN_MS = 300;

/** Progress bar fill timing when `stepIndex` changes. */
export const WALLET_HOME_ONBOARDING_CHECKLIST_PROGRESS_BAR_MS = 420;

/** Advance timers by at least this after a primary/skip press (non-final step) before expecting `stepIndex` to change. */
export const WALLET_HOME_ONBOARDING_CHECKLIST_STEP_COMMIT_DELAY_MS =
  WALLET_HOME_ONBOARDING_CHECKLIST_OUTRO_HOLD_MS +
  WALLET_HOME_ONBOARDING_CHECKLIST_SLIDE_OUT_MS;

/** Include slide-in settle time for UI tests that assert post-transition state. */
export const WALLET_HOME_ONBOARDING_CHECKLIST_STEP_FULL_TRANSITION_MS =
  WALLET_HOME_ONBOARDING_CHECKLIST_STEP_COMMIT_DELAY_MS +
  WALLET_HOME_ONBOARDING_CHECKLIST_SLIDE_IN_MS;

/** Final step: outro hold + slide out only (no slide-in before unmount). */
export const WALLET_HOME_ONBOARDING_CHECKLIST_COMPLETE_TRANSITION_MS =
  WALLET_HOME_ONBOARDING_CHECKLIST_OUTRO_HOLD_MS +
  WALLET_HOME_ONBOARDING_CHECKLIST_SLIDE_OUT_MS;

/** Rive artboard name per post-onboarding step (aligns with `VISIBLE_STEPS` order). */
export const WALLET_HOME_ONBOARDING_CHECKLIST_RIVE_ARTBOARD: Record<
  WalletHomeOnboardingStepHeroKind,
  string
> = {
  fund: '01_Add_Funds',
  trade: '02_First_Trade',
  notifications: '03_Notifications',
};
