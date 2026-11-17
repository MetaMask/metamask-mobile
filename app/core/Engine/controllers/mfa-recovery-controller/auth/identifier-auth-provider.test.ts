import type { Identifier } from '@metamask/mfa-recovery-controller';
import { RecoveryIdentifierRouter } from './identifier-auth-provider';
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
    });

    await expect(
      router.getKeyBoundIdentifierToken({
        identifier: {
          type: 'siwe',
          namespace: 'eip155:1',
          value: '0xabc',
        } as Identifier,
        proofPublicKey,
        requestHash,
      }),
    ).rejects.toEqual(
      new MfaRecoveryControllerError(
        'Unsupported recovery identifier type: siwe',
        'unsupported_identifier_type',
      ),
    );
  });
});
