import {
  bytesToBase64,
  bytesToHex,
  sha256,
  stringToBytes,
} from '@metamask/utils';
import type { Identifier } from '@metamask/mfa-recovery-controller';
import { RecoveryIdentifierRouter } from './identifier-auth-provider';
import {
  PlatformPasskeyIdentifierAuthProvider,
  unavailablePasskeyAssertionGetter,
} from './passkey-identifier-auth-provider';

const PASSKEY_IDENTIFIER: Identifier = {
  type: 'passkey',
  namespace: 'authentication.dev-api.cx.metamask.io',
  value: 'cred-id',
  verifier: {
    rpId: 'authentication.dev-api.cx.metamask.io',
    credentialId: 'cred-id',
  },
};
const PROOF_PUBLIC_KEY = new Uint8Array(32).fill(3);
const REQUEST_HASH = `0x${'ab'.repeat(32)}`;

async function expectedChallenge(): Promise<string> {
  return bytesToBase64(
    await sha256(
      stringToBytes(
        JSON.stringify([bytesToHex(PROOF_PUBLIC_KEY), REQUEST_HASH]),
      ),
    ),
  )
    .replace(/\+/gu, '-')
    .replace(/\//gu, '_')
    .replace(/[=]+$/u, '');
}

describe('PlatformPasskeyIdentifierAuthProvider', () => {
  it('asserts with the enrolled RP ID and credential, bound to the request', async () => {
    const get = jest.fn().mockResolvedValue({
      id: 'cred-id',
      response: { signature: 'sig' },
    });
    const provider = new PlatformPasskeyIdentifierAuthProvider({ get });

    const result = await provider.getKeyBoundIdentifierToken({
      identifier: PASSKEY_IDENTIFIER,
      proofPublicKey: PROOF_PUBLIC_KEY,
      requestHash: REQUEST_HASH,
    });

    expect(get).toHaveBeenCalledWith({
      challenge: await expectedChallenge(),
      rpId: 'authentication.dev-api.cx.metamask.io',
      allowCredentials: [{ type: 'public-key', id: 'cred-id' }],
      userVerification: 'required',
    });
    expect(result).toStrictEqual({
      identifier: PASSKEY_IDENTIFIER,
      proofPublicKey: PROOF_PUBLIC_KEY,
      requestHash: REQUEST_HASH,
      providerAssertion: { id: 'cred-id', response: { signature: 'sig' } },
    });
  });

  it('rejects an identifier without its RP ID or credential ID', async () => {
    const provider = new PlatformPasskeyIdentifierAuthProvider({
      get: jest.fn(),
    });

    await expect(
      provider.getKeyBoundIdentifierToken({
        identifier: { ...PASSKEY_IDENTIFIER, verifier: { credentialId: 'x' } },
        proofPublicKey: PROOF_PUBLIC_KEY,
        requestHash: REQUEST_HASH,
      }),
    ).rejects.toMatchObject({ code: 'passkey_identifier_invalid' });
  });

  it('reports passkey_unavailable when no getter is wired', async () => {
    const provider = new PlatformPasskeyIdentifierAuthProvider({
      get: unavailablePasskeyAssertionGetter,
    });

    await expect(
      provider.getKeyBoundIdentifierToken({
        identifier: PASSKEY_IDENTIFIER,
        proofPublicKey: PROOF_PUBLIC_KEY,
        requestHash: REQUEST_HASH,
      }),
    ).rejects.toMatchObject({ code: 'passkey_unavailable' });
  });

  it('is selected by the router for passkey identifiers', async () => {
    const get = jest.fn().mockResolvedValue({ id: 'cred-id', response: {} });
    const router = new RecoveryIdentifierRouter({
      getAddress: () => '0xabc',
      signPersonalMessage: jest.fn(),
      getPasskeyAssertion: get,
    });

    await router.getKeyBoundIdentifierToken({
      identifier: PASSKEY_IDENTIFIER,
      proofPublicKey: PROOF_PUBLIC_KEY,
      requestHash: REQUEST_HASH,
    });

    expect(get).toHaveBeenCalledTimes(1);
  });
});
