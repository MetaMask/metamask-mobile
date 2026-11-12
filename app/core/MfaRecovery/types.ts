/**
 * Local mirrors of `@metamask/mfa-recovery-controller` identifier-auth /
 * seedless-unlock types. Keep the PR free of the unpublished preview package
 * (CI). Swap to package imports once it is published.
 *
 * Matches Core MFA recovery after #11224 tip (`701acab40`):
 * one provider method (`getKeyBoundIdentifierLogin`); `authenticateIdentifier`
 * returns an `IdentifierSession` that may include `seedlessAuthData`.
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
 * Result of `authenticateIdentifier` / input to `getRecoverySecret`.
 *
 * `seedlessAuthData` is present for seedless social logins. Callers that need
 * it for `SeedlessOnboardingController.authenticate` should drop it before
 * holding the session for a later recovery read.
 *
 * Key-bound credential fields are owned by Core; Mobile only retains the
 * object (or a stripped copy).
 */
export interface IdentifierSession {
  token?: KeyBoundIdentifierToken;
  proofPrivateKey?: Uint8Array;
  requestId?: string;
  ephemeralPrivateKey?: Uint8Array;
  pkE?: Uint8Array;
  seedlessAuthData?: SeedlessAuthData;
  [key: string]: unknown;
}

/**
 * Minimal shape of `MfaRecoveryController.authenticateIdentifier` used by the
 * social password unlock path. Present on Engine only when the preview package
 * is wired locally for testing.
 */
export interface MfaRecoveryControllerLike {
  authenticateIdentifier: (
    identifier: Identifier,
  ) => Promise<IdentifierSession>;
}
