import fixture from '../contracts/v1/fixtures/venue-signing-v2.json';
import { KALSHI_AUTHENTICATION_PROFILE } from './venueAuthProfiles';
import {
  coveredComponents,
  KALSHI_DEMO_SIGNING_PROFILE,
  resolveBundledSigningProfile,
} from './venueSigningProfiles';

describe('venueSigningProfiles', () => {
  it('is the profile document predict-api renders from', () => {
    expect(JSON.parse(JSON.stringify(KALSHI_DEMO_SIGNING_PROFILE))).toEqual(
      fixture.profile,
    );
  });

  it('covers the components predict-api verifies', () => {
    expect(coveredComponents(KALSHI_DEMO_SIGNING_PROFILE, 'GET')).toEqual(
      fixture.readComponents,
    );
    expect(coveredComponents(KALSHI_DEMO_SIGNING_PROFILE, 'POST')).toEqual(
      fixture.mutationComponents,
    );
  });

  it('keeps the envelope bound within what predict-api accepts', () => {
    expect(
      KALSHI_DEMO_SIGNING_PROFILE.implementation.params.maxSignatures,
    ).toBeLessThanOrEqual(8);
  });

  it('resolves the Kalshi signing profile from the authentication profile', () => {
    expect(resolveBundledSigningProfile(KALSHI_AUTHENTICATION_PROFILE.id)).toBe(
      KALSHI_DEMO_SIGNING_PROFILE,
    );
    expect(resolveBundledSigningProfile('unknown')).toBeUndefined();
  });
});
