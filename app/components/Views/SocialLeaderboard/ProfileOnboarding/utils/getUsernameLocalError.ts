import { strings } from '../../../../../../locales/i18n';
import {
  isUneditedXUsername,
  MIN_USERNAME_LENGTH,
  type ProfileOnboardingDraft,
  type UsernameStatus,
} from '../profileOnboardingDraft';

export const getUsernameLocalError = (
  draft: ProfileOnboardingDraft,
  status: UsernameStatus,
): string | null => {
  if (isUneditedXUsername(draft)) {
    return null;
  }
  if (status === 'tooShort') {
    return strings('social_leaderboard.profile_onboarding.username_too_short', {
      min: MIN_USERNAME_LENGTH,
    });
  }
  if (status === 'invalid') {
    return strings('social_leaderboard.profile_onboarding.username_invalid');
  }
  return null;
};
