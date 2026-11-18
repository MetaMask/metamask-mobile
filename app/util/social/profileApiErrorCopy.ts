import {
  findProfileServiceError,
  ProfileApiErrorCode,
  type ProfileApiErrorCodeId,
} from '@metamask/profile-controller';
import { strings } from '../../../locales/i18n';

/**
 * Builds the "code to user-facing copy" helpers the Social surfaces share.
 *
 * Each surface only needs to say which copy its own codes get; the envelope
 * walk, the interpolation params, and the generic fallback live here once.
 */

/** The copy for a Profile API code, keyed by the code. */
export type ProfileApiErrorCopy = Partial<
  Record<ProfileApiErrorCodeId, string>
>;

/** Values for `{{placeholder}}` in a code's copy, keyed by the code. */
export type ProfileApiErrorCopyParams = Partial<
  Record<ProfileApiErrorCodeId, Record<string, number>>
>;

export interface ProfileApiErrorCopyConfig {
  /** The codes this surface gives specific copy to. */
  copy: ProfileApiErrorCopy;
  /** Placeholder values for copy that states a number. */
  paramsByCode?: ProfileApiErrorCopyParams;
  /**
   * Copy for a code this surface does not map. Left out, an unmapped code
   * returns null and the caller keeps its own error.
   */
  fallbackMessageKey?: string;
}

/** Every entry in `codes` gets the same copy. */
const sameCopy = (
  codes: readonly ProfileApiErrorCodeId[],
  messageKey: string,
): ProfileApiErrorCopy =>
  Object.fromEntries(
    codes.map((code) => [code, messageKey]),
  ) as ProfileApiErrorCopy;

/**
 * The four auth-token refusals all mean the same thing to the user: the
 * session is no longer good, so signing back in is the only next step.
 */
export const SESSION_EXPIRED_COPY = sameCopy(
  [
    ProfileApiErrorCode.AuthTokenMissing,
    ProfileApiErrorCode.AuthTokenInvalid,
    ProfileApiErrorCode.AuthTokenExpired,
    ProfileApiErrorCode.AuthTokenSubjectMissing,
  ],
  'social_leaderboard.manage_profile.session_expired',
);

/** Every upstream fault means the problem is on our side, not the user's. */
export const SERVER_ERROR_COPY = sameCopy(
  [
    ProfileApiErrorCode.NotImplemented,
    ProfileApiErrorCode.BadGateway,
    ProfileApiErrorCode.ServiceUnavailable,
    ProfileApiErrorCode.GatewayTimeout,
    ProfileApiErrorCode.RequestTimeout,
    ProfileApiErrorCode.InternalError,
  ],
  'social_leaderboard.manage_profile.server_error',
);

/**
 * Turns a surface's copy config into a resolver over a Profile API error.
 *
 * @param config - The copy this surface gives its codes.
 * @returns The copy for the error, or the fallback when it is unmapped.
 */
export const createProfileApiErrorCopy =
  ({ copy, paramsByCode, fallbackMessageKey }: ProfileApiErrorCopyConfig) =>
  (error: unknown): string | null => {
    const code = findProfileServiceError(error)?.code as
      | ProfileApiErrorCodeId
      | undefined;
    const messageKey = code ? copy[code] : undefined;

    if (!messageKey) {
      return fallbackMessageKey ? strings(fallbackMessageKey) : null;
    }

    return strings(messageKey, code ? paramsByCode?.[code] : undefined);
  };
