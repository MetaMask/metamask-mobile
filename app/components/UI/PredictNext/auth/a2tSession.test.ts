import type { P256DevicePublicMaterial } from './p256DeviceKey';
import { KALSHI_AUTHENTICATION_PROFILE } from './venueAuthProfiles';
import {
  A2tSession,
  isA2tSessionCleared,
  type A2tSessionDependencies,
} from './a2tSession';

const PROFILE_ID = 'profile-1';
const NOW_SEC = 1_700_000_000;
const ISSUER_URL = 'https://authentication.dev-api.cx.metamask.io';

const PUBLIC_RAW = Uint8Array.from({ length: 65 }, (_, index) =>
  index === 0 ? 0x04 : (index % 200) + 1,
);
const SALT_RAW = Uint8Array.from({ length: 16 }, (_, index) => index + 1);
const material = (
  publicKey = 'device-public-key',
): P256DevicePublicMaterial => ({
  publicRaw: PUBLIC_RAW,
  publicKey,
  saltRaw: SALT_RAW,
  salt: 'device-salt',
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
    getIssuerUrl: () => ISSUER_URL,
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

const mockIssue = (fetchMock: jest.MockedFunction<typeof fetch>): void => {
  fetchMock.mockResolvedValueOnce(jsonResponse(200, issuedBody));
};

describe('A2tSession', () => {
  it('issues an A2T after the access token and device key are ready', async () => {
    let deviceReads = 0;
    const key = material();
    const harness = createHarness({
      getDeviceKey: async () => {
        deviceReads += 1;
        return deviceReads < 2 ? null : key;
      },
      peekDeviceKey: () => null,
    });
    mockIssue(harness.fetchMock);

    const a2t = await harness.session.ensureA2T();

    expect(a2t).toBe(issuedToken);
    expect(deviceReads).toBe(2);
    expect(harness.fetchMock).toHaveBeenCalledTimes(1);
    expect(harness.fetchMock).toHaveBeenCalledWith(
      `${ISSUER_URL}${KALSHI_AUTHENTICATION_PROFILE.a2t.tokenPath}`,
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

  it('returns the cached A2T until shortly before expires_in elapses', async () => {
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

  it('shares one token request across concurrent callers', async () => {
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
    let key = material('device-a');
    const harness = createHarness({
      getDeviceKey: async () => key,
      peekDeviceKey: () => key,
    });
    mockIssue(harness.fetchMock);
    mockIssue(harness.fetchMock);

    await harness.session.ensureA2T();
    key = material('device-b');
    await harness.session.ensureA2T();

    expect(harness.fetchMock).toHaveBeenCalledTimes(2);
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

  it('keeps a cached A2T for expires_in when the device clock is ahead', async () => {
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

  it('requests a new A2T when expires_in elapses on a slow device clock', async () => {
    const harness = createHarness();
    harness.nowSec.value = NOW_SEC - 500;
    mockIssue(harness.fetchMock);
    mockIssue(harness.fetchMock);

    await harness.session.ensureA2T();
    harness.nowSec.value = NOW_SEC - 500 + 900 - 60;

    await harness.session.ensureA2T();

    expect(harness.fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([
    'eyJhbGciOiJFUzI1NiJ9.eyJleHAiOjF9.es256-signature',
    'eyJhbGciOiJSUzI1NiJ9.eyJleHAiOjJ9.rs256-signature',
    'not-a-jwt',
  ])('treats issuer token %s as opaque', async (a2t) => {
    const harness = createHarness();
    harness.fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { ...issuedBody, access_token: a2t }),
    );

    await expect(harness.session.ensureA2T()).resolves.toBe(a2t);
  });

  it.each([
    ['an empty body', {}],
    ['a missing access token', { expires_in: 900, token_type: 'bearer' }],
    [
      'an empty access token',
      { access_token: '', expires_in: 900, token_type: 'bearer' },
    ],
    ['a missing lifetime', { access_token: issuedToken, token_type: 'bearer' }],
    [
      'a non-positive lifetime',
      { access_token: issuedToken, expires_in: 0, token_type: 'bearer' },
    ],
    ['a missing token type', { access_token: issuedToken, expires_in: 900 }],
    [
      'a token type other than bearer',
      { access_token: issuedToken, expires_in: 900, token_type: 'Bearer' },
    ],
  ])('rejects %s', async (_label, body) => {
    const harness = createHarness();
    harness.fetchMock.mockResolvedValueOnce(jsonResponse(200, body));

    await expect(harness.session.ensureA2T()).rejects.toThrow(
      'A2T response was malformed',
    );
  });

  it('rejects an empty token response', async () => {
    const harness = createHarness();
    harness.fetchMock.mockResolvedValueOnce(jsonResponse(200, null));

    await expect(harness.session.ensureA2T()).rejects.toThrow(
      'A2T response was empty',
    );
  });

  it('rejects a failed token response', async () => {
    const harness = createHarness();
    harness.fetchMock.mockResolvedValueOnce(
      jsonResponse(401, { message: 'no' }),
    );

    await expect(harness.session.ensureA2T()).rejects.toThrow(
      'A2T request failed with status 401',
    );
    expect(harness.fetchMock).toHaveBeenCalledTimes(1);
  });

  it('skips issuance when the token URL is missing', async () => {
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
    const harness = createHarness();
    harness.fetchMock.mockImplementation(async () => {
      harness.session.clear();
      return jsonResponse(200, issuedBody);
    });

    const error = await harness.session
      .ensureA2T()
      .catch((caught: unknown) => caught);

    expect(isA2tSessionCleared(error)).toBe(true);
    expect(isA2tSessionCleared(new Error('issuer down'))).toBe(false);
  });
});
