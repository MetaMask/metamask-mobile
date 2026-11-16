import type { FieldValidityResponse } from '@metamask/profile-controller';
import { strings } from '../../../../../../locales/i18n';
import { MAX_DISPLAY_NAME_LENGTH } from '../profileOnboardingDraft';

type CheckDisplayNameValidity = (
  displayName: string,
) => Promise<FieldValidityResponse>;

/**
 * Copy for a display name the profile API will not store, or null when it
 * passes. The name is trimmed before the length rule and the API call.
 * Callers that can outlive a keystroke must ignore the result when a newer
 * check has started.
 */
export const getDisplayNameError = async (
  displayName: string,
  checkDisplayNameValidity: CheckDisplayNameValidity,
): Promise<string | null> => {
  const trimmed = displayName.trim();
  if (trimmed.length > MAX_DISPLAY_NAME_LENGTH) {
    return strings('social_leaderboard.errors.display_name_too_long', {
      max: MAX_DISPLAY_NAME_LENGTH,
    });
  }

  try {
    const validity = await checkDisplayNameValidity(trimmed);
    if (!validity.valid) {
      return strings('social_leaderboard.errors.display_name_invalid');
    }
    return null;
  } catch {
    return strings('social_leaderboard.errors.display_name_check_error');
  }
};
