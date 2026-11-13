import {
  ProfileApiErrorCode,
  ProfileServiceError,
} from '@metamask/profile-controller';
import { strings } from '../../../../../../locales/i18n';
import { XAuthError, XAuthErrorType } from '../../../../../core/XAuthService';
import { getXConnectError } from './xAuthError';

const profileApiError = (code: string): ProfileServiceError =>
  new ProfileServiceError(
    409,
    'ProfileService: failed to connect X account: 409',
    { code },
  );

describe('getXConnectError', () => {
  it('stays silent when the user cancels', () => {
    const error = new XAuthError(XAuthErrorType.UserCancelled, 'cancelled');

    const result = getXConnectError(error);

    expect(result).toBeNull();
  });

  it('stays silent when there is no error', () => {
    expect(getXConnectError(undefined)).toBeNull();
  });

  it('falls back to the generic copy for an unknown failure', () => {
    const error = new XAuthError(XAuthErrorType.BackendError, 'boom');

    const result = getXConnectError(error);

    expect(result).toBe(
      strings('social_leaderboard.profile_onboarding.connect_x_error'),
    );
  });

  it('names the reason when the X account is already linked', () => {
    const error = new XAuthError(XAuthErrorType.BackendError, 'boom', {
      cause: profileApiError(ProfileApiErrorCode.XAccountAlreadyLinked),
    });

    const result = getXConnectError(error);

    expect(result).toBe(
      strings('social_leaderboard.manage_profile.x_account_already_linked'),
    );
  });

  it('names the reason when the link conflicts', () => {
    const error = new XAuthError(XAuthErrorType.BackendError, 'boom', {
      cause: profileApiError(ProfileApiErrorCode.Conflict),
    });

    const result = getXConnectError(error);

    expect(result).toBe(
      strings('social_leaderboard.manage_profile.x_account_link_conflict'),
    );
  });

  it('names the reason when the profile is already linked to another X account', () => {
    const error = new XAuthError(XAuthErrorType.BackendError, 'boom', {
      cause: profileApiError(ProfileApiErrorCode.XProfileAlreadyLinked),
    });

    const result = getXConnectError(error);

    expect(result).toBe(
      strings('social_leaderboard.manage_profile.x_profile_already_linked'),
    );
  });

  it('names the reason when access is denied', () => {
    const error = new XAuthError(XAuthErrorType.BackendError, 'boom', {
      cause: profileApiError(ProfileApiErrorCode.XOAuthAccessDenied),
    });

    const result = getXConnectError(error);

    expect(result).toBe(
      strings('social_leaderboard.manage_profile.connect_x_retry'),
    );
  });

  it('names the reason when the X connection expired', () => {
    const error = new XAuthError(XAuthErrorType.BackendError, 'boom', {
      cause: profileApiError(ProfileApiErrorCode.XOAuthStateInvalid),
    });

    const result = getXConnectError(error);

    expect(result).toBe(
      strings('social_leaderboard.manage_profile.x_connection_expired'),
    );
  });

  it('names the reason when the backend faults', () => {
    const error = new XAuthError(XAuthErrorType.BackendError, 'boom', {
      cause: profileApiError(ProfileApiErrorCode.InternalError),
    });

    const result = getXConnectError(error);

    expect(result).toBe(
      strings('social_leaderboard.manage_profile.server_error'),
    );
  });

  it('names the reason when the session expired', () => {
    const error = new XAuthError(XAuthErrorType.BackendError, 'boom', {
      cause: profileApiError(ProfileApiErrorCode.AuthTokenExpired),
    });

    const result = getXConnectError(error);

    expect(result).toBe(
      strings('social_leaderboard.manage_profile.session_expired'),
    );
  });

  it('names the reason when early access is required', () => {
    const error = new XAuthError(XAuthErrorType.BackendError, 'boom', {
      cause: profileApiError(ProfileApiErrorCode.AuthEarlyAccessRequired),
    });

    const result = getXConnectError(error);

    expect(result).toBe(
      strings('social_leaderboard.manage_profile.social_profiles_unavailable'),
    );
  });

  it('names the reason when the profile access is denied', () => {
    const error = new XAuthError(XAuthErrorType.BackendError, 'boom', {
      cause: profileApiError(ProfileApiErrorCode.AuthProfileAccessDenied),
    });

    const result = getXConnectError(error);

    expect(result).toBe(
      strings('social_leaderboard.manage_profile.connect_x_retry'),
    );
  });
});
