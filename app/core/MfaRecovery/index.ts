/**
 * Mobile MFA recovery adapters.
 *
 * Exposes the Seedless Google/Apple OIDC `identifierAuthProvider` for
 * `@metamask/mfa-recovery-controller` (MetaMask/core#10022, MFA-703).
 * Prefer `getSeedlessOidcIdentifierAuthProvider` from the Seedless wallet-init
 * options module as the first consumer path. Full Engine
 * `MfaRecoveryController` init (AuthToken, Cubist escrow) is deferred.
 */

export {
  computeKeyBoundNonce,
  createOidcIdentifierAuthProvider,
  loginWithNonceViaHandlers,
  OIDC_ISSUERS,
} from './identifierAuthProvider';
export type {
  LoginWithNonce,
  OidcIdentifierAuthProviderOptions,
} from './identifierAuthProvider';

export { createMoneyMfaOidcIdentifierAuthProvider } from './createMoneyMfaOidcIdentifierAuthProvider';
export type { CreateMoneyMfaOidcIdentifierAuthProviderOptions } from './createMoneyMfaOidcIdentifierAuthProvider';

export type {
  Identifier,
  KeyBoundIdentifierToken,
  RecoveryIdentifierAuthProvider,
} from './types';
