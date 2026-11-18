import {
  getEscrowPasskeyChallenge,
  type Identifier,
} from '@metamask/mfa-recovery-controller';
import { PlatformPasskeyIdentifierAuthProvider } from './passkey-identifier-auth-provider';

jest.mock('@metamask/mfa-recovery-controller', () => ({
  getEscrowPasskeyChallenge: jest.fn(),
}));

const PASSKEY: Identifier = {
  type: 'passkey',
  namespace: 'metamask.io',
  value: 'cred-1',
  verifier: { rpId: 'metamask.io', credentialId: 'cred-1' },
};

describe('PlatformPasskeyIdentifierAuthProvider', () => {
  it('signs the escrow passkey challenge and binds notAfter', async () => {
    jest
      .mocked(getEscrowPasskeyChallenge)
      .mockResolvedValue(new Uint8Array([0xfb, 0xff]));
    const get = jest.fn().mockResolvedValue({ id: 'a', response: {} });
    const provider = new PlatformPasskeyIdentifierAuthProvider({ get });
    const request = {
      identifier: PASSKEY,
      proofPublicKey: new Uint8Array(32).fill(1),
      requestHash: '0xdead',
      notAfter: 1_800_000_000,
    };

    const { token } = await provider.getKeyBoundIdentifierLogin(request);

    expect(getEscrowPasskeyChallenge).toHaveBeenCalledWith(request);
    expect(get).toHaveBeenCalledWith({
      challenge: '-_8',
      rpId: 'metamask.io',
      allowCredentials: [{ type: 'public-key', id: 'cred-1' }],
      userVerification: 'required',
    });
    expect(token).toEqual({
      ...request,
      providerAssertion: { id: 'a', response: {} },
    });
  });
});
