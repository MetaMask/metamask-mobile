import type { P256DevicePublicMaterial } from './p256DeviceKey';
import { KALSHI_AUTHENTICATION_PROFILE } from './venueAuthProfiles';
import {
  A2tSession,
  isA2tSessionCleared,
  type A2tSessionDependencies,
} from './a2tSession';

const PROFILE_ID = 'profile-1';
const NOW_SEC = 1_700_000_000;
const AUTH_URL = 'https://authentication.uat-api.cx.metamask.io';

const PUBLIC_RAW = Uint8Array.from({ length: 65 }, (_, index) =>
  index === 0 ? 0x04 : (index % 200) + 1,
);
const SALT_RAW = Uint8Array.from({ length: 16 }, (_, index) => index + 1);
const material = (
  publicKey = 'device-public-key',
  salt = 'device-salt',
): P256DevicePublicMaterial => ({
  publicRaw: PUBLIC_RAW,
  publicKey,
  saltRaw: SALT_RAW,
  salt,
});

const issuedToken = 'opaque-a2t';

const issuedBody = {
  access_token: issuedToken,
  expires_in: 900,
  token_type: 'bearer',
};

const jsonResponse = (status: number, body: unknown): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  }) as unknown as Response;

interface Harness {
  session: A2tSession;
  deps: A2tSessionDependencies;
  fetchMock: jest.MockedFunction<typeof fetch>;
  device: P256DevicePublicMaterial;
  nowSec: { value: number };
  nowMs: { value: number };
}

const createHarness = (
  overrides: Partial<A2tSessionDependencies> = {},
): Harness => {
  const key = material();
  const fetchMock = jest.fn<
    ReturnType<typeof fetch>,
    Parameters<typeof fetch>
  >();
  const nowSec = { value: NOW_SEC };
  const nowMs = { value: 0 };
  const deps: A2tSessionDependencies = {
    profile: KALSHI_AUTHENTICATION_PROFILE,
    getIssuerUrl: () => AUTH_URL,
    getAccessToken: async () => 'mm-token',
    getCanonicalProfileId: () => PROFILE_ID,
    getDeviceKey: async () => key,
    peekDeviceKey: () => key,
    fetch: fetchMock,
    now: () => nowSec.value,
    nowMs: () => nowMs.value,
    sleep: async (ms) => {
      nowMs.value += ms;
    },
    ...overrides,
  };
  return {
    session: new A2tSession(deps),
    deps,
    fetchMock,
    device: key,
    nowSec,
    nowMs,
  };
};

const mockIssue = (
  fetchMock: jest.MockedFunction<typeof fetch>,
  body: unknown = issuedBody,
): void => {
  fetchMock.mockResolvedValueOnce(jsonResponse(200, body));
};

