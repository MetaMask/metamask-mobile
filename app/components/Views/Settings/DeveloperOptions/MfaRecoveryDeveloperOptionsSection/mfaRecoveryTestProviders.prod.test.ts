import { PasskeyIdentifierAuthProvider } from './mfaRecoveryTestProviders';

describe('PasskeyIdentifierAuthProvider', () => {
  it('creates a passkey identifier and signs key-bound assertions', async () => {
    const provider = new PasskeyIdentifierAuthProvider();
    const identifier = provider.createIdentifier();

    await expect(
      provider.getKeyBoundIdentifierToken({
        identifier,
        proofPublicKey: '{"kty":"EC"}',
        requestHash: '0xrequest',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        identifier,
        proofPublicKey: '{"kty":"EC"}',
        requestHash: '0xrequest',
        providerAssertion: expect.objectContaining({
          id: identifier.value,
          response: expect.objectContaining({
            clientDataJSON: expect.any(String),
            authenticatorData: expect.any(String),
            signature: expect.any(String),
          }),
        }),
      }),
    );
  });

  it('continues to support registered passkeys after rotation', async () => {
    const provider = new PasskeyIdentifierAuthProvider();
    const previousIdentifier = provider.createIdentifier();
    const replacementIdentifier = provider.createIdentifier();

    await expect(
      provider.getKeyBoundIdentifierToken({
        identifier: previousIdentifier,
        proofPublicKey: '{"kty":"EC"}',
        requestHash: '0xrequest',
      }),
    ).resolves.toEqual(
      expect.objectContaining({ identifier: previousIdentifier }),
    );
    await expect(
      provider.getKeyBoundIdentifierToken({
        identifier: replacementIdentifier,
        proofPublicKey: '{"kty":"EC"}',
        requestHash: '0xrequest',
      }),
    ).resolves.toEqual(
      expect.objectContaining({ identifier: replacementIdentifier }),
    );
  });
});
