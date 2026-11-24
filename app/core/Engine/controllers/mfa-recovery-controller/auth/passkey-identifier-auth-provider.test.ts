// eslint-disable-next-line import-x/no-nodejs-modules -- Node webcrypto generates P-256 test keys in Jest.
import { webcrypto } from 'crypto';
import {
  getEscrowPasskeyChallenge,
  type Identifier,
} from '@metamask/mfa-recovery-controller';
import { bytesToBase64 } from '@metamask/utils';
import { PlatformPasskeyIdentifierAuthProvider } from './passkey-identifier-auth-provider';

const PASSKEY: Identifier = {
  type: 'passkey',
  namespace: 'metamask.io',
  value: 'cred-1',
  verifier: { rpId: 'metamask.io', credentialId: 'cred-1' },
};

function base64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

describe('PlatformPasskeyIdentifierAuthProvider', () => {
  const originalSubtle = global.crypto.subtle;

  beforeAll(() => {
    Object.defineProperty(global.crypto, 'subtle', {
      value: webcrypto.subtle,
      configurable: true,
    });
  });

  afterAll(() => {
    Object.defineProperty(global.crypto, 'subtle', {
      value: originalSubtle,
      configurable: true,
    });
  });
  it('signs the escrow passkey challenge and returns a key-bound token', async () => {
    const get = jest.fn().mockResolvedValue({ id: 'assertion', response: {} });
    const provider = new PlatformPasskeyIdentifierAuthProvider({ get });
    const request = {
      identifier: PASSKEY,
      proofPublicKey: new Uint8Array([1, 2, 3]),
      requestHash: '0xabc',
      notAfter: 1_700_000_300,
    };

    const result = await provider.getKeyBoundIdentifierLogin(request);

    expect(get).toHaveBeenCalledWith({
      challenge: base64Url(await getEscrowPasskeyChallenge(request)),
      rpId: 'metamask.io',
      allowCredentials: [{ type: 'public-key', id: 'cred-1' }],
      userVerification: 'required',
    });
    expect(result).toEqual({
      token: {
        ...request,
        providerAssertion: { id: 'assertion', response: {} },
      },
    });
  });
});
