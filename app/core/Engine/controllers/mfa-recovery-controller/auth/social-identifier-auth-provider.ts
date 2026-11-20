import { bytesToHex } from '@metamask/utils';
import type {
  KeyBoundIdentifierLogin,
  KeyBoundIdentifierTokenRequest,
  RecoveryIdentifierAuthProvider,
} from '@metamask/mfa-recovery-controller';
import { keyBoundDigest } from './key-bound-nonce';

/** Returns a fresh OIDC ID token whose `nonce` claim is the given value. */
export type SocialIdTokenProvider = (nonce: string) => Promise<string>;

/**
 * Proves social identifiers with an OIDC ID token. The escrow requires the
 * token's nonce to be the hash of the proof public key and request hash, so
 * the token must be issued for this request: the sign-in token held from
 * onboarding cannot be reused.
 */
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
