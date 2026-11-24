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
    /** Appended to the issuer base from `MM_API_ENV`, or `MM_PREDICT_A2T_URL` when set. */
    readonly tokenPath: string;
  };
}

/**
 * Bundled authentication profile.
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
    tokenPath: '/api/v2/kalshi/token',
  },
};

const BUNDLED_AUTHENTICATION_PROFILES = {
  [KALSHI_AUTHENTICATION_PROFILE.id]: KALSHI_AUTHENTICATION_PROFILE,
} as const;

export type BundledAuthenticationProfileId =
  keyof typeof BUNDLED_AUTHENTICATION_PROFILES;

/** Profiles shipped with this build. Wallet reset deletes each of their key slots. */
export const listBundledAuthenticationProfiles =
  (): readonly VenueAuthenticationProfile[] =>
    Object.values(BUNDLED_AUTHENTICATION_PROFILES);

/**
 * Remote configuration may select a bundled profile, but cannot supply or
 * override cryptographic instructions.
 */
export const resolveBundledAuthenticationProfile = (
  profileId: string,
): VenueAuthenticationProfile | undefined =>
  BUNDLED_AUTHENTICATION_PROFILES[profileId as BundledAuthenticationProfileId];
