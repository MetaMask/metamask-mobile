import { bytesToHex, sha256, stringToBytes } from '@metamask/utils';
import {
  PASSKEY_ORIGIN,
  PASSKEY_RP_ID,
  RecoveryIdentifierRouter,
  SiweIdentifierAuthProvider,
} from './identifier-auth-provider';
describe('SiweIdentifierAuthProvider', () => {
  it('signs an identifier proof with the current primary account', async () => {
    const signPersonalMessage = jest.fn().mockResolvedValue('0xsignature');
    const provider = new SiweIdentifierAuthProvider({
      getAddress: () => '0xabc',
      signPersonalMessage,
    });
    const identifier = {
      type: 'siwe',
      namespace: 'metamask.io:1',
      value: '0xabc',
      verifier: { domain: 'metamask.io', chainId: 1 },
    };

    const result = await provider.getKeyBoundIdentifierToken({
      identifier,
      proofPublicKey: '{"kty":"EC"}',
      requestHash: '0xrequest',
    });

    expect(signPersonalMessage).toHaveBeenCalledWith({
      from: '0xabc',
      data: expect.stringMatching(/^0x/u),
    });
    expect(result).toEqual({
      identifier,
      proofPublicKey: '{"kty":"EC"}',
      requestHash: '0xrequest',
      providerAssertion: {
        message: expect.stringMatching(
          /^metamask\.io wants you to sign in with your Ethereum account:[\s\S]*Nonce: 0x[0-9a-f]{64}/u,
        ),
        signature: '0xsignature',
      },
    });
  });
});

describe('RecoveryIdentifierRouter', () => {
  it('routes the default SIWE provider', async () => {
    const signPersonalMessage = jest.fn().mockResolvedValue('0xsignature');
    const router = new RecoveryIdentifierRouter({
      getAddress: () => '0xabc',
      signPersonalMessage,
    });

    const identifier = {
      type: 'siwe',
      namespace: 'metamask.io:1',
      value: '0xabc',
      verifier: { domain: 'metamask.io', chainId: 1 },
    };

    await router.getKeyBoundIdentifierToken({
      identifier,
      proofPublicKey: '{"kty":"EC"}',
      requestHash: '0xrequest',
    });

    expect(signPersonalMessage).toHaveBeenCalledTimes(1);
  });

  it('supports registering and removing providers by identifier type', async () => {
    const provider = {
      getKeyBoundIdentifierToken: jest.fn().mockResolvedValue({
        identifier: { type: 'passkey' },
        proofPublicKey: 'public-key',
        requestHash: 'request-hash',
        providerAssertion: {},
      }),
    };
    const router = new RecoveryIdentifierRouter({
      getAddress: () => '0xabc',
      signPersonalMessage: jest.fn(),
    });
    router.registerProvider('passkey', provider);

    await router.getKeyBoundIdentifierToken({
      identifier: {
        type: 'passkey',
        namespace: PASSKEY_RP_ID,
        value: 'credential',
        verifier: { rpId: PASSKEY_RP_ID, origins: [PASSKEY_ORIGIN] },
      },
      proofPublicKey: 'public-key',
      requestHash: 'request-hash',
    });
    expect(provider.getKeyBoundIdentifierToken).toHaveBeenCalledTimes(1);

    router.unregisterProvider('passkey');
    await expect(
      router.getKeyBoundIdentifierToken({
        identifier: {
          type: 'passkey',
          namespace: PASSKEY_RP_ID,
          value: 'credential',
          verifier: {},
        },
        proofPublicKey: 'public-key',
        requestHash: 'request-hash',
      }),
    ).rejects.toMatchObject({ code: 'unsupported_identifier_type' });
  });
});

describe('SIWE nonce', () => {
  it('uses the hash of the proof key and request hash', async () => {
    const signPersonalMessage = jest.fn().mockResolvedValue('0xsignature');
    const provider = new SiweIdentifierAuthProvider({
      getAddress: () => '0xabc',
      signPersonalMessage,
    });

    const result = await provider.getKeyBoundIdentifierToken({
      identifier: {
        type: 'siwe',
        namespace: 'metamask.io:1',
        value: '0xabc',
        verifier: {},
      },
      proofPublicKey: '{"kty":"EC"}',
      requestHash: '0xrequest',
    });

    const expectedNonce = bytesToHex(
      await sha256(
        stringToBytes(JSON.stringify(['{"kty":"EC"}', '0xrequest'])),
      ),
    );
    expect(result.providerAssertion).toEqual(
      expect.objectContaining({
        message: expect.stringContaining(`Nonce: ${expectedNonce}`),
      }),
    );
  });
});
