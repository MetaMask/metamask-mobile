import {
  validateSigningProfile,
  venueProfileSha256,
} from './venueSigningProfiles';
import {
  BUNDLED_V1_RAW,
  BUNDLED_REVOKED_RAW,
} from './venue-profiles/kalshi-demo-signing.raw';

/**
 * These strings are byte copies of mm-config-registry
 * `predict/venue-profiles/kalshi-demo-signing/`. The digests must match the
 * registry files: predict-api compares `profile.sha256` against exactly these
 * bytes, so any drift here is a signing outage, not a cosmetic difference.
 */
describe('bundled venue profile bytes', () => {
  it('pins the profile and revocation digests', () => {
    expect(venueProfileSha256(BUNDLED_V1_RAW)).toBe(
      'aCy-mcVXsZiOK5q4dei4zgDi3j3asmeGF206uKL6D9A',
    );
    expect(venueProfileSha256(BUNDLED_REVOKED_RAW)).toBe(
      '4EweD2YzjdLeiNZKXkRRvUiMNdkJZNVzQFRdBEiQHrs',
    );
  });

  it('parses the revocations and profile as readable JSON', () => {
    expect(JSON.parse(BUNDLED_REVOKED_RAW)).toEqual({
      id: 'kalshi-demo-signing',
      revokedVersions: [],
    });
    expect(validateSigningProfile(JSON.parse(BUNDLED_V1_RAW))).toMatchObject({
      version: 1,
    });
  });
});
