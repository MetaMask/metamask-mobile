import { bytesToHex, sha256, stringToBytes } from '@metamask/utils';
import type { Identifier } from '@metamask/mfa-recovery-controller';
import { RecoveryIdentifierRouter } from './identifier-auth-provider';
import {
  SocialIdentifierAuthProvider,
  unavailableSocialIdTokenProvider,
} from './social-identifier-auth-provider';

const SOCIAL_IDENTIFIER: Identifier = {
  type: 'social',
  namespace: 'https://accounts.google.com',
  value: 'google-user',
};
const PROOF_PUBLIC_KEY = new Uint8Array(32).fill(3);
const REQUEST_HASH = `0x${'ab'.repeat(32)}`;

async function expectedNonce(): Promise<string> {
  return bytesToHex(
    await sha256(
      stringToBytes(
        JSON.stringify([bytesToHex(PROOF_PUBLIC_KEY), REQUEST_HASH]),
      ),
    ),
  );
}

describe('SocialIdentifierAuthProvider', () => {
  it('requests an ID token bound to the proof key and request hash', async () => {
    const getIdToken = jest.fn().mockResolvedValue('id-token-jwt');
    const provider = new SocialIdentifierAuthProvider({ getIdToken });

    const result = await provider.getKeyBoundIdentifierToken({
      identifier: SOCIAL_IDENTIFIER,
      proofPublicKey: PROOF_PUBLIC_KEY,
      requestHash: REQUEST_HASH,
    });

    expect(getIdToken).toHaveBeenCalledWith(await expectedNonce());
    expect(result).toStrictEqual({
      identifier: SOCIAL_IDENTIFIER,
      proofPublicKey: PROOF_PUBLIC_KEY,
      requestHash: REQUEST_HASH,
      providerAssertion: 'id-token-jwt',
    });
  });

  it('reports social_sign_in_unavailable until sign-in supports a nonce', async () => {
    const provider = new SocialIdentifierAuthProvider({
      getIdToken: unavailableSocialIdTokenProvider,
    });

    await expect(
      provider.getKeyBoundIdentifierToken({
        identifier: SOCIAL_IDENTIFIER,
        proofPublicKey: PROOF_PUBLIC_KEY,
        requestHash: REQUEST_HASH,
      }),
    ).rejects.toMatchObject({ code: 'social_sign_in_unavailable' });
  });

  it('is selected by the router only for social identifiers', async () => {
    const socialProvider = {
      getKeyBoundIdentifierToken: jest.fn().mockResolvedValue({}),
    };
    const router = new RecoveryIdentifierRouter({
      getAddress: () => '0xabc',
      signPersonalMessage: jest.fn(),
    });
    router.registerProvider('social', socialProvider);

    await router.getKeyBoundIdentifierToken({
      identifier: SOCIAL_IDENTIFIER,
      proofPublicKey: PROOF_PUBLIC_KEY,
      requestHash: REQUEST_HASH,
    });

    expect(socialProvider.getKeyBoundIdentifierToken).toHaveBeenCalledTimes(1);
  });
});
