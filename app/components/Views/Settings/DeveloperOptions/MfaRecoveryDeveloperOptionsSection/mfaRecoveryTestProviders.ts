import { sha256, stringToBytes } from '@metamask/utils';
import type {
  Identifier,
  RecoveryIdentifierAuthProvider,
} from '@metamask/mfa-recovery-controller';
import {
  PASSKEY_ORIGIN,
  PASSKEY_RP_ID,
} from '../../../../../core/Engine/controllers/mfa-recovery-controller/identifier-auth-provider';
import { SoftwarePasskey, base64Url } from './softwarePasskey';

type KeyBoundIdentifierToken = Awaited<
  ReturnType<RecoveryIdentifierAuthProvider['getKeyBoundIdentifierToken']>
>;

/**
 * Signs key-bound passkey identifier proofs with in-memory software passkeys.
 */
export class PasskeyIdentifierAuthProvider
  implements RecoveryIdentifierAuthProvider
{
  readonly #passkeys = new Map<string, SoftwarePasskey>();

  /** Creates a passkey and returns its recovery identifier. */
  createIdentifier(): Identifier {
    const passkey = new SoftwarePasskey();
    this.#passkeys.set(passkey.credentialId, passkey);
    return {
      type: 'passkey',
      namespace: PASSKEY_RP_ID,
      value: passkey.credentialId,
      verifier: {
        rpId: PASSKEY_RP_ID,
        origins: [PASSKEY_ORIGIN],
        credentialId: passkey.credentialId,
        publicKey: passkey.publicJwk,
      },
    };
  }

  async getKeyBoundIdentifierToken(params: {
    identifier: Identifier;
    proofPublicKey: string;
    requestHash: string;
  }): Promise<KeyBoundIdentifierToken> {
    const passkey = this.#passkeys.get(params.identifier.value);
    if (!passkey) {
      throw new Error('Unknown test passkey');
    }
    // The escrow requires challenge = the raw digest of hash([proofPublicKey, requestHash]).
    const challenge = base64Url(
      await sha256(
        stringToBytes(
          JSON.stringify([params.proofPublicKey, params.requestHash]),
        ),
      ),
    );
    const { id, response } = await passkey.get({
      rpId: PASSKEY_RP_ID,
      origin: PASSKEY_ORIGIN,
      challenge,
    });
    return {
      identifier: params.identifier,
      proofPublicKey: params.proofPublicKey,
      requestHash: params.requestHash,
      providerAssertion: { id, response },
    };
  }
}

/** Test-only passkey provider registered into the production identifier router. */
export class TestPasskeyIdentifierAuthProvider extends PasskeyIdentifierAuthProvider {
  #passkeyIdentifier: Identifier;

  constructor() {
    super();
    this.#passkeyIdentifier = this.createIdentifier();
  }

  get passkeyIdentifier(): Identifier {
    return this.#passkeyIdentifier;
  }

  /** Creates a new passkey without making it current. */
  createPasskeyIdentifier(): Identifier {
    return this.createIdentifier();
  }

  /** Makes a registered replacement passkey the current one. */
  setPasskeyIdentifier(identifier: Identifier): void {
    this.#passkeyIdentifier = identifier;
  }
}
