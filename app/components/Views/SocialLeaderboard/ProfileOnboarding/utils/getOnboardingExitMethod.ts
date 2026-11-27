import { SocialEvent } from '../../analytics';
import type { SocialDismissMethod } from '../../analytics/socialEvents';

const { DismissMethod } = SocialEvent;

/** The part of a React Navigation action that tells how a screen was left. */
interface RemovingNavigationAction {
  type: string;
  source?: string;
}

/**
 * How the user left Social onboarding without using one of its own buttons.
 * Reads the action React Navigation reports in `beforeRemove`.
 *
 * The native iOS swipe-back gesture dispatches `POP` for the screen. The
 * Android back button and gesture dispatch `GO_BACK` for the container, with
 * no source screen. A `GO_BACK` from the screen itself (the close button,
 * finishing) has a source and is reported by its own handler. Every other
 * action (`NAVIGATE`, `REPLACE`, `RESET`) is the app moving on by itself, not
 * the user dismissing onboarding.
 *
 * @param action - The action that is removing the onboarding screen.
 * @param platformOs - `Platform.OS`, which decides how a `POP` is named.
 * @returns The dismiss method, or `undefined` when the user did not dismiss.
 */
export const getOnboardingExitMethod = (
  action: RemovingNavigationAction,
  platformOs: string,
): SocialDismissMethod | undefined => {
  if (action.type === 'POP') {
    return platformOs === 'ios'
      ? DismissMethod.SWIPE
      : DismissMethod.SYSTEM_BACK;
  }
  if (action.type === 'GO_BACK' && action.source === undefined) {
    return DismissMethod.SYSTEM_BACK;
  }
  return undefined;
};
