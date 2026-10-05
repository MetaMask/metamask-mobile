import { bytesToHex, sha256, stringToBytes } from '@metamask/utils';
import type {
  Identifier,
  PendingOperation,
  PendingOperationEncryptor,
  RecoveryIdentifierAuthProvider,
} from '@metamask/mfa-recovery-controller';
import { SoftwarePasskey, base64Url } from './softwarePasskey';

/** Must be allowed by the escrow's IDENTIFIER_POLICY (siwe domains/chainIds). */
export const SIWE_DOMAIN = 'metamask.io';
export const SIWE_CHAIN_ID = 1;
/** Must be allowed by the escrow's IDENTIFIER_POLICY (passkey rpIds/origins). */
export const PASSKEY_RP_ID = 'metamask.io';
export const PASSKEY_ORIGIN = 'https://metamask.io';

type SignPersonalMessage = (params: {
  data: string;
  from: string;
}) => Promise<string>;

/**
 * Signs key-bound SIWE identifier proofs with the primary account.
 */
export class SiweIdentifierAuthProvider
  implements RecoveryIdentifierAuthProvider
{
  readonly #address: string;

  readonly #signPersonalMessage: SignPersonalMessage;

  constructor(address: string, signPersonalMessage: SignPersonalMessage) {
    this.#address = address;
    this.#signPersonalMessage = signPersonalMessage;
  }

  async getKeyBoundIdentifierToken(params: {
    identifier: Identifier;
    proofPublicKey: string;
    requestHash: string;
  }): Promise<{
    identifier: Identifier;
    proofPublicKey: string;
    requestHash: string;
    providerAssertion: unknown;
  }> {
    // The escrow requires nonce = hash([proofPublicKey, requestHash]).
    const nonce = bytesToHex(
      await sha256(
        stringToBytes(
          JSON.stringify([params.proofPublicKey, params.requestHash]),
        ),
      ),
    );
    const message = [
      `${SIWE_DOMAIN} wants you to sign in with your Ethereum account:`,
      this.#address,
      '',
      'Authorize MetaMask MFA recovery.',
      '',
      `URI: https://${SIWE_DOMAIN}`,
      'Version: 1',
      `Chain ID: ${SIWE_CHAIN_ID}`,
      `Nonce: ${nonce}`,
      `Issued At: ${new Date().toISOString()}`,
    ].join('\n');
    const signature = await this.#signPersonalMessage({
      from: this.#address,
      data: bytesToHex(stringToBytes(message)),
    });

    return {
      identifier: params.identifier,
      proofPublicKey: params.proofPublicKey,
      requestHash: params.requestHash,
      providerAssertion: { message, signature },
    };
  }
}

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
  }) {
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

/**
 * JSON round-trip encryptor for the developer test.
 */
export const passthroughEncryptor: PendingOperationEncryptor = {
  async encrypt(operation: PendingOperation): Promise<string> {
    return JSON.stringify(operation);
  },

  async decrypt(ciphertext: string): Promise<PendingOperation> {
    return JSON.parse(ciphertext) as PendingOperation;
  },
};
