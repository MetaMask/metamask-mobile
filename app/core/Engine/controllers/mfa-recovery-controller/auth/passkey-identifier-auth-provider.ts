import { bytesToBase64 } from '@metamask/utils';
import {
  getEscrowPasskeyChallenge,
  type Identifier,
  type KeyBoundIdentifierLogin,
  type KeyBoundIdentifierTokenRequest,
  type RecoveryIdentifierAuthProvider,
} from '@metamask/mfa-recovery-controller';
import type { PasskeyAdapter } from '../../../../../util/identity/mfa/engine/types';
import { MfaRecoveryControllerError } from '../errors';

/** Runs one platform passkey assertion ceremony. */
export type PasskeyAssertionGetter = PasskeyAdapter['get'];

function base64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes)
    .replace(/\+/gu, '-')
    .replace(/\//gu, '_')
    .replace(/[=]+$/u, '');
}

/**
 * Proves passkey identifiers with the platform passkey sheet. The assertion is
 * made for the RP ID and credential the identifier was enrolled with, and the
 * challenge is the escrow's prefixed login challenge, which MFA verification
 * refuses to sign.
 */
export class PlatformPasskeyIdentifierAuthProvider
  implements RecoveryIdentifierAuthProvider
{
  readonly #get: PasskeyAssertionGetter;

  constructor({ get }: { get: PasskeyAssertionGetter }) {
    this.#get = get;
  }

  async getKeyBoundIdentifierLogin(
    params: KeyBoundIdentifierTokenRequest,
  ): Promise<KeyBoundIdentifierLogin> {
    const { rpId, credentialId } = readPasskeyVerifier(params.identifier);
    const challenge = base64Url(await getEscrowPasskeyChallenge(params));
    const assertion = await this.#get({
      challenge,
      rpId,
      allowCredentials: [{ type: 'public-key', id: credentialId }],
      userVerification: 'required',
    });
    return {
      token: {
        identifier: params.identifier,
        proofPublicKey: params.proofPublicKey,
        requestHash: params.requestHash,
        notAfter: params.notAfter,
        providerAssertion: { id: assertion.id, response: assertion.response },
      },
    };
  }
}

/**
 * Fills the passkey verifier when Auth returned only the identifier identity.
 * Auth's approval carries `namespace` (RP ID) and `value` (credential ID), not
 * the verifier object the platform sheet needs.
 */
export function withPasskeyVerifier(identifier: Identifier): Identifier {
  if (
    identifier.type !== 'passkey' ||
    isProvablePasskeyIdentifier(identifier)
  ) {
    return identifier;
  }
  if (identifier.namespace.length === 0 || identifier.value.length === 0) {
    return identifier;
  }
  return {
    ...identifier,
    verifier: { rpId: identifier.namespace, credentialId: identifier.value },
  };
}

/** Returns whether the identifier carries the passkey verifier the escrow needs. */
export function isProvablePasskeyIdentifier(identifier: Identifier): boolean {
  if (identifier.type !== 'passkey') {
    return false;
  }
  try {
    readPasskeyVerifier(identifier);
    return true;
  } catch {
    return false;
  }
}

function readPasskeyVerifier(identifier: Identifier): {
  rpId: string;
  credentialId: string;
} {
  const { rpId, credentialId } = (identifier.verifier ?? {}) as {
    rpId?: unknown;
    credentialId?: unknown;
  };
  if (
    typeof rpId !== 'string' ||
    rpId.length === 0 ||
    typeof credentialId !== 'string' ||
    credentialId.length === 0
  ) {
    throw new MfaRecoveryControllerError(
      'Passkey identifier is missing its RP ID or credential ID',
      'passkey_identifier_invalid',
    );
  }
  return { rpId, credentialId };
}
