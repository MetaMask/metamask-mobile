import type { SocialOnboardingTrigger } from '../analytics/socialEvents';

/**
 * The gated action that opened Social profile onboarding. Analytics only: it
 * is sent as `onboarding_trigger` and never changes the flow.
 *
 * Kept beside the navigation rather than in route params, so the root route
 * types stay untouched. Every entry into onboarding sets it right before it
 * navigates, so a value is never read for an entry that did not set it. The
 * onboarding view reads it once, when it mounts.
 */
let pendingTrigger: SocialOnboardingTrigger | undefined;

/** Records the trigger for the onboarding screen about to open. */
export const setPendingOnboardingTrigger = (
  trigger: SocialOnboardingTrigger,
): void => {
  pendingTrigger = trigger;
};

/** The trigger recorded for the onboarding screen that is opening. */
export const getPendingOnboardingTrigger = ():
  | SocialOnboardingTrigger
  | undefined => pendingTrigger;
