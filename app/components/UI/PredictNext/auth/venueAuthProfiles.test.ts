import {
  KALSHI_AUTHENTICATION_PROFILE,
  resolveBundledAuthenticationProfile,
} from './venueAuthProfiles';

describe('KALSHI_AUTHENTICATION_PROFILE', () => {
  it('defines the bundled P-256 and A2T contract', () => {
    expect(KALSHI_AUTHENTICATION_PROFILE).toEqual({
      id: 'kalshi-a2t-v1',
      deviceKey: {
        implementation: 'device-p256-salt-v1',
        keySlot: 'kalshi-v1',
      },
      a2t: {
        challengePath: '/venues/kalshi/a2t/challenge',
        issuancePath: '/venues/kalshi/a2t',
        proofMessagePrefix: 'kalshi-a2t-request-v1',
        requestTimeoutMs: 15_000,
        readinessTimeoutMs: 15_000,
        readinessPollMs: 200,
        refreshMarginSeconds: 60,
        challengeAttempts: 2,
      },
    });
  });

  it('allows configuration to select only a bundled profile', () => {
    expect(resolveBundledAuthenticationProfile('kalshi-a2t-v1')).toBe(
      KALSHI_AUTHENTICATION_PROFILE,
    );
    expect(
      resolveBundledAuthenticationProfile('server-defined-profile'),
    ).toBeUndefined();
  });
});
