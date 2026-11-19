import { ProfileServiceError } from '@metamask/profile-controller';
import { strings } from '../../../../../../locales/i18n';
import { XAuthError, XAuthErrorType } from '../../../../../core/XAuthService';
import { X_CONNECT_ERROR_MESSAGE_KEYS } from '../errors/profileApiErrorMessageKeys';
import { getXConnectError } from './xAuthError';

const profileApiError = (code: string): ProfileServiceError =>
  new ProfileServiceError(
    409,
    'ProfileService: failed to connect X account: 409',
    { code },
  );

/** A backend failure carrying the Profile API error as its cause. */
const connectError = (code: string): XAuthError =>
  new XAuthError(XAuthErrorType.BackendError, 'boom', {
    cause: profileApiError(code),
  });

describe('getXConnectError', () => {
  it('stays silent when the user cancels', () => {
    const error = new XAuthError(XAuthErrorType.UserCancelled, 'cancelled');

    expect(getXConnectError(error)).toBeNull();
  });

  it('stays silent when there is no error', () => {
    expect(getXConnectError(undefined)).toBeNull();
  });

  it('falls back to the generic copy for an unknown failure', () => {
    const error = new XAuthError(XAuthErrorType.BackendError, 'boom');

    expect(getXConnectError(error)).toBe(
      strings('social_leaderboard.profile_onboarding.connect_x_error'),
    );
  });

  it.each(Object.entries(X_CONNECT_ERROR_MESSAGE_KEYS))(
    'names the reason for %s',
    (code, messageKey) => {
      expect(getXConnectError(connectError(code))).toBe(strings(messageKey));
    },
  );
});
