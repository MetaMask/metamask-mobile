import {
  findProfileServiceError,
  ProfileApiErrorCode,
} from '@metamask/profile-controller';
import { strings } from '../../../../../locales/i18n';

/**
 * Copy for the X disconnect codes that give the user something specific to do.
 * Every other failure keeps the generic disconnect error, except a server
 * fault, which says the problem is on our side.
 */
export const X_DISCONNECT_ERROR_MESSAGE_KEYS: Partial<Record<string, string>> =
  {
    [ProfileApiErrorCode.AuthTokenMissing]:
      'social_leaderboard.manage_profile.session_expired',
    [ProfileApiErrorCode.AuthTokenInvalid]:
      'social_leaderboard.manage_profile.session_expired',
    [ProfileApiErrorCode.AuthTokenExpired]:
      'social_leaderboard.manage_profile.session_expired',
    [ProfileApiErrorCode.AuthTokenSubjectMissing]:
      'social_leaderboard.manage_profile.session_expired',
    [ProfileApiErrorCode.RateLimitExceeded]:
      'social_leaderboard.manage_profile.rate_limited',
    [ProfileApiErrorCode.NotImplemented]:
      'social_leaderboard.manage_profile.server_error',
    [ProfileApiErrorCode.BadGateway]:
      'social_leaderboard.manage_profile.server_error',
    [ProfileApiErrorCode.ServiceUnavailable]:
      'social_leaderboard.manage_profile.server_error',
    [ProfileApiErrorCode.GatewayTimeout]:
      'social_leaderboard.manage_profile.server_error',
    [ProfileApiErrorCode.RequestTimeout]:
      'social_leaderboard.manage_profile.server_error',
    [ProfileApiErrorCode.InternalError]:
      'social_leaderboard.manage_profile.server_error',
  };

/**
 * The copy for a failed X disconnect, or null when the screen should keep the
 * generic disconnect error.
 */
export const getXAccountDisconnectError = (error: unknown): string | null => {
  const code = findProfileServiceError(error)?.code;
  const messageKey = code ? X_DISCONNECT_ERROR_MESSAGE_KEYS[code] : undefined;

  return messageKey ? strings(messageKey) : null;
};
