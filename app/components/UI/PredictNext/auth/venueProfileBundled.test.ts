import {
  validateSigningProfile,
  venueProfileSha256,
} from './venueSigningProfiles';
import {
  BUNDLED_POLICY_RAW,
  BUNDLED_V2_RAW,
  BUNDLED_V3_RAW,
} from './venue-profiles/kalshi-demo-signing.raw';

/**
 * These strings are byte copies of mm-config-registry
 * `predict/venue-profiles/kalshi-demo-signing/`. The digests must match the
 * registry files: predict-api compares `profile.sha256` against exactly these
 * bytes, so any drift here is a signing outage, not a cosmetic difference.
 */
describe('bundled venue profile bytes', () => {
  it('pins the policy and both profile digests', () => {
    expect(venueProfileSha256(BUNDLED_POLICY_RAW)).toBe(
      'SbizRXOrEbIOwrjPiz8iQvQvxznOvhOYtgIZvBsxydM',
    );
    expect(venueProfileSha256(BUNDLED_V2_RAW)).toBe(
      'muyb8OdEadJgcfJ3FhOBfQwGufmNprR0t2L-D6YEbbc',
    );
    expect(venueProfileSha256(BUNDLED_V3_RAW)).toBe(
      'SIdWaTHZdPIAQmAhvhmF28N3p6jGHo46kEBLR0L118w',
    );
  });

  it('parses the policy and profile as readable JSON', () => {
    expect(JSON.parse(BUNDLED_POLICY_RAW)).toEqual({
      id: 'kalshi-demo-signing',
      currentVersion: 3,
      revokedVersions: [1],
    });
    expect(validateSigningProfile(JSON.parse(BUNDLED_V2_RAW))).toMatchObject({
      version: 2,
    });
    expect(validateSigningProfile(JSON.parse(BUNDLED_V3_RAW))).toMatchObject({
      version: 3,
    });
  });
});
