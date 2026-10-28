import { strings } from '../../../../../../locales/i18n';
import {
  isUneditedXUsername,
  MIN_USERNAME_LENGTH,
  type ProfileOnboardingDraft,
  type UsernameStatus,
} from '../profileOnboardingDraft';
import { MAX_USERNAME_LENGTH } from '../generateUsername';

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
  if (status === 'tooLong') {
    return strings('social_leaderboard.profile_onboarding.username_too_long', {
      max: MAX_USERNAME_LENGTH,
    });
  }
  if (status === 'invalid') {
    return strings('social_leaderboard.profile_onboarding.username_invalid');
  }
  return null;
};
