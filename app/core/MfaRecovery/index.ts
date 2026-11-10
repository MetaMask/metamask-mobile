/**
 * Mobile MFA recovery adapters for the social unlock path.
 *
 * OIDC `identifierAuthProvider` (Google / Apple / Telegram) for
 * `@metamask/mfa-recovery-controller`, plus
 * {@link authenticateSeedlessViaMfaIdentifier} when Money MFA is enabled.
 */

export {
  AUTH_CONNECTION_OIDC_ISSUERS,
  computeKeyBoundNonce,
  createOidcIdentifierAuthProvider,
  loginWithNonceAndSeedlessAuthViaHandlers,
  loginWithNonceViaHandlers,
  OIDC_ISSUERS,
} from './identifierAuthProvider';
export type {
  LoginWithNonce,
  LoginWithNonceAndSeedlessAuth,
  OidcIdentifierAuthProviderOptions,
} from './identifierAuthProvider';

export { createMoneyMfaOidcIdentifierAuthProvider } from './createMoneyMfaOidcIdentifierAuthProvider';
export type { CreateMoneyMfaOidcIdentifierAuthProviderOptions } from './createMoneyMfaOidcIdentifierAuthProvider';

export {
  authenticateSeedlessViaMfaIdentifier,
  buildOidcIdentifier,
} from './seedlessPasswordUnlockViaMfa';
export type {
  AuthenticateSeedlessViaMfaIdentifierOptions,
  SeedlessPasswordUnlockResult,
} from './seedlessPasswordUnlockViaMfa';

export type {
  AuthenticateIdentifierResult,
  Identifier,
  IdentifierSession,
  KeyBoundIdentifierLogin,
  KeyBoundIdentifierToken,
  MfaRecoveryControllerLike,
  RecoveryIdentifierAuthProvider,
  SeedlessAuthData,
} from './types';
