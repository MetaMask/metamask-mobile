import type { Identifier } from '@metamask/mfa-recovery-controller';
import {
  TestIdentifierAuthProvider,
  StubAuthProvider,
  SiweIdentifierAuthProvider,
  passthroughEncryptor,
} from './mfaRecoveryTestProviders';

const APP_ACCESS_TOKEN = 'header.eyJzdWIiOiJwcm9maWxlLTEifQ.signature';
const fetchMock = jest.fn();

global.fetch = fetchMock as unknown as typeof fetch;

const createAuthParams = (identifier: Identifier) => ({
  identifier,
  proofPublicKey: '{"kty":"EC"}',
  requestHash: '0xrequest',
});

describe('mfa recovery test providers', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ token: 'minted-token' }),
    });
  });

  it('returns the JWT subject as the authenticated profile id', async () => {
    const provider = new StubAuthProvider({
      accessToken: APP_ACCESS_TOKEN,
      apiKey: 'api-key',
    });

    await expect(provider.getAuthenticatedProfileId()).resolves.toBe(
      'profile-13',
    );
  });

  it('derives the profile and creates a request-bound auth token', async () => {
    const provider = new StubAuthProvider({
      accessToken: APP_ACCESS_TOKEN,
      apiKey: 'api-key',
    });
    const token = await provider.authorizeRecoveryRequest({
      requestHash: '0x6869',
      audiences: ['cubist'],
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

    expect(token).toBe('minted-token');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://mpc-service-non-enclave.dev-api.cx.metamask.io/token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'api-key',
        },
        body: expect.stringContaining('"user":"profile-13"'),
      },
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual(
      expect.objectContaining({
        user: 'profile-13',
        aud: ['cubist'],
        ext: expect.objectContaining({
          aal: 2,
          request_hash: '0x6869',
          identifiers_hash: expect.any(String),
        }),
      }),
    );
  });

  it('sorts identifier hashes by UTF-8 bytes', async () => {
    const provider = new StubAuthProvider({
      accessToken: APP_ACCESS_TOKEN,
      apiKey: 'api-key',
    });

    await provider.authorizeRecoveryRequest({
      requestHash: '0x6869',
      audiences: ['cubist'],
      identifiers: [
        {
          type: 'passkey',
          namespace: 'metamask.io',
          value: 'a2V5LTE',
          verifier: { rpId: 'metamask.io' },
        },
        {
          type: 'passkey',
          namespace: 'metamask.io',
          value: 'Zm9vLTI',
          verifier: { rpId: 'metamask.io' },
        },
      ],
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);

    expect(body.ext.identifiers_hash).toBe(
      '0x7443c56ffce0cdfa6ab5a651948d137c2b8a019b30eac9807ed7fe180b60ef92',
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
        body: JSON.stringify({ user: 'profile-13' }),
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

  it('rejects when the token response omits a string token', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ token: 123 }),
    });
    const provider = new StubAuthProvider({
      accessToken: APP_ACCESS_TOKEN,
      apiKey: 'api-key',
    });

    await expect(
      provider.authorizeRecoveryRequest({
        requestHash: '0x6869',
        audiences: ['cubist'],
      }),
    ).rejects.toThrow('invalid access token response');
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
        message: expect.stringMatching(
          /^metamask\.io wants you to sign in with your Ethereum account:[\s\S]*Nonce: 0x[0-9a-f]{64}/u,
        ),
        signature: '0xsignature',
      },
    });
  });

  it('routes SIWE assertions through the unified identifier provider', async () => {
    const signPersonalMessage = jest.fn().mockResolvedValue('0xsignature');
    const provider = new TestIdentifierAuthProvider(
      '0xabc',
      signPersonalMessage,
    );

    const result = await provider.getKeyBoundIdentifierToken(
      createAuthParams(provider.siweIdentifier),
    );

    expect(signPersonalMessage).toHaveBeenCalledWith({
      from: '0xabc',
      data: expect.stringMatching(/^0x/u),
    });
    expect(result.identifier).toBe(provider.siweIdentifier);
  });

  it('routes passkey assertions through the unified identifier provider', async () => {
    const provider = new TestIdentifierAuthProvider(
      '0xabc',
      jest.fn().mockResolvedValue('0xsignature'),
    );

    const result = await provider.getKeyBoundIdentifierToken(
      createAuthParams(provider.passkeyIdentifier),
    );

    expect(result.providerAssertion).toEqual(
      expect.objectContaining({ id: provider.passkeyIdentifier.value }),
    );
  });

  it('rejects unsupported identifier types in the unified provider', async () => {
    const provider = new TestIdentifierAuthProvider(
      '0xabc',
      jest.fn().mockResolvedValue('0xsignature'),
    );
    const identifier = {
      type: 'email',
      namespace: 'example.com',
      value: 'user@example.com',
      verifier: {},
    } as unknown as Identifier;

    await expect(
      provider.getKeyBoundIdentifierToken(createAuthParams(identifier)),
    ).rejects.toThrow('Unsupported test identifier type: email');
  });

  it('keeps earlier passkeys available after rotating the current identifier', async () => {
    const provider = new TestIdentifierAuthProvider(
      '0xabc',
      jest.fn().mockResolvedValue('0xsignature'),
    );
    const previousPasskey = provider.passkeyIdentifier;
    const replacementPasskey = provider.createPasskeyIdentifier();

    provider.setPasskeyIdentifier(replacementPasskey);

    expect(provider.passkeyIdentifier).toBe(replacementPasskey);
    await expect(
      provider.getKeyBoundIdentifierToken(createAuthParams(previousPasskey)),
    ).resolves.toEqual(
      expect.objectContaining({
        identifier: previousPasskey,
        providerAssertion: expect.objectContaining({
          id: previousPasskey.value,
        }),
      }),
    );
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
