import { MpcTokenRecoveryAuthProvider } from './auth-provider';

const fetchMock = jest.fn();

global.fetch = fetchMock as unknown as typeof fetch;

describe('MpcTokenRecoveryAuthProvider', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ token: 'minted-token' }),
    });
  });

  it('reads the bearer token lazily for the profile and minted token', async () => {
    const getBearerToken = jest
      .fn()
      .mockResolvedValue('header.eyJzdWIiOiJwcm9maWxlLTEifQ.signature');
    const provider = new MpcTokenRecoveryAuthProvider({
      getBearerToken,
      apiKey: 'api-key',
    });

    await expect(provider.getAuthenticatedProfileId()).resolves.toBe(
      'profile-1',
    );
    await expect(
      provider.authorizeRecoveryRequest({
        requestHash: '0xrequest',
        audiences: ['cubist'],
        requireTwoFactor: true,
      }),
    ).resolves.toBe('minted-token');

    expect(getBearerToken).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://mpc-service-non-enclave.dev-api.cx.metamask.io/token',
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'api-key',
        },
      }),
    );
  });

  it('includes identifier binding in request-bound token claims', async () => {
    const provider = new MpcTokenRecoveryAuthProvider({
      getBearerToken: jest
        .fn()
        .mockResolvedValue('header.eyJzdWIiOiJwcm9maWxlLTEifQ.signature'),
      apiKey: 'api-key',
    });
    const identifier = {
      type: 'siwe',
      namespace: 'metamask.io:1',
      value: '0xabc',
      verifier: { domain: 'metamask.io', chainId: 1 },
    };

    await provider.authorizeRecoveryRequest({
      requestHash: '0xrequest',
      audiences: ['cubist'],
      identifiers: [identifier],
    });

    const requestBody = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body);
    expect(requestBody).toEqual(
      expect.objectContaining({
        user: 'profile-1',
        aud: ['cubist'],
        ext: expect.objectContaining({
          request_hash: '0xrequest',
          identifiers_hash: expect.any(String),
        }),
      }),
    );
  });

  it('rejects a missing bearer token subject', async () => {
    const provider = new MpcTokenRecoveryAuthProvider({
      getBearerToken: jest.fn().mockResolvedValue('not-a-jwt'),
      apiKey: 'api-key',
    });

    await expect(provider.getAuthenticatedProfileId()).rejects.toThrow(
      'Authentication bearer token',
    );
  });

  it('rejects token API failures without exposing the API key', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 401 });
    const provider = new MpcTokenRecoveryAuthProvider({
      getBearerToken: jest
        .fn()
        .mockResolvedValue('header.eyJzdWIiOiJwcm9maWxlLTEifQ.signature'),
      apiKey: 'secret-api-key',
    });

    const error = await provider
      .getAccessToken()
      .catch((caughtError: unknown) => caughtError);
    expect(error).toMatchObject({ code: 'token_request_failed' });
    expect(String(error)).not.toContain('secret-api-key');
  });
});
