import {
  bytesToBase64,
  bytesToHex,
  sha256,
  stringToBytes,
} from '@metamask/utils';
import type {
  Identifier,
  RecoveryIdentifierAuthProvider,
} from '@metamask/mfa-recovery-controller';
import type { PasskeyAdapter } from '../../../../../util/identity/mfa/engine/types';
import { MfaRecoveryControllerError } from '../errors';

type KeyBoundIdentifierToken = Awaited<
  ReturnType<RecoveryIdentifierAuthProvider['getKeyBoundIdentifierToken']>
>;

/** Runs one platform passkey assertion ceremony. */
export type PasskeyAssertionGetter = PasskeyAdapter['get'];

/** Used until the platform passkey sheet is wired in. */
export const unavailablePasskeyAssertionGetter: PasskeyAssertionGetter =
  async () => {
    throw new MfaRecoveryControllerError(
      'Passkey recovery is not available',
      'passkey_unavailable',
    );
  };

function base64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes)
    .replace(/\+/gu, '-')
    .replace(/\//gu, '_')
    .replace(/[=]+$/u, '');
}

/**
 * Proves passkey identifiers with the platform passkey sheet. The assertion is
 * made for the RP ID and credential the identifier was enrolled with, and the
 * challenge binds the proof key and request hash, as the escrow requires.
 */
export class PlatformPasskeyIdentifierAuthProvider
  implements RecoveryIdentifierAuthProvider
{
  readonly #get: PasskeyAssertionGetter;

  constructor({ get }: { get: PasskeyAssertionGetter }) {
    this.#get = get;
  }

  async getKeyBoundIdentifierToken(params: {
    identifier: Identifier;
    proofPublicKey: Uint8Array;
    requestHash: string;
  }): Promise<KeyBoundIdentifierToken> {
    const { rpId, credentialId } = readPasskeyVerifier(params.identifier);
    const challenge = base64Url(
      await sha256(
        stringToBytes(
          JSON.stringify([
            bytesToHex(params.proofPublicKey),
            params.requestHash,
          ]),
        ),
      ),
    );
    const assertion = await this.#get({
      challenge,
      rpId,
      allowCredentials: [{ type: 'public-key', id: credentialId }],
      userVerification: 'required',
    });
    return {
      identifier: params.identifier,
      proofPublicKey: params.proofPublicKey,
      requestHash: params.requestHash,
      providerAssertion: { id: assertion.id, response: assertion.response },
    };
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
