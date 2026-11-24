// eslint-disable-next-line import-x/no-nodejs-modules -- Node webcrypto generates P-256 test keys in Jest.
import { webcrypto } from 'crypto';
import {
  getEscrowPasskeyChallenge,
  type Identifier,
} from '@metamask/mfa-recovery-controller';
import { bytesToHex, sha256, stringToBytes } from '@metamask/utils';
import {
  createSiweIdentifier,
  keyBoundDigest,
  RecoveryIdentifierRouter,
  SiweIdentifierAuthProvider,
  SocialIdentifierAuthProvider,
} from './identifier-auth-provider';
import { MfaRecoveryControllerError } from '../errors';
import type { SiweSigner } from './srp-siwe-signer';

jest.mock('./passkey-identifier-auth-provider', () => ({
  PlatformPasskeyIdentifierAuthProvider: jest
    .fn()
    .mockImplementation(({ get }) => ({
      getKeyBoundIdentifierLogin: jest.fn(async (params) => ({
        token: {
          ...params,
          providerAssertion: await get({ challenge: 'c' }),
        },
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
const CHECKSUMMED_ADDRESS = '0x1234567890AbcdEF1234567890aBcdef12345678';

function createSiweSigner(signature = '0xsig'): SiweSigner & {
  getAddress: jest.Mock<Promise<string>, []>;
  signMessage: jest.Mock<Promise<string>, [string]>;
} {
  return {
    getAddress: jest.fn<Promise<string>, []>().mockResolvedValue(ADDRESS),
    signMessage: jest
      .fn<Promise<string>, [string]>()
      .mockResolvedValue(signature),
  };
}

describe('createSiweIdentifier', () => {
  it('lowercases the address and namespaces it by SIWE domain and chain', () => {
    expect(createSiweIdentifier('0xAbCdEf')).toStrictEqual({
      type: 'siwe',
      namespace: 'metamask.io:1',
      value: '0xabcdef',
      verifier: { domain: 'metamask.io', chainId: 1 },
    });
  });
});

describe('keyBoundDigest', () => {
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

  it('matches the hash the escrow binds into its passkey challenge', async () => {
    const request = {
      identifier: { type: 'siwe', namespace: 'metamask.io:1', value: '0xabc' },
      proofPublicKey: new Uint8Array([1, 2, 3]),
      requestHash: '0xabc',
      notAfter: 1_700_000_300,
    };
    const prefixLength = stringToBytes('MetaMask escrow login:').length;

    const challenge = await getEscrowPasskeyChallenge(request);
    const digest = await keyBoundDigest(
      request.proofPublicKey,
      request.requestHash,
      request.notAfter,
    );

    expect(challenge.subarray(prefixLength)).toEqual(digest);
  });
});

describe('SocialIdentifierAuthProvider', () => {
  it('returns a key-bound social ID token for the request', async () => {
    const getIdToken = jest.fn().mockResolvedValue('social-id-token');
    const provider = new SocialIdentifierAuthProvider({ getIdToken });
    const proofPublicKey = new Uint8Array([1, 2, 3]);
    const requestHash = '0xdead';
    const notAfter = 1_700_000_300;
    const expectedNonce = bytesToHex(
      await keyBoundDigest(proofPublicKey, requestHash, notAfter),
    );

    const result = await provider.getKeyBoundIdentifierLogin({
      identifier: SOCIAL,
      proofPublicKey,
      requestHash,
      notAfter,
    });

    expect(getIdToken).toHaveBeenCalledWith(expectedNonce);
    expect(result).toEqual({
      token: {
        identifier: SOCIAL,
        proofPublicKey,
        requestHash,
        notAfter,
        providerAssertion: 'social-id-token',
      },
    });
  });
});

describe('RecoveryIdentifierRouter', () => {
  const proofPublicKey = new Uint8Array([1, 2, 3]);
  const requestHash = '0xabc';
  const notAfter = 1_700_000_300;

  it('routes passkey identifiers to the passkey provider', async () => {
    const getPasskeyAssertion = jest.fn().mockResolvedValue({
      id: 'assertion',
      response: {},
    });
    const router = new RecoveryIdentifierRouter({
      getPasskeyAssertion,
      getSocialIdToken: jest.fn(),
      siweSigner: createSiweSigner(),
    });

    const result = await router.getKeyBoundIdentifierLogin({
      identifier: PASSKEY,
      proofPublicKey,
      requestHash,
      notAfter,
    });

    expect(getPasskeyAssertion).toHaveBeenCalledTimes(1);
    expect(result.token.providerAssertion).toEqual({
      id: 'assertion',
      response: {},
    });
  });

  it('routes social identifiers to the social provider', async () => {
    const getSocialIdToken = jest.fn().mockResolvedValue('social-id-token');
    const router = new RecoveryIdentifierRouter({
      getPasskeyAssertion: jest.fn(),
      getSocialIdToken,
      siweSigner: createSiweSigner(),
    });
    const expectedNonce = bytesToHex(
      await keyBoundDigest(proofPublicKey, requestHash, notAfter),
    );

    const result = await router.getKeyBoundIdentifierLogin({
      identifier: SOCIAL,
      proofPublicKey,
      requestHash,
      notAfter,
    });

    expect(getSocialIdToken).toHaveBeenCalledWith(expectedNonce);
    expect(result.token.providerAssertion).toBe('social-id-token');
  });

  it('rejects unsupported identifier types', async () => {
    const router = new RecoveryIdentifierRouter({
      getPasskeyAssertion: jest.fn(),
      getSocialIdToken: jest.fn(),
      siweSigner: createSiweSigner(),
    });

    await expect(
      router.getKeyBoundIdentifierLogin({
        identifier: {
          type: 'webauthn',
          namespace: 'metamask.io',
          value: 'x',
        },
        proofPublicKey,
        requestHash,
        notAfter,
      }),
    ).rejects.toEqual(
      new MfaRecoveryControllerError(
        'Unsupported recovery identifier type: webauthn',
        'unsupported_identifier_type',
      ),
    );
  });

  it('routes siwe identifiers to the SIWE provider', async () => {
    const siweSigner = createSiweSigner();
    const router = new RecoveryIdentifierRouter({
      getPasskeyAssertion: jest.fn(),
      getSocialIdToken: jest.fn(),
      siweSigner,
    });

    const result = await router.getKeyBoundIdentifierLogin({
      identifier: createSiweIdentifier(ADDRESS),
      proofPublicKey,
      requestHash,
      notAfter,
    });

    expect(siweSigner.signMessage).toHaveBeenCalledTimes(1);
    expect(result.token.providerAssertion).toEqual(
      expect.objectContaining({ signature: '0xsig' }),
    );
  });
});

describe('SiweIdentifierAuthProvider', () => {
  const proofPublicKey = new Uint8Array([1, 2, 3]);
  const requestHash = '0xabc';
  const notAfter = 1_700_000_300;

  it('signs a SIWE message bound to the proof key, request hash, and expiry', async () => {
    const signer = createSiweSigner();
    const provider = new SiweIdentifierAuthProvider({ signer });
    const identifier = createSiweIdentifier(ADDRESS);
    const expectedNonce = bytesToHex(
      await sha256(
        stringToBytes(
          JSON.stringify([bytesToHex(proofPublicKey), requestHash, notAfter]),
        ),
      ),
    );

    const result = await provider.getKeyBoundIdentifierLogin({
      identifier,
      proofPublicKey,
      requestHash,
      notAfter,
    });

    const { message, signature } = result.token.providerAssertion as {
      message: string;
      signature: string;
    };
    expect(message).toContain(
      'metamask.io wants you to sign in with your Ethereum account:',
    );
    expect(message).toContain(`\n${CHECKSUMMED_ADDRESS}\n`);
    expect(message).toContain('Chain ID: 1');
    expect(message).toContain(`Nonce: ${expectedNonce}`);
    expect(signature).toBe('0xsig');
    expect(signer.getAddress).toHaveBeenCalledTimes(1);
    expect(signer.signMessage).toHaveBeenCalledWith(message);
    expect(result).toEqual({
      token: {
        identifier,
        proofPublicKey,
        requestHash,
        notAfter,
        providerAssertion: { message, signature: '0xsig' },
      },
    });
  });
});
