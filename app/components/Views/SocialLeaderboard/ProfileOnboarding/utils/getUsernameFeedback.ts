import { strings } from '../../../../../../locales/i18n';
import type { UsernameStatus } from '../profileOnboardingDraft';

const STRING_PREFIX = 'social_leaderboard.profile_onboarding';

export type UsernameFeedbackTone = 'error' | 'success';

export interface UsernameFeedback {
  message: string;
  tone: UsernameFeedbackTone;
}

/** The one line under the username field: local error, claim error, or available. */
export const getUsernameFeedback = ({
  localError,
  claimError,
  status,
}: {
  localError: string | null;
  claimError: string | null;
  status: UsernameStatus;
}): UsernameFeedback | null => {
  if (localError) {
    return { message: localError, tone: 'error' };
  }
  if (claimError) {
    return { message: claimError, tone: 'error' };
  }
  if (status === 'available') {
    return {
      message: strings(`${STRING_PREFIX}.username_available`),
      tone: 'success',
    };
  }
  return null;
};
