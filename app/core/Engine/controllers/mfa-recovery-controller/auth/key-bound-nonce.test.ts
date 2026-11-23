// eslint-disable-next-line import-x/no-nodejs-modules
import { webcrypto } from 'crypto';
import { getEscrowPasskeyChallenge } from '@metamask/mfa-recovery-controller';
import { stringToBytes } from '@metamask/utils';
import { keyBoundDigest } from './key-bound-nonce';

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
