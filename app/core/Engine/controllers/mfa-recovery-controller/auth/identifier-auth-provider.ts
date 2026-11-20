import { toChecksumHexAddress } from '@metamask/controller-utils';
import { bytesToHex } from '@metamask/utils';
import type {
  KeyBoundIdentifierLogin,
  KeyBoundIdentifierTokenRequest,
  RecoveryIdentifierAuthProvider,
} from '@metamask/mfa-recovery-controller';
import { SIWE_CHAIN_ID, SIWE_DOMAIN } from '../constants';
import { MfaRecoveryControllerError } from '../errors';
import { keyBoundDigest } from './key-bound-nonce';
import {
  PlatformPasskeyIdentifierAuthProvider,
  type PasskeyAssertionGetter,
} from './passkey-identifier-auth-provider';
import {
  SocialIdentifierAuthProvider,
  type SocialIdTokenProvider,
} from './social-identifier-auth-provider';
import type { SiweSigner } from './srp-siwe-signer';

/**
 * Signs key-bound SIWE identifier proofs with the primary SRP's
 * message-signing key, the same key profile sign-in uses.
 */
export class SiweIdentifierAuthProvider
  implements RecoveryIdentifierAuthProvider
{
  readonly #signer: SiweSigner;

  constructor({ signer }: { signer: SiweSigner }) {
    this.#signer = signer;
  }

  async getKeyBoundIdentifierLogin(
    params: KeyBoundIdentifierTokenRequest,
  ): Promise<KeyBoundIdentifierLogin> {
    const address = await this.#signer.getAddress();
    const nonce = bytesToHex(
      await keyBoundDigest(
        params.proofPublicKey,
        params.requestHash,
        params.notAfter,
      ),
    );
    const message = [
      `${SIWE_DOMAIN} wants you to sign in with your Ethereum account:`,
      toChecksumHexAddress(address),
      '',
      'Authorize MetaMask MFA recovery.',
      '',
      `URI: https://${SIWE_DOMAIN}`,
      'Version: 1',
      `Chain ID: ${SIWE_CHAIN_ID}`,
      `Nonce: ${nonce}`,
      `Issued At: ${new Date().toISOString()}`,
    ].join('\n');
    const signature = await this.#signer.signMessage(message);

    return {
      token: {
        identifier: params.identifier,
        proofPublicKey: params.proofPublicKey,
        requestHash: params.requestHash,
        notAfter: params.notAfter,
        providerAssertion: { message, signature },
      },
    };
  }
}

export interface RecoveryIdentifierRouterOptions {
  /** Signs SIWE identifier proofs with the primary SRP's message-signing key. */
  siweSigner: SiweSigner;
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
    siweSigner,
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
      ['siwe', new SiweIdentifierAuthProvider({ signer: siweSigner })],
    ]);
  }

  async getKeyBoundIdentifierLogin(
    params: KeyBoundIdentifierTokenRequest,
  ): Promise<KeyBoundIdentifierLogin> {
    const provider = this.#providers.get(params.identifier.type);
    if (!provider) {
      throw new MfaRecoveryControllerError(
        `Unsupported recovery identifier type: ${params.identifier.type}`,
        'unsupported_identifier_type',
      );
    }
    return await provider.getKeyBoundIdentifierLogin(params);
  }
}
