import { strings } from '../../../../../../locales/i18n';
import {
  isUneditedXUsername,
  MIN_USERNAME_LENGTH,
  type ProfileOnboardingDraft,
  type UsernameStatus,
} from '../profileOnboardingDraft';

const STRING_PREFIX = 'social_leaderboard.profile_onboarding';

/** Client-side username rule message; `null` lets a server verdict speak. */
export const getUsernameLocalError = (
  draft: ProfileOnboardingDraft,
  status: UsernameStatus,
): string | null => {
  if (isUneditedXUsername(draft)) {
    return null;
  }
  if (status === 'tooShort') {
    return strings(`${STRING_PREFIX}.username_too_short`, {
      min: MIN_USERNAME_LENGTH,
    });
  }
  if (status === 'invalid') {
    return strings(`${STRING_PREFIX}.username_invalid`);
  }
  return null;
};
