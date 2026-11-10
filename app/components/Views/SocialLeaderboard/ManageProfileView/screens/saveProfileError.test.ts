import {
  ProfileApiErrorCode,
  ProfileServiceError,
} from '@metamask/profile-controller';
import { strings } from '../../../../../../locales/i18n';
import { getProfileSaveError } from './saveProfileError';

const BIO_PROHIBITED = strings(
  'social_leaderboard.manage_profile.bio_prohibited',
);
const DISPLAY_NAME_UNAVAILABLE = strings(
  'social_leaderboard.manage_profile.display_name_unavailable',
);

/** The shape `HttpError` from @metamask/controller-utils carries. */
const httpError = (httpStatus: number): Error & { httpStatus: number } =>
  Object.assign(new Error(`failed to update profile: ${httpStatus}`), {
    httpStatus,
  });

const profileApiError = (
  code: string,
  httpStatus = 400,
): ProfileServiceError =>
  new ProfileServiceError(
    httpStatus,
    `failed to update profile: ${httpStatus}: ${code}`,
    { code },
  );

describe('getProfileSaveError', () => {
  it('names the reason when the server refuses a bio', () => {
    expect(getProfileSaveError(httpError(400), 'bio')).toBe(BIO_PROHIBITED);
  });

  it('names the reason when the server refuses a display name', () => {
    expect(getProfileSaveError(httpError(400), 'displayName')).toBe(
      DISPLAY_NAME_UNAVAILABLE,
    );
  });

  it('names the reason from the bio code', () => {
    const error = profileApiError(ProfileApiErrorCode.ProfileBioProhibited);

    expect(getProfileSaveError(error, 'bio')).toBe(BIO_PROHIBITED);
  });

  it('names the reason from the prohibited display-name code', () => {
    const error = profileApiError(
      ProfileApiErrorCode.ProfileDisplayNameProhibited,
    );

    expect(getProfileSaveError(error, 'displayName')).toBe(
      DISPLAY_NAME_UNAVAILABLE,
    );
  });

  it('names the reason from the disallowed display-name code', () => {
    const error = profileApiError(
      ProfileApiErrorCode.ProfileDisplayNameNotAllowed,
    );

    expect(getProfileSaveError(error, 'displayName')).toBe(
      DISPLAY_NAME_UNAVAILABLE,
    );
  });

  it('names a reserved handle as reserved', () => {
    const error = profileApiError(ProfileApiErrorCode.UsernameReserved);

    expect(getProfileSaveError(error, 'handle')).toBe(
      strings('social_leaderboard.manage_profile.username_reserved'),
    );
  });

  it('leaves other 400 codes on the generic save error', () => {
    const error = profileApiError('VALIDATION_FAILED');

    expect(getProfileSaveError(error, 'bio')).toBeNull();
    expect(getProfileSaveError(error, 'displayName')).toBeNull();
  });

  it('does not apply a bio code to the display name', () => {
    const error = profileApiError(ProfileApiErrorCode.ProfileBioProhibited);

    expect(getProfileSaveError(error, 'displayName')).toBeNull();
  });

  it('names an expired session from the auth code', () => {
    const error = profileApiError(ProfileApiErrorCode.AuthTokenExpired);

    expect(getProfileSaveError(error, 'bio')).toBe(
      strings('social_leaderboard.manage_profile.session_expired'),
    );
  });

  it('names a concurrent update from the conflict code', () => {
    const error = profileApiError(ProfileApiErrorCode.ProfileUpdateConflict);

    expect(getProfileSaveError(error, 'displayName')).toBe(
      strings('social_leaderboard.manage_profile.profile_changed'),
    );
  });

  it('stays quiet for a dropped connection', () => {
    expect(
      getProfileSaveError(new Error('Network request failed'), 'bio'),
    ).toBeNull();
    expect(
      getProfileSaveError(new Error('Network request failed'), 'displayName'),
    ).toBeNull();
  });

  it('stays quiet for a server fault', () => {
    expect(getProfileSaveError(httpError(500), 'bio')).toBeNull();
    expect(getProfileSaveError(httpError(503), 'bio')).toBeNull();
    expect(getProfileSaveError(httpError(500), 'displayName')).toBeNull();
  });

  it('stays quiet for a payload that is not an error object', () => {
    expect(getProfileSaveError(undefined, 'bio')).toBeNull();
    expect(getProfileSaveError('400', 'bio')).toBeNull();
    expect(getProfileSaveError(null, 'bio')).toBeNull();
  });

  // The handle's rules already have copy, and the availability check runs
  // before the save, so a 400 there adds nothing.
  it('leaves the handle to its availability check', () => {
    expect(getProfileSaveError(httpError(400), 'handle')).toBeNull();
  });

  it('leaves unsupervised fields on the generic save error', () => {
    expect(getProfileSaveError(httpError(400), 'socials')).toBeNull();
  });
});
