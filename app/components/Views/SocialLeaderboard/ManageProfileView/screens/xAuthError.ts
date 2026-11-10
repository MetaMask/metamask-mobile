import { findProfileServiceError } from '@metamask/profile-controller';
import { strings } from '../../../../../../locales/i18n';
import { XAuthError, XAuthErrorType } from '../../../../../core/XAuthService';
import { X_CONNECT_ERROR_MESSAGE_KEYS } from '../errors/profileApiErrorMessageKeys';

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

  const code = findProfileServiceError(error)?.code;
  const messageKey = code ? X_CONNECT_ERROR_MESSAGE_KEYS[code] : undefined;

  return strings(
    messageKey ?? 'social_leaderboard.profile_onboarding.connect_x_error',
  );
};
