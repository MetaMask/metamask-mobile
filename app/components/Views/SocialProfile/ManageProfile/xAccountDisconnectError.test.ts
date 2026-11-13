import {
  ProfileApiErrorCode,
  ProfileServiceError,
} from '@metamask/profile-controller';
import { strings } from '../../../../../locales/i18n';
import {
  X_DISCONNECT_ERROR_MESSAGE_KEYS,
  getXAccountDisconnectError,
} from './xAccountDisconnectError';

const profileApiError = (code: string, httpStatus = 401): ProfileServiceError =>
  new ProfileServiceError(
    httpStatus,
    `ProfileService: failed to disconnect X account: ${httpStatus}`,
    { code },
  );

describe('getXAccountDisconnectError', () => {
  it.each(Object.entries(X_DISCONNECT_ERROR_MESSAGE_KEYS))(
    'names the reason for %s',
    (code, messageKey) => {
      expect(getXAccountDisconnectError(profileApiError(code, 503))).toBe(
        strings(messageKey),
      );
    },
  );

  it('returns null for a code without disconnect copy', () => {
    const error = profileApiError(
      ProfileApiErrorCode.XAccountAlreadyLinked,
      409,
    );

    expect(getXAccountDisconnectError(error)).toBeNull();
  });

  it('returns null for an error without the service envelope', () => {
    expect(getXAccountDisconnectError(new Error('network'))).toBeNull();
  });
});
