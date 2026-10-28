import { strings } from '../../../../../../locales/i18n';
import type { UsernameStatus } from '../profileOnboardingDraft';

export type UsernameFeedbackTone = 'error' | 'success';

export interface UsernameFeedback {
  message: string;
  tone: UsernameFeedbackTone;
}

export const getUsernameFeedback = ({
  localError,
  claimError,
  status,
  showAvailable,
}: {
  localError: string | null;
  claimError: string | null;
  status: UsernameStatus;
  /**
   * False when no verdict exists for the handle. An unedited X handle skips
   * both the local rules and the server check, so a pattern-valid value is not
   * a claim and must not be announced as available.
   */
  showAvailable: boolean;
}): UsernameFeedback | null => {
  if (localError) {
    return { message: localError, tone: 'error' };
  }
  if (claimError) {
    return { message: claimError, tone: 'error' };
  }
  if (showAvailable && status === 'available') {
    return {
      message: strings(
        'social_leaderboard.profile_onboarding.username_available',
      ),
      tone: 'success',
    };
  }
  return null;
};
