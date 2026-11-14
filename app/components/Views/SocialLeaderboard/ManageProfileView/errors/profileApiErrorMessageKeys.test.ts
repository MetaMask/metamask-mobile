import {
  ProfileApiErrorCode,
  ProfileServiceError,
} from '@metamask/profile-controller';
import { strings } from '../../../../../../locales/i18n';
import { MAX_USERNAME_LENGTH } from '../../ProfileOnboarding/generateUsername';
import { MIN_USERNAME_LENGTH } from '../../ProfileOnboarding/profileOnboardingDraft';
import {
  PROFILE_CREATE_ERROR_MESSAGE_KEYS,
  PROFILE_SAVE_ERROR_MESSAGE_KEYS,
  getProfileCreateErrorCopy,
  getProfileSaveErrorCopy,
} from './profileApiErrorMessageKeys';

const profileApiError = (code: string, httpStatus = 403): ProfileServiceError =>
  new ProfileServiceError(
    httpStatus,
    `ProfileService: failed to update profile: ${httpStatus}`,
    { code },
  );

/** The only copy that states a number, keyed by the code that states it. */
const COPY_PARAMS: Partial<Record<string, Record<string, number>>> = {
  [ProfileApiErrorCode.UsernameTooShort]: { min: MIN_USERNAME_LENGTH },
  [ProfileApiErrorCode.UsernameTooLong]: { max: MAX_USERNAME_LENGTH },
};

describe('getProfileSaveErrorCopy', () => {
  it.each(Object.entries(PROFILE_SAVE_ERROR_MESSAGE_KEYS))(
    'names the reason for %s',
    (code, messageKey) => {
      expect(getProfileSaveErrorCopy(profileApiError(code))).toBe(
        strings(messageKey, COPY_PARAMS[code]),
      );
    },
  );

  it('returns null for a code without save copy', () => {
    const error = profileApiError(
      ProfileApiErrorCode.AuthVerificationUnavailable,
      401,
    );

    expect(getProfileSaveErrorCopy(error)).toBeNull();
  });

  it('returns null for an error without the service envelope', () => {
    expect(getProfileSaveErrorCopy(new Error('network'))).toBeNull();
  });
});

describe('getProfileCreateErrorCopy', () => {
  it.each(Object.entries(PROFILE_CREATE_ERROR_MESSAGE_KEYS))(
    'names the reason for %s',
    (code, messageKey) => {
      expect(getProfileCreateErrorCopy(profileApiError(code))).toBe(
        strings(messageKey, COPY_PARAMS[code]),
      );
    },
  );

  it('returns null for a code without create copy', () => {
    const error = profileApiError(
      ProfileApiErrorCode.AuthVerificationUnavailable,
      401,
    );

    expect(getProfileCreateErrorCopy(error)).toBeNull();
  });

  it('returns null for an error without the service envelope', () => {
    expect(getProfileCreateErrorCopy(new Error('network'))).toBeNull();
  });
});
