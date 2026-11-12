import { strings } from '../../../../../../locales/i18n';
import { getProfileSaveError } from './saveProfileError';

const BIO_PROHIBITED = strings(
  'social_leaderboard.manage_profile.bio_prohibited',
);
const DISPLAY_NAME_INVALID = strings(
  'social_leaderboard.profile_onboarding.display_name_invalid',
);

/** The shape `HttpError` from @metamask/controller-utils carries. */
const httpError = (httpStatus: number): Error & { httpStatus: number } =>
  Object.assign(new Error(`failed to update profile: ${httpStatus}`), {
    httpStatus,
  });

describe('getProfileSaveError', () => {
  it('names the reason when the server refuses a bio', () => {
    expect(getProfileSaveError(httpError(400), 'bio')).toBe(BIO_PROHIBITED);
  });

  it('names the reason when the server refuses a display name', () => {
    expect(getProfileSaveError(httpError(400), 'displayName')).toBe(
      DISPLAY_NAME_INVALID,
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
