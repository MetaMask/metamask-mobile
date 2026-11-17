import type { Identifier } from '@metamask/mfa-recovery-controller';
import { bytesToHex, sha256, stringToBytes } from '@metamask/utils';
import {
  RecoveryIdentifierRouter,
  SiweIdentifierAuthProvider,
} from './identifier-auth-provider';
import { createSiweIdentifier } from './identifiers';
import { MfaRecoveryControllerError } from '../errors';

jest.mock('./passkey-identifier-auth-provider', () => ({
  PlatformPasskeyIdentifierAuthProvider: jest
    .fn()
    .mockImplementation(({ get }) => ({
      getKeyBoundIdentifierToken: jest.fn(async (params) => ({
        ...params,
        providerAssertion: await get({ challenge: 'c' }),
      })),
    })),
}));

jest.mock('./social-identifier-auth-provider', () => ({
  SocialIdentifierAuthProvider: jest
    .fn()
    .mockImplementation(({ getIdToken }) => ({
      getKeyBoundIdentifierToken: jest.fn(async (params) => ({
        ...params,
        providerAssertion: await getIdToken('nonce'),
      })),
    })),
}));

const PASSKEY: Identifier = {
  type: 'passkey',
  namespace: 'metamask.io',
  value: 'cred-1',
};

const SOCIAL: Identifier = {
  type: 'social',
  namespace: 'https://accounts.google.com',
  value: 'google-user',
  verifier: { issuer: 'https://accounts.google.com' },
};

const ADDRESS = '0x1234567890abcdef1234567890abcdef12345678';

describe('RecoveryIdentifierRouter', () => {
  const proofPublicKey = new Uint8Array([1, 2, 3]);
  const requestHash = '0xabc';

  it('routes passkey identifiers to the passkey provider', async () => {
    const getPasskeyAssertion = jest.fn().mockResolvedValue({
      id: 'assertion',
      response: {},
    });
    const router = new RecoveryIdentifierRouter({
      getPasskeyAssertion,
      getSocialIdToken: jest.fn(),
      getAddress: jest.fn(),
      signPersonalMessage: jest.fn(),
    });

    const result = await router.getKeyBoundIdentifierToken({
      identifier: PASSKEY,
      proofPublicKey,
      requestHash,
    });

    expect(getPasskeyAssertion).toHaveBeenCalledTimes(1);
    expect(result.providerAssertion).toEqual({
      id: 'assertion',
      response: {},
    });
  });

  it('routes social identifiers to the social provider', async () => {
    const getSocialIdToken = jest.fn().mockResolvedValue('social-id-token');
    const router = new RecoveryIdentifierRouter({
      getPasskeyAssertion: jest.fn(),
      getSocialIdToken,
      getAddress: jest.fn(),
      signPersonalMessage: jest.fn(),
    });

    const result = await router.getKeyBoundIdentifierToken({
      identifier: SOCIAL,
      proofPublicKey,
      requestHash,
    });

    expect(getSocialIdToken).toHaveBeenCalledWith('nonce');
    expect(result.providerAssertion).toBe('social-id-token');
  });

  it('rejects unsupported identifier types', async () => {
    const router = new RecoveryIdentifierRouter({
      getPasskeyAssertion: jest.fn(),
      getSocialIdToken: jest.fn(),
      getAddress: jest.fn(),
      signPersonalMessage: jest.fn(),
    });

    await expect(
      router.getKeyBoundIdentifierToken({
        identifier: {
          type: 'webauthn',
          namespace: 'metamask.io',
          value: 'x',
        } as unknown as Identifier,
        proofPublicKey,
        requestHash,
      }),
    ).rejects.toEqual(
      new MfaRecoveryControllerError(
        'Unsupported recovery identifier type: webauthn',
        'unsupported_identifier_type',
      ),
    );
  });

  it('routes siwe identifiers to the SIWE provider', async () => {
    const signPersonalMessage = jest.fn().mockResolvedValue('0xsig');
    const router = new RecoveryIdentifierRouter({
      getPasskeyAssertion: jest.fn(),
      getSocialIdToken: jest.fn(),
      getAddress: (): string => ADDRESS,
      signPersonalMessage,
    });

    const result = await router.getKeyBoundIdentifierToken({
      identifier: createSiweIdentifier(ADDRESS),
      proofPublicKey,
      requestHash,
    });

    expect(signPersonalMessage).toHaveBeenCalledTimes(1);
    expect(result.providerAssertion).toEqual(
      expect.objectContaining({ signature: '0xsig' }),
    );
  });
});

describe('SiweIdentifierAuthProvider', () => {
  const proofPublicKey = new Uint8Array([1, 2, 3]);
  const requestHash = '0xabc';

  it('signs a SIWE message bound to the proof key and request hash', async () => {
    const signPersonalMessage = jest.fn().mockResolvedValue('0xsig');
    const provider = new SiweIdentifierAuthProvider({
      getAddress: (): string => ADDRESS,
      signPersonalMessage,
    });
    const identifier = createSiweIdentifier(ADDRESS);
    const expectedNonce = bytesToHex(
      await sha256(
        stringToBytes(
          JSON.stringify([bytesToHex(proofPublicKey), requestHash]),
        ),
      ),
    );

    const result = await provider.getKeyBoundIdentifierToken({
      identifier,
      proofPublicKey,
      requestHash,
    });

    const { message, signature } = result.providerAssertion as {
      message: string;
      signature: string;
    };
    expect(message).toContain(
      'metamask.io wants you to sign in with your Ethereum account:',
    );
    expect(message).toContain(`\n${ADDRESS}\n`);
    expect(message).toContain('Chain ID: 1');
    expect(message).toContain(`Nonce: ${expectedNonce}`);
    expect(signature).toBe('0xsig');
    expect(signPersonalMessage).toHaveBeenCalledWith({
      data: bytesToHex(stringToBytes(message)),
      from: ADDRESS,
    });
    expect(result).toEqual({
      identifier,
      proofPublicKey,
      requestHash,
      providerAssertion: { message, signature: '0xsig' },
    });
  });
});
