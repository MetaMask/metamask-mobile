import type { CubistSessionTokenProvider } from '../cubist-escrow-provider';

/**
 * Builds the Cubist session token source. The registration service accepts
 * the profile JWT, not an MFA approval, so the access token is the bearer
 * token.
 *
 * @param getAuthenticatedProfileId - Resolves the canonical profile ID; use
 * `AuthenticationController:refreshCanonicalProfileId`, since the cached one
 * can be stale after pairing on another device.
 * @param getBearerToken - Returns the profile access token.
 * @returns The Cubist session token provider.
 */
export function createCubistSessionTokenProvider(
  getAuthenticatedProfileId: () => Promise<string>,
  getBearerToken: () => Promise<string>,
): CubistSessionTokenProvider {
  return {
    getAuthenticatedProfileId: async () => await getAuthenticatedProfileId(),
    getAccessToken: async () => await getBearerToken(),
  };
}
