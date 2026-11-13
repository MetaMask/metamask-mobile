import { CubeSignerClient, envs } from '@cubist-labs/cubesigner-sdk';
import {
  createCubistClientGetter,
  requestOidcToken,
} from './cubist-escrow-provider';
import { MfaRecoveryControllerError } from './errors';
import type { CubistConfig } from './config';

jest.mock('@cubist-labs/cubesigner-sdk', () => ({
  envs: { gamma: { name: 'gamma' } },
  CubeSignerClient: {
    createOidcSession: jest.fn(),
    create: jest.fn(),
  },
}));

const CONFIG: Pick<
  CubistConfig,
  'environment' | 'orgId' | 'scopes' | 'registrationUrl'
> = {
  environment: 'gamma',
  orgId: 'Org#test',
  scopes: ['manage:policy:get'],
  registrationUrl: 'https://recovery.example',
};

const FUTURE_EXPIRY = Math.floor(Date.now() / 1000) + 3_600;

const createJsonResponse = (body: unknown, ok = true, status = 200) =>
  ({
    ok,
    status,
    json: jest.fn().mockResolvedValue(body),
  }) as unknown as Response;

describe('requestOidcToken', () => {
  it('posts the access token to the registration OIDC endpoint', async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValue(
        createJsonResponse({ idToken: 'oidc-token', expiresAt: FUTURE_EXPIRY }),
      );

    const result = await requestOidcToken(CONFIG, 'access-token', fetchFn);

    expect(fetchFn).toHaveBeenCalledWith(
      'https://recovery.example/v1/recovery/registration/oidc-token',
      {
        method: 'POST',
        headers: { Authorization: 'Bearer access-token' },
      },
    );
    expect(result).toEqual({
      idToken: 'oidc-token',
      expiresAt: FUTURE_EXPIRY,
    });
  });

  it('throws when registration returns a non-OK status', async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValue(createJsonResponse({}, false, 503));

    await expect(
      requestOidcToken(CONFIG, 'access-token', fetchFn),
    ).rejects.toEqual(
      new MfaRecoveryControllerError(
        'Recovery registration failed with HTTP 503',
        'registration_request_failed',
      ),
    );
  });

  it.each([
    ['a non-object body', 'token'],
    ['a null body', null],
    ['a missing idToken', { expiresAt: FUTURE_EXPIRY }],
    ['a blank idToken', { idToken: '  ', expiresAt: FUTURE_EXPIRY }],
    ['a non-string idToken', { idToken: 1, expiresAt: FUTURE_EXPIRY }],
    ['a missing expiresAt', { idToken: 'oidc-token' }],
    ['a non-finite expiresAt', { idToken: 'oidc-token', expiresAt: NaN }],
  ])('throws for %s', async (_label, body) => {
    const fetchFn = jest.fn().mockResolvedValue(createJsonResponse(body));

    await expect(
      requestOidcToken(CONFIG, 'access-token', fetchFn),
    ).rejects.toEqual(
      new MfaRecoveryControllerError(
        'Recovery registration returned an invalid OIDC token',
        'registration_response_invalid',
      ),
    );
  });

  it('throws when the OIDC token is already expired', async () => {
    const fetchFn = jest.fn().mockResolvedValue(
      createJsonResponse({
        idToken: 'oidc-token',
        expiresAt: Math.floor(Date.now() / 1000) - 10,
      }),
    );

    await expect(
      requestOidcToken(CONFIG, 'access-token', fetchFn),
    ).rejects.toEqual(
      new MfaRecoveryControllerError(
        'Recovery registration returned an expired OIDC token',
        'registration_token_expired',
      ),
    );
  });
});

