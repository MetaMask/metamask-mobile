import { CubeSignerClient, envs } from '@cubist-labs/cubesigner-sdk';
import {
  createCubistClientGetter,
  type CubistSessionTokenProvider,
} from './cubist-escrow-provider';
import type { CubistConfig } from './config';

const fetchMock = jest.fn();

jest.mock('@cubist-labs/cubesigner-sdk', () => ({
  CubeSignerClient: {
    createOidcSession: jest.fn(),
    create: jest.fn(),
  },
  envs: { gamma: { name: 'gamma' } },
}));

global.fetch = fetchMock as unknown as typeof fetch;

const config: CubistConfig = {
  environment: 'gamma',
  orgId: 'org-1',
  wrapPublicKey: new Uint8Array(32).fill(1),
  receiptPublicKey: new Uint8Array(32).fill(2),
  scopes: ['manage:*'],
  registrationUrl: 'https://recovery-registration.test',
};

const tokenProvider: CubistSessionTokenProvider = {
  getAuthenticatedProfileId: jest.fn().mockResolvedValue('profile-1'),
  getAccessToken: jest.fn().mockResolvedValue('mpc-token'),
};

describe('createCubistClientGetter', () => {
  const cubeSignerClient = jest.requireMock('@cubist-labs/cubesigner-sdk')
    .CubeSignerClient as {
    createOidcSession: jest.Mock;
    create: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        idToken: 'oidc-token',
        expiresAt: Math.floor(Date.now() / 1000) + 300,
      }),
    });
    cubeSignerClient.createOidcSession.mockResolvedValue({
      data: () => ({ token: 'session-token' }),
    });
    cubeSignerClient.create.mockResolvedValue({ client: true });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates the CubeSigner client lazily and caches it for the same profile', async () => {
    const getClient = createCubistClientGetter({
      tokenProvider,
      getConfig: () => config,
      isEnabled: () => true,
    });

    const client = await getClient();
    const cachedClient = await getClient();

    expect(cachedClient).toBe(client);
    expect(client).toEqual({ client: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(cubeSignerClient.createOidcSession).toHaveBeenCalledWith(
      { name: 'gamma' },
      'org-1',
      'oidc-token',
      ['manage:*'],
    );
    expect(cubeSignerClient.create).toHaveBeenCalledWith({
      token: 'session-token',
    });
  });

  it('does not contact recovery services when disabled', async () => {
    const getClient = createCubistClientGetter({
      tokenProvider,
      getConfig: () => config,
      isEnabled: () => false,
    });

    await expect(getClient()).rejects.toMatchObject({
      code: 'feature_disabled',
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(cubeSignerClient.createOidcSession).not.toHaveBeenCalled();
  });

  it('refreshes the client when the authenticated profile changes', async () => {
    const getAuthenticatedProfileId = jest
      .mocked(tokenProvider.getAuthenticatedProfileId)
      .mockResolvedValueOnce('profile-1')
      .mockResolvedValueOnce('profile-2');
    const getClient = createCubistClientGetter({
      tokenProvider,
      getConfig: () => config,
      isEnabled: () => true,
    });

    await getClient();
    await getClient();

    expect(getAuthenticatedProfileId).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('refreshes the client once the OIDC token has expired', async () => {
    jest.useFakeTimers();
    const nowMs = new Date('2026-01-01T00:00:00Z').getTime();
    const nowSeconds = Math.floor(nowMs / 1000);
    jest.setSystemTime(nowMs);
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          idToken: 'oidc-token',
          expiresAt: nowSeconds + 300,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          idToken: 'oidc-token-2',
          expiresAt: nowSeconds + 301 + 300,
        }),
      });
    const getClient = createCubistClientGetter({
      tokenProvider,
      getConfig: () => config,
      isEnabled: () => true,
    });

    await getClient();
    jest.setSystemTime(nowMs + 301 * 1000);
    await getClient();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(cubeSignerClient.createOidcSession).toHaveBeenLastCalledWith(
      { name: 'gamma' },
      'org-1',
      'oidc-token-2',
      ['manage:*'],
    );
  });
});
