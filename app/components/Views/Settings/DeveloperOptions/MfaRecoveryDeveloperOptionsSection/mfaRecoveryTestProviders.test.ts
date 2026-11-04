import type { Identifier } from '@metamask/mfa-recovery-controller';
import { PasskeyIdentifierAuthProvider } from './mfaRecoveryTestProviders';

const PROOF_PUBLIC_KEY = new Uint8Array(32).fill(7);

describe('developer recovery test providers', () => {
  it('creates and signs a passkey identifier', async () => {
    const provider = new PasskeyIdentifierAuthProvider();
    const identifier = provider.createIdentifier();

    await expect(
      provider.getKeyBoundIdentifierToken({
        identifier,
        proofPublicKey: PROOF_PUBLIC_KEY,
        requestHash: '0xrequest',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        identifier,
        providerAssertion: expect.objectContaining({
          id: identifier.value,
        }),
      }),
    );
  });

  it('keeps previously registered passkeys usable after rotation', async () => {
    const provider = new PasskeyIdentifierAuthProvider();
    const previousIdentifier = provider.createIdentifier();
    const replacementIdentifier = provider.createIdentifier();

    const result = await provider.getKeyBoundIdentifierToken({
      identifier: previousIdentifier,
      proofPublicKey: PROOF_PUBLIC_KEY,
      requestHash: '0xrequest',
    });

    expect(result.identifier).toBe(previousIdentifier);
    expect(replacementIdentifier.type).toBe('passkey');
  });

  it('returns identifiers with the controller-compatible shape', () => {
    const provider = new PasskeyIdentifierAuthProvider();
    const identifier: Identifier = provider.createIdentifier();

    expect(identifier).toEqual(
      expect.objectContaining({
        type: 'passkey',
        namespace: expect.any(String),
        value: expect.any(String),
        verifier: expect.objectContaining({
          credentialId: identifier.value,
        }),
      }),
    );
  });
});
