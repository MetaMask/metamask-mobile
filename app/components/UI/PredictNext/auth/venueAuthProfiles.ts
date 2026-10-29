export interface VenueAuthenticationProfile {
  readonly id: string;
  readonly deviceKey: {
    /**
     * Allowlisted key implementation. Encoding, salt length, and commitment
     * live in that implementation.
     */
    readonly implementation: 'device-p256-salt-v1';
    /**
     * Stable key lifetime identity. Changing the authentication profile id
     * must not rotate a key unless this slot changes too.
     */
    readonly keySlot: string;
  };
  readonly a2t: {
    readonly challengePath: string;
    readonly issuancePath: string;
    readonly proofMessagePrefix: string;
    readonly requestTimeoutMs: number;
    readonly readinessTimeoutMs: number;
    readonly readinessPollMs: number;
    readonly refreshMarginSeconds: number;
    readonly challengeAttempts: number;
  };
}

/**
 * Bundled Kalshi authentication profile.
 *
 * The service consumes this declarative contract. Future remote configuration
 * may select its bundled id, but cannot replace the profile contents.
 */
export const KALSHI_AUTHENTICATION_PROFILE: VenueAuthenticationProfile = {
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
};

const BUNDLED_AUTHENTICATION_PROFILES = {
  [KALSHI_AUTHENTICATION_PROFILE.id]: KALSHI_AUTHENTICATION_PROFILE,
} as const;

export type BundledAuthenticationProfileId =
  keyof typeof BUNDLED_AUTHENTICATION_PROFILES;

/**
 * Remote configuration may select a bundled profile, but cannot supply or
 * override cryptographic instructions.
 */
export const resolveBundledAuthenticationProfile = (
  profileId: string,
): VenueAuthenticationProfile | undefined =>
  BUNDLED_AUTHENTICATION_PROFILES[profileId as BundledAuthenticationProfileId];
