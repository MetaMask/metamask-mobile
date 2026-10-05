import {
  StubAuthProvider,
  SiweIdentifierAuthProvider,
  passthroughEncryptor,
} from './mfaRecoveryTestProviders';

const APP_ACCESS_TOKEN = 'header.eyJzdWIiOiJwcm9maWxlLTEifQ.signature';
const fetchMock = jest.fn();

global.fetch = fetchMock as unknown as typeof fetch;

describe('mfa recovery test providers', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ token: 'minted-token' }),
    });
  });

  it('derives the profile and creates a request-bound auth token', async () => {
    const provider = new StubAuthProvider({
      accessToken: APP_ACCESS_TOKEN,
      apiKey: 'api-key',
      now: () => 1_000,
    });
    const token = await provider.authorizeRecoveryRequest({
      requestHash: '0x6869',
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
      requestHash: '0x6869',
      twoFactor: true,
      identifierOwnershipApproved: true,
      issuer: 'mfa-recovery-developer-test',
      expiresAt: 4_600,
      signature: 'minted-token',
    });
    expect(token.identifiersHash).toEqual(expect.any(String));

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'api-key',
      },
      body: expect.stringContaining('"user":"profile-1"'),
    });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual(
      expect.objectContaining({
        user: 'profile-1',
        ext: expect.objectContaining({
          aal: 'aal2',
          amr: ['totp', 'passkey'],
          requestHash: 'aGk',
        }),
      }),
    );
  });

  it('mints an access token using a custom API host', async () => {
    const provider = new StubAuthProvider({
      accessToken: APP_ACCESS_TOKEN,
      apiKey: 'api-key',
      apiHost: 'https://custom.example.com',
    });

    await expect(provider.getAccessToken()).resolves.toBe('minted-token');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://custom.example.com/token',
      expect.objectContaining({
        body: JSON.stringify({ user: 'profile-1' }),
      }),
    );
  });

  it('rejects an invalid bearer token', () => {
    expect(
      () =>
        new StubAuthProvider({
          accessToken: 'not-a-jwt',
          apiKey: 'api-key',
        }),
    ).toThrow('Authentication bearer token');
  });

  it('rejects when the token API request fails', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
    });
    const provider = new StubAuthProvider({
      accessToken: APP_ACCESS_TOKEN,
      apiKey: 'api-key',
    });

    await expect(provider.getAccessToken()).rejects.toThrow('HTTP 401');
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
