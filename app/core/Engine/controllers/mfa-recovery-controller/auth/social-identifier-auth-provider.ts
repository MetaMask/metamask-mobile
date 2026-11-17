import { bytesToHex } from '@metamask/utils';
import type {
  Identifier,
  RecoveryIdentifierAuthProvider,
} from '@metamask/mfa-recovery-controller';
import { keyBoundDigest } from './key-bound-nonce';

type KeyBoundIdentifierToken = Awaited<
  ReturnType<RecoveryIdentifierAuthProvider['getKeyBoundIdentifierToken']>
>;

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

  async getKeyBoundIdentifierToken(params: {
    identifier: Identifier;
    proofPublicKey: Uint8Array;
    requestHash: string;
  }): Promise<KeyBoundIdentifierToken> {
    const nonce = bytesToHex(
      await keyBoundDigest(params.proofPublicKey, params.requestHash),
    );
    const idToken = await this.#getIdToken(nonce);
    return {
      identifier: params.identifier,
      proofPublicKey: params.proofPublicKey,
      requestHash: params.requestHash,
      providerAssertion: idToken,
    };
  }
}
