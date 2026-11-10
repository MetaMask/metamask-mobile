/**
 * Local mirrors of `@metamask/mfa-recovery-controller` identifier-auth /
 * seedless-unlock types. Keep the PR free of the unpublished preview package
 * (CI). Swap to package imports once it is published.
 *
 * Matches Core MFA recovery after Himanshu’s review on #11224:
 * one provider method (`getKeyBoundIdentifierLogin`); `authenticateIdentifier`
 * returns `{ session, seedlessAuthData? }` with no options flag.
 */

export type SeedlessAuthConnection = 'google' | 'apple' | 'telegram';

export interface Identifier {
  type: string;
  namespace: string;
  value: string;
  verifier?: unknown;
}

export interface KeyBoundIdentifierToken {
  identifier: Identifier;
  /** Raw 32-byte Ed25519 public key. */
  proofPublicKey: Uint8Array;
  requestHash: string;
  providerAssertion: unknown;
}

export interface KeyBoundIdentifierTokenRequest {
  identifier: Identifier;
  proofPublicKey: Uint8Array;
  requestHash: string;
}

export interface SeedlessAuthData {
  idTokens: string[];
  accessToken: string;
  metadataAccessToken: string;
  refreshToken: string;
  /**
   * Optional at the Core type level. Mobile password unlock requires it and
   * checks presence before seedless authenticate.
   */
  revokeToken?: string;
  authConnection: SeedlessAuthConnection;
  authConnectionId: string;
  groupedAuthConnectionId?: string;
  userId: string;
  socialLoginEmail?: string;
}

export interface KeyBoundIdentifierLogin {
  token: KeyBoundIdentifierToken;
  seedlessAuthData?: SeedlessAuthData;
}

/**
 * Single method on Core’s `RecoveryIdentifierAuthProvider`. Reads and writes
 * both call `getKeyBoundIdentifierLogin`; mutation paths use only `token`.
 */
export interface RecoveryIdentifierAuthProvider {
  getKeyBoundIdentifierLogin: (
    params: KeyBoundIdentifierTokenRequest,
  ) => Promise<KeyBoundIdentifierLogin>;
}

/**
 * Ephemeral session for a later `getRecoverySecret`. Shape is owned by Core;
 * Mobile only retains the object.
 */
export type IdentifierSession = object;

/**
 * Result of `MfaRecoveryController.authenticateIdentifier` — `seedlessAuthData`
 * is beside `session`, not on it.
 */
export interface AuthenticateIdentifierResult {
  session: IdentifierSession;
  seedlessAuthData?: SeedlessAuthData;
}

/**
 * Minimal shape of `MfaRecoveryController.authenticateIdentifier` used by the
 * social password unlock path. Present on Engine only when the preview package
 * is wired locally for testing.
 */
export interface MfaRecoveryControllerLike {
  authenticateIdentifier: (
    identifier: Identifier,
  ) => Promise<AuthenticateIdentifierResult>;
}
