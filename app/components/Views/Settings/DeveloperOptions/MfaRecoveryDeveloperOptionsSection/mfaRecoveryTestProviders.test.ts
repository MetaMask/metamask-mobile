import {
  StubAuthProvider,
  SiweIdentifierAuthProvider,
  passthroughEncryptor,
} from './mfaRecoveryTestProviders';

describe('mfa recovery test providers', () => {
  it('creates a request-bound auth token for the configured profile', async () => {
    const provider = new StubAuthProvider('profile-1', () => 1_000);
    const token = await provider.authorizeRecoveryRequest({
      requestHash: '0xrequest',
      requireTwoFactor: true,
      identifiers: [
        {
          type: 'siwe',
          namespace: 'eip155:1',
          value: '0xabc',
          verifier: { address: '0xabc' },
        },
      ],
    });

    expect(token).toMatchObject({
      profileId: 'profile-1',
      requestHash: '0xrequest',
      twoFactor: true,
      identifierOwnershipApproved: true,
      issuer: 'mfa-recovery-developer-test',
      expiresAt: 4_600,
      signature: 'stub-auth-signature',
    });
    expect(token.identifiersHash).toEqual(expect.any(String));
  });

  it('signs a SIWE identifier proof with the primary account', async () => {
    const signPersonalMessage = jest.fn().mockResolvedValue('0xsignature');
    const provider = new SiweIdentifierAuthProvider(
      '0xabc',
      signPersonalMessage,
    );

    const result = await provider.getKeyBoundIdentifierToken({
      identifier: {
        type: 'siwe',
        namespace: 'eip155:1',
        value: '0xabc',
        verifier: { address: '0xabc' },
      },
      proofPublicKey: '{"kty":"EC"}',
      requestHash: '0xrequest',
    });

    expect(signPersonalMessage).toHaveBeenCalledWith({
      from: '0xabc',
      data: expect.stringMatching(/^0x/u),
    });
    expect(result).toEqual({
      identifier: expect.objectContaining({ type: 'siwe' }),
      proofPublicKey: '{"kty":"EC"}',
      requestHash: '0xrequest',
      providerAssertion: {
        type: 'siwe',
        address: '0xabc',
        message: expect.stringContaining('0xrequest'),
        signature: '0xsignature',
      },
    });
  });

  it('round-trips pending operations through the test encryptor', async () => {
    const operation = {
      phase: 'authorizing' as const,
      mutation: {
        id: 'mutation-1',
        profileId: 'profile-1',
        operation: 'register' as const,
        expectedVersion: 0,
        newVersion: 1,
        payloadHash: '0xpayload',
        audiences: ['cubist'],
        requestHash: '0xrequest',
      },
      payload: {
        identifiers: [],
        recoverySecret: '0xsecret',
      },
      identifier: null,
    };

    await expect(
      passthroughEncryptor.decrypt(
        await passthroughEncryptor.encrypt(operation),
      ),
    ).resolves.toEqual(operation);
  });
});
