import { ProfileApiErrorCode } from '@metamask/profile-controller';
import {
  SESSION_EXPIRED_COPY,
  SERVER_ERROR_COPY,
  createProfileApiErrorCopy,
} from '../../../../util/social/profileApiErrorCopy';

/**
 * Copy for the X disconnect codes that give the user something specific to do.
 * Every other failure keeps the generic disconnect error, except a server
 * fault, which says the problem is on our side.
 */
export const X_DISCONNECT_ERROR_MESSAGE_KEYS = {
  ...SESSION_EXPIRED_COPY,
  ...SERVER_ERROR_COPY,
  [ProfileApiErrorCode.RateLimitExceeded]:
    'social_leaderboard.manage_profile.rate_limited',
};

/**
 * The copy for a failed X disconnect, or null when the screen should keep the
 * generic disconnect error.
 */
export const getXAccountDisconnectError = createProfileApiErrorCopy({
  copy: X_DISCONNECT_ERROR_MESSAGE_KEYS,
});
