import type {
  Identifier,
  RecoveryIdentifierAuthProvider,
} from '@metamask/mfa-recovery-controller';
import { MfaRecoveryControllerError } from '../errors';
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

export interface RecoveryIdentifierRouterOptions {
  /** Runs the platform passkey assertion ceremony. */
  getPasskeyAssertion: PasskeyAssertionGetter;
  /** Issues social ID tokens bound to a nonce. */
  getSocialIdToken: SocialIdTokenProvider;
}

/**
 * Routes recovery identifier proofs to the provider for each identifier type.
 * SIWE is not routed: recovery runs while the wallet is locked, so the
 * keyring cannot sign.
 */
export class RecoveryIdentifierRouter
  implements RecoveryIdentifierAuthProvider
{
  readonly #providers: ReadonlyMap<string, RecoveryIdentifierAuthProvider>;

  constructor({
    getPasskeyAssertion,
    getSocialIdToken,
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
