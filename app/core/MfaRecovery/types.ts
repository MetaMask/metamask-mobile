/**
 * Local mirrors of `@metamask/mfa-recovery-controller` identifier-auth /
 * seedless-unlock types. Keep the PR free of the unpublished preview package
 * (CI). Swap to package imports once it is published.
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

export interface RecoveryIdentifierAuthProvider {
  getKeyBoundIdentifierToken: (
    params: KeyBoundIdentifierTokenRequest,
  ) => Promise<KeyBoundIdentifierToken>;
  getKeyBoundIdentifierLogin?: (
    params: KeyBoundIdentifierTokenRequest,
  ) => Promise<KeyBoundIdentifierLogin>;
}

/**
 * Minimal shape of `MfaRecoveryController.authenticateIdentifier` used by the
 * left-hand password unlock path. Present on Engine only when the preview
 * package is wired locally for testing.
 */
export interface MfaRecoveryAuthenticateIdentifierSession {
  seedlessAuthData?: SeedlessAuthData;
}

export interface MfaRecoveryControllerLike {
  authenticateIdentifier: (
    identifier: Identifier,
    options?: { requireSeedlessAuthData?: boolean },
  ) => Promise<MfaRecoveryAuthenticateIdentifierSession>;
}
