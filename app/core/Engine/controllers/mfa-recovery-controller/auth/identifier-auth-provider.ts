import { toChecksumHexAddress } from '@metamask/controller-utils';
import { bytesToHex, sha256, stringToBytes } from '@metamask/utils';
import type {
  Identifier,
  KeyBoundIdentifierLogin,
  KeyBoundIdentifierTokenRequest,
  RecoveryIdentifierAuthProvider,
} from '@metamask/mfa-recovery-controller';
import { SIWE_CHAIN_ID, SIWE_DOMAIN } from '../config';
import { MfaRecoveryControllerError } from '../errors';
import {
  PlatformPasskeyIdentifierAuthProvider,
  type PasskeyAssertionGetter,
} from './passkey-identifier-auth-provider';
import type { SiweSigner } from './srp-siwe-signer';

/** Maps Seedless social login connections to their escrow OIDC issuer URLs. */
export const SOCIAL_IDENTIFIER_ISSUERS: Record<string, string> = {
  google: 'https://accounts.google.com',
  apple: 'https://appleid.apple.com',
};

/** Builds a SIWE recovery identifier for an Ethereum address. */
export function createSiweIdentifier(address: string): Identifier {
  return {
    type: 'siwe',
    namespace: `${SIWE_DOMAIN}:${SIWE_CHAIN_ID}`,
    value: address.toLowerCase(),
    verifier: { domain: SIWE_DOMAIN, chainId: SIWE_CHAIN_ID },
  };
}

/**
 * Computes the SHA-256 digest binding a recovery request's proof public key,
 * request hash, and expiry, as the escrow verifies in SIWE and social nonces.
 */
export async function keyBoundDigest(
  proofPublicKey: Uint8Array,
  requestHash: string,
  notAfter: number,
): Promise<Uint8Array> {
  return await sha256(
    stringToBytes(
      JSON.stringify([bytesToHex(proofPublicKey), requestHash, notAfter]),
    ),
  );
}

/** Issues an OIDC ID token for the wallet's social login bound to `nonce`. */
export type SocialIdTokenProvider = (nonce: string) => Promise<string>;

/** Proves social identifiers with a key-bound OIDC ID token. */
export class SocialIdentifierAuthProvider
  implements RecoveryIdentifierAuthProvider
{
  readonly #getIdToken: SocialIdTokenProvider;

  constructor({ getIdToken }: { getIdToken: SocialIdTokenProvider }) {
    this.#getIdToken = getIdToken;
  }

  async getKeyBoundIdentifierLogin(
    params: KeyBoundIdentifierTokenRequest,
  ): Promise<KeyBoundIdentifierLogin> {
    const nonce = bytesToHex(
      await keyBoundDigest(
        params.proofPublicKey,
        params.requestHash,
        params.notAfter,
      ),
    );
    const idToken = await this.#getIdToken(nonce);
    return {
      token: {
        identifier: params.identifier,
        proofPublicKey: params.proofPublicKey,
        requestHash: params.requestHash,
        notAfter: params.notAfter,
        providerAssertion: idToken,
      },
    };
  }
}

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
