/**
 * Mobile MFA recovery adapters.
 *
 * Today this package only exposes the OIDC `identifierAuthProvider` used by
 * `@metamask/mfa-recovery-controller` (MetaMask/core#10022). Engine wiring,
 * AuthToken / 2FA step-up, and seedless TOPRF unlock are intentionally deferred.
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
