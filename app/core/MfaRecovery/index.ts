/**
 * Mobile MFA recovery adapters.
 *
 * Exposes the Seedless Google/Apple/Telegram OIDC `identifierAuthProvider` for
 * `@metamask/mfa-recovery-controller` (core preview with seedless auth data).
 * Prefer `getSeedlessOidcIdentifierAuthProvider` from the Seedless wallet-init
 * options module as the first consumer path. Password unlock uses
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
  Identifier,
  KeyBoundIdentifierLogin,
  KeyBoundIdentifierToken,
  RecoveryIdentifierAuthProvider,
  SeedlessAuthData,
} from './types';
