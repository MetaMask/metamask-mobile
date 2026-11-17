import type { Identifier } from '@metamask/mfa-recovery-controller';
import { bytesToHex } from '@metamask/utils';
import { SocialIdentifierAuthProvider } from './social-identifier-auth-provider';
import { keyBoundDigest } from './key-bound-nonce';

jest.mock('./key-bound-nonce', () => ({
  keyBoundDigest: jest.fn(),
}));

const SOCIAL: Identifier = {
  type: 'social',
  namespace: 'https://accounts.google.com',
  value: 'google-user',
  verifier: { issuer: 'https://accounts.google.com' },
};

describe('SocialIdentifierAuthProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(keyBoundDigest).mockResolvedValue(new Uint8Array([0xab, 0xcd]));
  });

  it('returns a key-bound social ID token for the request', async () => {
    const getIdToken = jest.fn().mockResolvedValue('social-id-token');
    const provider = new SocialIdentifierAuthProvider({ getIdToken });
    const proofPublicKey = new Uint8Array([1, 2, 3]);
    const requestHash = '0xdead';

    const result = await provider.getKeyBoundIdentifierToken({
      identifier: SOCIAL,
      proofPublicKey,
      requestHash,
    });

    expect(keyBoundDigest).toHaveBeenCalledWith(proofPublicKey, requestHash);
    expect(getIdToken).toHaveBeenCalledWith(
      bytesToHex(new Uint8Array([0xab, 0xcd])),
    );
    expect(result).toEqual({
      identifier: SOCIAL,
      proofPublicKey,
      requestHash,
      providerAssertion: 'social-id-token',
    });
  });
});
