/**
 * Re-export MFA recovery identifier-auth types from the published controller
 * package (core preview with seedless auth data on authenticateIdentifier).
 */
export type {
  Identifier,
  KeyBoundIdentifierLogin,
  KeyBoundIdentifierToken,
  KeyBoundIdentifierTokenRequest,
  RecoveryIdentifierAuthProvider,
  SeedlessAuthData,
  SeedlessAuthConnection,
  SeedlessIdentifierSession,
} from '@metamask/mfa-recovery-controller';
