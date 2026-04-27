import { ONBOARDING_SUCCESS_FLOW } from '../../constants/onboarding';

/**
 * Returns whether completing the onboarding success screen should mark the user as
 * eligible for the wallet home post-onboarding steps flow.
 *
 * Excludes backup flows launched from settings or reminder flows where the user
 * already had an active wallet — those must not look like a first-time onboarding
 * completion (e.g. avoids showing the steps when an existing user finishes a
 * settings backup on an empty account).
 *
 * `undefined` is treated as ineligible so new call sites cannot accidentally opt in
 * by omitting `successFlow`. Pass an explicit {@link ONBOARDING_SUCCESS_FLOW} from
 * the screen (see {@link OnboardingSuccess} route defaults and ManualBackupStep3).
 */
export function shouldMarkWalletHomeOnboardingStepsEligible(
  successFlow: ONBOARDING_SUCCESS_FLOW | undefined,
): boolean {
  if (successFlow === undefined) {
    return false;
  }

  return (
    successFlow === ONBOARDING_SUCCESS_FLOW.BACKED_UP_SRP ||
    successFlow === ONBOARDING_SUCCESS_FLOW.NO_BACKED_UP_SRP ||
    successFlow === ONBOARDING_SUCCESS_FLOW.IMPORT_FROM_SEED_PHRASE
  );
}
