import type { CubistSessionTokenProvider } from '../cubist-escrow-provider';

/** The parts of an Auth social login exchange the Cubist session needs. */
export interface SocialProfileSession {
  token: { accessToken: string; expiresIn: number; obtainedAt: number };
  profile: { canonicalProfileId: string };
}

export interface SessionTokenProviderOptions {
  isUnlocked: () => boolean;
  /** Unlocked wallets: the SRP profile's canonical ID. */
  refreshCanonicalProfileId: () => Promise<string>;
  /** Unlocked wallets: the SRP profile's access token. */
  getBearerToken: () => Promise<string>;
  /** Locked wallets: exchanges the seedless social token for a profile session. */
  exchangeSocialAccessToken: () => Promise<SocialProfileSession>;
  now?: () => number;
}

/** Refresh the exchanged session this long before it expires. */
const EXPIRY_SKEW_MS = 60_000;

/**
 * Builds the Cubist session token source. The registration service accepts
 * the profile JWT. An unlocked wallet gets it from the SRP sign-in; a locked
 * wallet cannot sign, so it exchanges the seedless social login instead and
 * reuses that session until it is about to expire.
 */
export function createCubistSessionTokenProvider({
  isUnlocked,
  refreshCanonicalProfileId,
  getBearerToken,
  exchangeSocialAccessToken,
  now = Date.now,
}: SessionTokenProviderOptions): CubistSessionTokenProvider {
  let cached: SocialProfileSession | undefined;

  const getSocialSession = async (): Promise<SocialProfileSession> => {
    if (
      cached &&
      cached.token.obtainedAt + cached.token.expiresIn * 1000 - EXPIRY_SKEW_MS >
        now()
    ) {
      return cached;
    }
    cached = await exchangeSocialAccessToken();
    return cached;
  };

  return {
    getAuthenticatedProfileId: async () => {
      if (isUnlocked()) {
        cached = undefined;
        return await refreshCanonicalProfileId();
      }
      return (await getSocialSession()).profile.canonicalProfileId;
    },
    getAccessToken: async () => {
      if (isUnlocked()) {
        return await getBearerToken();
      }
      return (await getSocialSession()).token.accessToken;
    },
  };
}
