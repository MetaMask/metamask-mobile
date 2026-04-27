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

/** Final step: slide the whole checklist down off-screen before revealing wallet balance. */
export const WALLET_HOME_ONBOARDING_CHECKLIST_SLIDE_DOWN_OUT_MS = 380;

/**
 * Fraction of React Native `Dimensions.get('window').height` used as the slide-down
 * exit distance on the last step (non-curtain path). Scales with tall devices so the
 * checklist clears the viewport.
 */
export const WALLET_HOME_ONBOARDING_CHECKLIST_SLIDE_DOWN_EXIT_WINDOW_HEIGHT_RATIO = 0.55;

/**
 * Minimum downward translate (logical px) for that exit, so short / split layouts
 * still move the tile fully off-screen when `ratio * height` would be too small.
 */
export const WALLET_HOME_ONBOARDING_CHECKLIST_SLIDE_DOWN_EXIT_MIN_PX = 360;

/** Downward `translateY` distance for the final checklist slide-off (non-curtain). */
export function walletHomeOnboardingChecklistSlideDownExitDistancePx(
  windowHeight: number,
): number {
  return Math.max(
    windowHeight *
      WALLET_HOME_ONBOARDING_CHECKLIST_SLIDE_DOWN_EXIT_WINDOW_HEIGHT_RATIO,
    WALLET_HOME_ONBOARDING_CHECKLIST_SLIDE_DOWN_EXIT_MIN_PX,
  );
}

/** Wallet curtain rise: homepage slides up over the balance cluster. */
export const WALLET_HOME_POST_ONBOARDING_CURTAIN_SLIDE_UP_MS = 480;

/** Wallet curtain fall: homepage slides back down, revealing the new balance cluster. */
export const WALLET_HOME_POST_ONBOARDING_CURTAIN_SLIDE_DOWN_MS = 560;

/**
 * Brief pause before the curtain rises after the user presses the last step's primary —
 * lets the button press feedback land before motion starts.
 */
export const WALLET_HOME_POST_ONBOARDING_CURTAIN_PRE_HOLD_MS = 80;

/**
 * Hold at the top of the rise so the swap underneath (checklist → balance) feels deliberate
 * instead of instant. Also gives the new cluster `onLayout` time to fire before we start the fall.
 */
export const WALLET_HOME_POST_ONBOARDING_CURTAIN_TOP_HOLD_MS = 140;

/**
 * Max wait for the inner cluster `onLayout` to report a post-swap height (different
 * from the pre-swap height) before falling back to the latest measured inner height.
 */
export const WALLET_HOME_POST_ONBOARDING_CURTAIN_LAYOUT_WAIT_MS = 320;

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

/** Final step: outro hold + slide down only (no slide-in before unmount). */
export const WALLET_HOME_ONBOARDING_CHECKLIST_COMPLETE_TRANSITION_MS =
  WALLET_HOME_ONBOARDING_CHECKLIST_OUTRO_HOLD_MS +
  WALLET_HOME_ONBOARDING_CHECKLIST_SLIDE_DOWN_OUT_MS;

/** Rive artboard name per post-onboarding step (aligns with `VISIBLE_STEPS` order). */
export const WALLET_HOME_ONBOARDING_CHECKLIST_RIVE_ARTBOARD: Record<
  WalletHomeOnboardingStepHeroKind,
  string
> = {
  fund: '01_Add_Funds',
  trade: '02_First_Trade',
  notifications: '03_Notifications',
};
