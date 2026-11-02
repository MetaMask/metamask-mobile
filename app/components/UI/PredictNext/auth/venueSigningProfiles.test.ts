import fixture from '../contracts/v1/fixtures/kalshi-signing-v1.json';
import { KALSHI_AUTHENTICATION_PROFILE } from './venueAuthProfiles';
import {
  coveredComponents,
  KALSHI_DEMO_SIGNING_PROFILE,
  resolveBundledSigningProfile,
} from './venueSigningProfiles';

describe('venueSigningProfiles', () => {
  it('pins the same operations predict-api builds from', () => {
    expect(KALSHI_DEMO_SIGNING_PROFILE.operations).toEqual(fixture.operations);
  });

  it('covers the components predict-api verifies', () => {
    expect(coveredComponents(KALSHI_DEMO_SIGNING_PROFILE, 'GET')).toEqual(
      fixture.readComponents,
    );
    expect(coveredComponents(KALSHI_DEMO_SIGNING_PROFILE, 'POST')).toEqual(
      fixture.mutationComponents,
    );
  });

  it('resolves the Kalshi signing profile from the authentication profile', () => {
    expect(resolveBundledSigningProfile(KALSHI_AUTHENTICATION_PROFILE.id)).toBe(
      KALSHI_DEMO_SIGNING_PROFILE,
    );
    expect(resolveBundledSigningProfile('unknown')).toBeUndefined();
  });
});
