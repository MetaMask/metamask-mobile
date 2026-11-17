import { bytesToHex, sha256, stringToBytes } from '@metamask/utils';
import type {
  Identifier,
  RecoveryIdentifierAuthProvider,
} from '@metamask/mfa-recovery-controller';
import { SIWE_CHAIN_ID, SIWE_DOMAIN } from '../constants';
import { MfaRecoveryControllerError } from '../errors';
import type { SignPersonalMessage } from './identifiers';
import {
  PlatformPasskeyIdentifierAuthProvider,
  type PasskeyAssertionGetter,
} from './passkey-identifier-auth-provider';
import {
  SocialIdentifierAuthProvider,
  type SocialIdTokenProvider,
} from './social-identifier-auth-provider';

type KeyBoundIdentifierToken = Awaited<
  ReturnType<RecoveryIdentifierAuthProvider['getKeyBoundIdentifierToken']>
>;

interface SiweIdentifierAuthProviderOptions {
  /** Returns the primary account address that signs SIWE proofs. */
  getAddress: () => string;
  /** Signs a hex-encoded personal message with the keyring. */
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
    proofPublicKey: Uint8Array;
    requestHash: string;
  }): Promise<KeyBoundIdentifierToken> {
    const address = this.#getAddress();
    const nonce = bytesToHex(
      await sha256(
        stringToBytes(
          JSON.stringify([
            bytesToHex(params.proofPublicKey),
            params.requestHash,
          ]),
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

export interface RecoveryIdentifierRouterOptions
  extends SiweIdentifierAuthProviderOptions {
  /** Runs the platform passkey assertion ceremony. */
  getPasskeyAssertion: PasskeyAssertionGetter;
  /** Issues social ID tokens bound to a nonce. */
  getSocialIdToken: SocialIdTokenProvider;
}

/**
 * Routes recovery identifier proofs to the provider for each identifier type.
 * SIWE proofs need an unlocked keyring, so they only work while the wallet is
 * unlocked; locked recovery proves with passkey or social.
 */
export class RecoveryIdentifierRouter
  implements RecoveryIdentifierAuthProvider
{
  readonly #providers: ReadonlyMap<string, RecoveryIdentifierAuthProvider>;

  constructor({
    getPasskeyAssertion,
    getSocialIdToken,
    getAddress,
    signPersonalMessage,
  }: RecoveryIdentifierRouterOptions) {
    this.#providers = new Map<string, RecoveryIdentifierAuthProvider>([
      [
        'passkey',
        new PlatformPasskeyIdentifierAuthProvider({ get: getPasskeyAssertion }),
      ],
      [
        'social',
        new SocialIdentifierAuthProvider({ getIdToken: getSocialIdToken }),
      ],
      [
        'siwe',
        new SiweIdentifierAuthProvider({ getAddress, signPersonalMessage }),
      ],
    ]);
  }

  async getKeyBoundIdentifierToken(params: {
    identifier: Identifier;
    proofPublicKey: Uint8Array;
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