describe('A2tSession', () => {
  it('asks MetaMask Auth for an A2T with the device key and salt', async () => {
    const key = material();
    const harness = createHarness({
      getDeviceKey: async () => key,
      peekDeviceKey: () => key,
    });
    mockIssue(harness.fetchMock);

    const a2t = await harness.session.ensureA2T();

    expect(a2t).toBe(issuedToken);
    expect(harness.fetchMock).toHaveBeenCalledTimes(1);
    expect(harness.fetchMock).toHaveBeenCalledWith(
      `${AUTH_URL}/api/v2/kalshi/token`,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer mm-token',
        }),
        body: JSON.stringify({
          device_public_key: key.publicKey,
          salt: key.salt,
        }),
      }),
    );
  });

  it.each([
    'eyJhbGciOiJFUzI1NiJ9.eyJleHAiOjF9.es256-signature',
    'eyJhbGciOiJSUzI1NiJ9.eyJleHAiOjJ9.rs256-signature',
    'not-a-jwt',
  ])('treats access token %s as opaque', async (accessToken) => {
    const harness = createHarness();
    mockIssue(harness.fetchMock, { ...issuedBody, access_token: accessToken });

    await expect(harness.session.ensureA2T()).resolves.toBe(accessToken);
  });

  it('rejects an empty body', async () => {
    const harness = createHarness();
    mockIssue(harness.fetchMock, null);

    await expect(harness.session.ensureA2T()).rejects.toThrow(
      'A2T response was empty',
    );
  });

  it.each([
    ['no access token', { expires_in: 900, token_type: 'bearer' }],
    [
      'a token type that is not bearer',
      { access_token: issuedToken, expires_in: 900, token_type: 'mac' },
    ],
  ])('rejects %s', async (_name, body) => {
    const harness = createHarness();
    mockIssue(harness.fetchMock, body);

    await expect(harness.session.ensureA2T()).rejects.toThrow(
      'A2T response was malformed',
    );
  });

  it('rejects a lifetime that is not a positive number', async () => {
    const harness = createHarness();
    mockIssue(harness.fetchMock, { ...issuedBody, expires_in: 0 });

    await expect(harness.session.ensureA2T()).rejects.toThrow(
      'A2T response lifetime was malformed',
    );
  });

  it('reuses a cached A2T when the device key is loaded again', async () => {
    const key = material();
    let visible: P256DevicePublicMaterial | null = key;
    const harness = createHarness({
      getDeviceKey: async () => key,
      peekDeviceKey: () => visible,
    });
    mockIssue(harness.fetchMock);

    await harness.session.ensureA2T();
    visible = null;
    harness.fetchMock.mockClear();
    const cached = await harness.session.ensureA2T();

    expect(cached).toBe(issuedToken);
    expect(harness.fetchMock).not.toHaveBeenCalled();
  });

  it('returns the cached A2T until shortly before it expires', async () => {
    const harness = createHarness();
    mockIssue(harness.fetchMock);

    await harness.session.ensureA2T();
    harness.nowSec.value = NOW_SEC + 900 - 61;
    const cached = await harness.session.ensureA2T();

    expect(cached).toBe(issuedToken);
    expect(harness.fetchMock).toHaveBeenCalledTimes(1);
  });

  it('requests a new A2T inside the refresh window', async () => {
    const harness = createHarness();
    mockIssue(harness.fetchMock);
    mockIssue(harness.fetchMock);

    await harness.session.ensureA2T();
    harness.nowSec.value = NOW_SEC + 900 - 60;
    await harness.session.ensureA2T();

    expect(harness.fetchMock).toHaveBeenCalledTimes(2);
  });

  it('shares one request across concurrent callers', async () => {
    let releaseToken: (response: Response) => void = () => undefined;
    const tokenGate = new Promise<Response>((resolve) => {
      releaseToken = resolve;
    });
    const harness = createHarness();
    harness.fetchMock.mockImplementationOnce(() => tokenGate);

    const first = harness.session.ensureA2T();
    const second = harness.session.ensureA2T();
    releaseToken(jsonResponse(200, issuedBody));

    await expect(Promise.all([first, second])).resolves.toEqual([
      issuedToken,
      issuedToken,
    ]);
    expect(harness.fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not reuse an A2T for a different profile', async () => {
    let profileId = PROFILE_ID;
    const harness = createHarness({
      getCanonicalProfileId: () => profileId,
    });
    mockIssue(harness.fetchMock);
    mockIssue(harness.fetchMock);

    await harness.session.ensureA2T();
    profileId = 'profile-2';
    await harness.session.ensureA2T();

    expect(harness.fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not reuse an A2T after the device key changes', async () => {
    let key = material('device-a', 'salt-a');
    const harness = createHarness({
      getDeviceKey: async () => key,
      peekDeviceKey: () => key,
    });
    mockIssue(harness.fetchMock);
    mockIssue(harness.fetchMock);

    await harness.session.ensureA2T();
    key = material('device-b', 'salt-b');
    await harness.session.ensureA2T();

    expect(harness.fetchMock).toHaveBeenLastCalledWith(
      `${AUTH_URL}/api/v2/kalshi/token`,
      expect.objectContaining({
        body: JSON.stringify({
          device_public_key: 'device-b',
          salt: 'salt-b',
        }),
      }),
    );
  });

  it('stops waiting when the access token keeps failing', async () => {
    let attempts = 0;
    const harness = createHarness({
      getAccessToken: async () => {
        attempts += 1;
        throw new Error('MetaMask access token was not available');
      },
    });

    await expect(harness.session.ensureA2T()).rejects.toThrow(
      'MetaMask access token was not available',
    );

    expect(attempts).toBeGreaterThan(3);
    expect(harness.nowMs.value).toBeGreaterThanOrEqual(15_000);
    expect(harness.fetchMock).not.toHaveBeenCalled();
  });

  it('issues an A2T when the access token fails and then becomes ready', async () => {
    let attempts = 0;
    const harness = createHarness({
      getAccessToken: async () => {
        attempts += 1;
        if (attempts < 5) {
          throw new Error('MetaMask access token was not available');
        }
        return 'mm-token';
      },
    });
    mockIssue(harness.fetchMock);

    const a2t = await harness.session.ensureA2T();

    expect(a2t).toBe(issuedToken);
    expect(attempts).toBe(5);
    expect(harness.nowMs.value).toBe(800);
  });

  it('drops the cached A2T when the session is cleared', async () => {
    const harness = createHarness();
    mockIssue(harness.fetchMock);
    mockIssue(harness.fetchMock);

    await harness.session.ensureA2T();
    harness.session.clear();
    await harness.session.ensureA2T();

    expect(harness.fetchMock).toHaveBeenCalledTimes(2);
  });

  it('keeps a cached A2T for the issuer lifetime when the device clock is ahead', async () => {
    const harness = createHarness();
    harness.nowSec.value = NOW_SEC + 2_000;
    mockIssue(harness.fetchMock);

    await harness.session.ensureA2T();
    harness.fetchMock.mockClear();
    harness.nowSec.value = NOW_SEC + 2_000 + 900 - 61;

    const cached = await harness.session.ensureA2T();

    expect(cached).toBe(issuedToken);
    expect(harness.fetchMock).not.toHaveBeenCalled();
  });

  it('surfaces an auth failure without caching it', async () => {
    const harness = createHarness();
    harness.fetchMock.mockResolvedValueOnce(
      jsonResponse(401, { message: 'missing authorization header' }),
    );

    await expect(harness.session.ensureA2T()).rejects.toThrow(
      'A2T request failed with status 401',
    );
    mockIssue(harness.fetchMock);
    await expect(harness.session.ensureA2T()).resolves.toBe(issuedToken);
  });

  it('skips issuance when the auth URL is missing', async () => {
    const getDeviceKey = jest.fn(async () => material());
    const harness = createHarness({
      getIssuerUrl: () => undefined,
      getDeviceKey,
    });

    await expect(harness.session.ensureA2T()).resolves.toBeUndefined();

    expect(harness.fetchMock).not.toHaveBeenCalled();
    expect(getDeviceKey).not.toHaveBeenCalled();
  });

  it('reports a cleared session when clear runs during issuance', async () => {
    let releaseToken: (response: Response) => void = () => undefined;
    const pending = new Promise<Response>((resolve) => {
      releaseToken = resolve;
    });
    const harness = createHarness();
    harness.fetchMock.mockImplementationOnce(() => {
      harness.session.clear();
      return pending;
    });

    const issued = harness.session.ensureA2T();
    releaseToken(jsonResponse(200, issuedBody));
    const error = await issued.catch((caught: unknown) => caught);

    expect(isA2tSessionCleared(error)).toBe(true);
    expect(isA2tSessionCleared(new Error('issuer down'))).toBe(false);
  });
});