describe('createCubistClientGetter', () => {
  const mockCreateOidcSession = jest.mocked(CubeSignerClient.createOidcSession);
  const mockCreate = jest.mocked(CubeSignerClient.create);
  const client = { id: 'client' } as unknown as CubeSignerClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateOidcSession.mockResolvedValue({
      data: () => ({ session: 'data' }),
    } as never);
    mockCreate.mockResolvedValue(client);
  });

  it('throws when the recovery feature is disabled', async () => {
    const getClient = createCubistClientGetter({
      tokenProvider: {
        getAccessToken: jest.fn(),
        getAuthenticatedProfileId: jest.fn(),
      },
      isEnabled: () => false,
    });

    await expect(getClient()).rejects.toEqual(
      new MfaRecoveryControllerError(
        'MFA recovery is disabled',
        'feature_disabled',
      ),
    );
  });

  it('creates a CubeSigner session from the registration OIDC token', async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValue(
        createJsonResponse({ idToken: 'oidc-token', expiresAt: FUTURE_EXPIRY }),
      );
    const getClient = createCubistClientGetter({
      tokenProvider: {
        getAccessToken: jest.fn().mockResolvedValue('access-token'),
        getAuthenticatedProfileId: jest.fn().mockResolvedValue('profile-1'),
      },
      isEnabled: () => true,
      getConfig: () => CONFIG as CubistConfig,
      fetchFn,
    });

    const result = await getClient();

    expect(result).toBe(client);
    expect(mockCreateOidcSession).toHaveBeenCalledWith(
      envs.gamma,
      CONFIG.orgId,
      'oidc-token',
      CONFIG.scopes,
    );
    expect(mockCreate).toHaveBeenCalledWith({ session: 'data' });
  });

  it('reuses the client for the same profile before expiry', async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValue(
        createJsonResponse({ idToken: 'oidc-token', expiresAt: FUTURE_EXPIRY }),
      );
    const getAccessToken = jest.fn().mockResolvedValue('access-token');
    const getClient = createCubistClientGetter({
      tokenProvider: {
        getAccessToken,
        getAuthenticatedProfileId: jest.fn().mockResolvedValue('profile-1'),
      },
      isEnabled: () => true,
      getConfig: () => CONFIG as CubistConfig,
      fetchFn,
    });

    expect(await getClient()).toBe(client);
    expect(await getClient()).toBe(client);
    expect(getAccessToken).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('creates a new client when the profile changes', async () => {
    const fetchFn = jest.fn().mockResolvedValue(
      createJsonResponse({
        idToken: 'oidc-token',
        expiresAt: FUTURE_EXPIRY,
      }),
    );
    const getAuthenticatedProfileId = jest
      .fn()
      .mockResolvedValueOnce('profile-1')
      .mockResolvedValueOnce('profile-2');
    const secondClient = { id: 'client-2' } as unknown as CubeSignerClient;
    mockCreate
      .mockResolvedValueOnce(client)
      .mockResolvedValueOnce(secondClient);

    const getClient = createCubistClientGetter({
      tokenProvider: {
        getAccessToken: jest.fn().mockResolvedValue('access-token'),
        getAuthenticatedProfileId,
      },
      isEnabled: () => true,
      getConfig: () => CONFIG as CubistConfig,
      fetchFn,
    });

    expect(await getClient()).toBe(client);
    expect(await getClient()).toBe(secondClient);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('creates a new client when the cached OIDC token has expired', async () => {
    jest.useFakeTimers();
    const nowSeconds = Math.floor(Date.now() / 1000);
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse({
          idToken: 'oidc-token',
          expiresAt: nowSeconds + 30,
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          idToken: 'oidc-token-2',
          expiresAt: nowSeconds + 3_600,
        }),
      );
    const refreshedClient = {
      id: 'client-refreshed',
    } as unknown as CubeSignerClient;
    mockCreate
      .mockResolvedValueOnce(client)
      .mockResolvedValueOnce(refreshedClient);

    const getClient = createCubistClientGetter({
      tokenProvider: {
        getAccessToken: jest.fn().mockResolvedValue('access-token'),
        getAuthenticatedProfileId: jest.fn().mockResolvedValue('profile-1'),
      },
      isEnabled: () => true,
      getConfig: () => CONFIG as CubistConfig,
      fetchFn,
    });

    expect(await getClient()).toBe(client);
    jest.setSystemTime((nowSeconds + 60) * 1000);
    expect(await getClient()).toBe(refreshedClient);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });
});
