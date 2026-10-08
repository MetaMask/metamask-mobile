/**
 * Mirrors the identifier-auth types from `@metamask/mfa-recovery-controller`
 * (MetaMask/core#10022). Replace with the package imports once it is published.
 */

export interface Identifier {
  type: string;
  namespace: string;
  value: string;
  verifier: unknown;
}

export interface KeyBoundIdentifierToken {
  identifier: Identifier;
  proofPublicKey: string;
  requestHash: string;
  providerAssertion: unknown;
}

export interface RecoveryIdentifierAuthProvider {
  getKeyBoundIdentifierToken: (params: {
    identifier: Identifier;
    proofPublicKey: string;
    requestHash: string;
  }) => Promise<KeyBoundIdentifierToken>;
}
