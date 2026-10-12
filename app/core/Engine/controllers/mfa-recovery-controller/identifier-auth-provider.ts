import { bytesToHex, sha256, stringToBytes } from '@metamask/utils';
import type {
  Identifier,
  RecoveryIdentifierAuthProvider,
} from '@metamask/mfa-recovery-controller';
import {
  PASSKEY_ORIGIN,
  PASSKEY_RP_ID,
  SIWE_CHAIN_ID,
  SIWE_DOMAIN,
} from './constants';
import { MfaRecoveryControllerError } from './errors';
import type { SignPersonalMessage } from './identifiers';

export { PASSKEY_ORIGIN, PASSKEY_RP_ID };

type KeyBoundIdentifierToken = Awaited<
  ReturnType<RecoveryIdentifierAuthProvider['getKeyBoundIdentifierToken']>
>;

interface SiweIdentifierAuthProviderOptions {
  getAddress: () => string;
  signPersonalMessage: SignPersonalMessage;
}

/**
 * Signs key-bound SIWE identifier proofs with the current primary account.
 */
export class SiweIdentifierAuthProvider
  implements RecoveryIdentifierAuthProvider
{
  readonly #getAddress: () => string;

  readonly #signPersonalMessage: SignPersonalMessage;

  constructor({
    getAddress,
    signPersonalMessage,
  }: SiweIdentifierAuthProviderOptions) {
    this.#getAddress = getAddress;
    this.#signPersonalMessage = signPersonalMessage;
  }

  async getKeyBoundIdentifierToken(params: {
    identifier: Identifier;
    proofPublicKey: string;
    requestHash: string;
  }): Promise<KeyBoundIdentifierToken> {
    const address = this.#getAddress();
    const nonce = bytesToHex(
      await sha256(
        stringToBytes(
          JSON.stringify([params.proofPublicKey, params.requestHash]),
        ),
      ),
    );
    const message = [
      `${SIWE_DOMAIN} wants you to sign in with your Ethereum account:`,
      address,
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
      data: bytesToHex(stringToBytes(message)),
      from: address,
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
 * Routes recovery identifier proofs to providers registered for each type.
 */
export class RecoveryIdentifierRouter
  implements RecoveryIdentifierAuthProvider
{
  readonly #providers = new Map<string, RecoveryIdentifierAuthProvider>();

  constructor(options: SiweIdentifierAuthProviderOptions) {
    this.registerProvider('siwe', new SiweIdentifierAuthProvider(options));
  }

  registerProvider(
    identifierType: string,
    provider: RecoveryIdentifierAuthProvider,
  ): void {
    this.#providers.set(identifierType, provider);
  }

  unregisterProvider(identifierType: string): void {
    this.#providers.delete(identifierType);
  }

  async getKeyBoundIdentifierToken(params: {
    identifier: Identifier;
    proofPublicKey: string;
    requestHash: string;
  }): Promise<KeyBoundIdentifierToken> {
    const provider = this.#providers.get(params.identifier.type);
    if (!provider) {
      throw new MfaRecoveryControllerError(
        `Unsupported recovery identifier type: ${params.identifier.type}`,
        'unsupported_identifier_type',
      );
    }
    return await provider.getKeyBoundIdentifierToken(params);
  }
}
