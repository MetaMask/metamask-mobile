import { XAuthError, XAuthErrorType } from '../../../../../core/XAuthService';
import { createProfileApiErrorCopy } from '../../../../../util/social/profileApiErrorCopy';
import { X_CONNECT_ERROR_MESSAGE_KEYS } from '../errors/profileApiErrorMessageKeys';

/** The copy for a mapped X connect code, or the generic connect copy. */
const getConnectCopy = createProfileApiErrorCopy({
  copy: X_CONNECT_ERROR_MESSAGE_KEYS,
  fallbackMessageKey: 'social_leaderboard.profile_onboarding.connect_x_error',
});

/**
 * The copy for a failed X connect, or null when the user cancelled and the
 * screen must stay silent.
 */
export const getXConnectError = (
  error: XAuthError | undefined,
): string | null => {
  if (!error || error.type === XAuthErrorType.UserCancelled) {
    return null;
  }

  return getConnectCopy(error);
};
