import type { Identifier } from '@metamask/mfa-recovery-controller';
import { SIWE_CHAIN_ID, SIWE_DOMAIN } from '../constants';
import { MfaRecoveryControllerError } from '../errors';

/** OIDC issuers of the social logins seedless onboarding supports. */
export const SOCIAL_IDENTIFIER_ISSUERS: Readonly<Record<string, string>> = {
  google: 'https://accounts.google.com',
  apple: 'https://appleid.apple.com',
};

/** Creates the canonical SIWE identifier for a wallet address. */
export function createSiweIdentifier(address: string): Identifier {
  return {
    type: 'siwe',
    namespace: `${SIWE_DOMAIN}:${SIWE_CHAIN_ID}`,
    value: address.toLowerCase(),
    verifier: { domain: SIWE_DOMAIN, chainId: SIWE_CHAIN_ID },
  };
}

/**
 * Creates the social identifier of the seedless social login, namespaced by
 * the login's OIDC issuer.
 *
 * @param seedlessState - The seedless onboarding controller's social login.
 * @param seedlessState.authConnection - The social login provider.
 * @param seedlessState.userId - The social login's user ID.
 * @returns The social identifier.
 */
export function createSocialIdentifier({
  authConnection,
  userId,
}: {
  authConnection?: string;
  userId?: string;
}): Identifier {
  if (!authConnection || !userId) {
    throw new MfaRecoveryControllerError(
      'Seedless onboarding has no social login',
      'social_login_unavailable',
    );
  }
  const namespace = SOCIAL_IDENTIFIER_ISSUERS[authConnection];
  if (namespace === undefined) {
    throw new MfaRecoveryControllerError(
      `Unsupported social login provider: ${authConnection}`,
      'unsupported_social_login',
    );
  }
  return { type: 'social', namespace, value: userId };
}
