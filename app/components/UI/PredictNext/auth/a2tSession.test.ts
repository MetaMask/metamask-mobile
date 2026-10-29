import {
  P256DeviceKeyUnavailableError,
  type P256DevicePublicMaterial,
} from './p256DeviceKey';
import { KALSHI_AUTHENTICATION_PROFILE } from './venueAuthProfiles';
import {
  A2tSession,
  a2tPopMessage,
  isA2tSessionCleared,
  type A2tSessionDependencies,
} from './a2tSession';

const PROFILE_ID = 'profile-1';
const SRP_IDENTIFIER = '0xabc';
const CHALLENGE_ID = '11111111-1111-4111-8111-111111111111';
const NOW_SEC = 1_700_000_000;

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

const challengeBody = {
  challengeId: CHALLENGE_ID,
  srpMessage: `metamask:nonce-1:${SRP_IDENTIFIER}`,
  expiresIn: 120,
};

const issuedBody = {
  a2t: issuedToken,
  expiresIn: 900,
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
    getIssuerUrl: () => 'http://127.0.0.1:3333',
    getAccessToken: async () => 'mm-token',
    getCanonicalProfileId: () => PROFILE_ID,
    getSrpIdentifier: async () => SRP_IDENTIFIER,
    signSrpMessage: async () => 'srp-signature',
    getDeviceKey: async () => key,
    peekDeviceKey: () => key,
    signDeviceProof: async () => Uint8Array.from({ length: 64 }, () => 7),
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
  fetchMock
    .mockResolvedValueOnce(jsonResponse(200, challengeBody))
    .mockResolvedValueOnce(jsonResponse(200, issuedBody));
};

describe('A2tSession', () => {
  it('issues an A2T after the access token, SRP identifier, and device key are ready', async () => {
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
    expect(harness.fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://127.0.0.1:3333/venues/kalshi/a2t/challenge',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer mm-token',
        }),
        body: JSON.stringify({
          srpIdentifier: SRP_IDENTIFIER,
          devicePublicKey: key.publicKey,
          salt: key.salt,
        }),
      }),
    );
    const signature = Uint8Array.from({ length: 64 }, () => 7);
    expect(harness.fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://127.0.0.1:3333/venues/kalshi/a2t',
      expect.objectContaining({
        body: JSON.stringify({
          challengeId: CHALLENGE_ID,
          srpSignature: 'srp-signature',
          devicePop: Buffer.from(signature)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/[=]+$/u, ''),
        }),
      }),
    );
  });

  it('signs the SRP message and the device proof for that challenge', async () => {
    const signSrpMessage = jest.fn(async () => 'srp-signature');
    const signDeviceProof = jest.fn(async () =>
      Uint8Array.from({ length: 64 }, () => 1),
    );
    const harness = createHarness({ signSrpMessage, signDeviceProof });
    mockIssue(harness.fetchMock);

    await harness.session.ensureA2T();

    expect(signSrpMessage).toHaveBeenCalledWith(
      `metamask:nonce-1:${SRP_IDENTIFIER}`,
    );
    expect(signDeviceProof).toHaveBeenCalledWith(
      a2tPopMessage(
        KALSHI_AUTHENTICATION_PROFILE,
        CHALLENGE_ID,
        'device-public-key',
        'device-salt',
      ),
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

  it('returns the cached A2T until shortly before exp', async () => {
    const harness = createHarness();
    mockIssue(harness.fetchMock);

    await harness.session.ensureA2T();
    harness.nowSec.value = NOW_SEC + 900 - 61;
    const cached = await harness.session.ensureA2T();

    expect(cached).toBe(issuedToken);
    expect(harness.fetchMock).toHaveBeenCalledTimes(2);
  });

  it('requests a new A2T inside the refresh window', async () => {
    const harness = createHarness();
    mockIssue(harness.fetchMock);
    mockIssue(harness.fetchMock);

    await harness.session.ensureA2T();
    harness.nowSec.value = NOW_SEC + 900 - 60;
    await harness.session.ensureA2T();

    expect(harness.fetchMock).toHaveBeenCalledTimes(4);
  });

  it('shares one challenge across concurrent callers', async () => {
    let releaseChallenge: (response: Response) => void = () => undefined;
    const challengeGate = new Promise<Response>((resolve) => {
      releaseChallenge = resolve;
    });
    const harness = createHarness();
    harness.fetchMock.mockImplementationOnce(() => challengeGate);
    harness.fetchMock.mockResolvedValueOnce(jsonResponse(200, issuedBody));

    const first = harness.session.ensureA2T();
    const second = harness.session.ensureA2T();
    releaseChallenge(jsonResponse(200, challengeBody));

    await expect(Promise.all([first, second])).resolves.toEqual([
      issuedToken,
      issuedToken,
    ]);
    expect(harness.fetchMock).toHaveBeenCalledTimes(2);
  });

  it('starts a new challenge when the issuer says the challenge expired', async () => {
    const harness = createHarness();
    harness.fetchMock
      .mockResolvedValueOnce(jsonResponse(200, challengeBody))
      .mockResolvedValueOnce(
        jsonResponse(401, { message: 'unknown or expired challenge' }),
      )
      .mockResolvedValueOnce(
        jsonResponse(200, {
          ...challengeBody,
          challengeId: '22222222-2222-4222-8222-222222222222',
        }),
      )
      .mockResolvedValueOnce(jsonResponse(200, issuedBody));

    const a2t = await harness.session.ensureA2T();

    expect(a2t).toBe(issuedToken);
    expect(harness.fetchMock).toHaveBeenCalledTimes(4);
  });

  it('starts a new challenge when the challenge expires while signing', async () => {
    const clock = { value: NOW_SEC };
    let signatures = 0;
    const harness = createHarness({
      now: () => clock.value,
      signSrpMessage: async () => {
        signatures += 1;
        if (signatures === 1) {
          clock.value += 121;
        }
        return 'srp-signature';
      },
    });
    harness.fetchMock
      .mockResolvedValueOnce(jsonResponse(200, challengeBody))
      .mockResolvedValueOnce(jsonResponse(200, challengeBody))
      .mockResolvedValueOnce(jsonResponse(200, issuedBody));

    const a2t = await harness.session.ensureA2T();

    expect(a2t).toBe(issuedToken);
    expect(harness.fetchMock).toHaveBeenCalledTimes(3);
    expect(harness.fetchMock.mock.calls[1]?.[0]).toBe(
      'http://127.0.0.1:3333/venues/kalshi/a2t/challenge',
    );
  });

  it('does not reuse an A2T for a different profile', async () => {
    let profileId = PROFILE_ID;
    const harness = createHarness({
      getCanonicalProfileId: () => profileId,
    });
    mockIssue(harness.fetchMock);
    harness.fetchMock
      .mockResolvedValueOnce(jsonResponse(200, challengeBody))
      .mockResolvedValueOnce(
        jsonResponse(200, { ...issuedBody, profileId: 'profile-2' }),
      );

    await harness.session.ensureA2T();
    profileId = 'profile-2';
    await harness.session.ensureA2T();

    expect(harness.fetchMock).toHaveBeenCalledTimes(4);
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

    expect(harness.fetchMock).toHaveBeenCalledTimes(4);
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

    expect(harness.fetchMock).toHaveBeenCalledTimes(4);
  });

  it('keeps a cached A2T for the issuer lifetime when the device clock is ahead of exp', async () => {
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

  it('requests a new A2T when the issuer lifetime elapses on a slow device clock', async () => {
    const harness = createHarness();
    harness.nowSec.value = NOW_SEC - 500;
    mockIssue(harness.fetchMock);
    mockIssue(harness.fetchMock);

    await harness.session.ensureA2T();
    harness.nowSec.value = NOW_SEC - 500 + 900 - 60;

    await harness.session.ensureA2T();

    expect(harness.fetchMock).toHaveBeenCalledTimes(4);
  });

  it.each([
    'eyJhbGciOiJFUzI1NiJ9.eyJleHAiOjF9.es256-signature',
    'eyJhbGciOiJSUzI1NiJ9.eyJleHAiOjJ9.rs256-signature',
    'not-a-jwt',
  ])('treats issuer token %s as opaque', async (a2t) => {
    const harness = createHarness();
    harness.fetchMock
      .mockResolvedValueOnce(jsonResponse(200, challengeBody))
      .mockResolvedValueOnce(jsonResponse(200, { ...issuedBody, a2t }));

    await expect(harness.session.ensureA2T()).resolves.toBe(a2t);
  });

  it('prefers expiresIn when temporary exp is also present', async () => {
    const harness = createHarness();
    harness.fetchMock
      .mockResolvedValueOnce(jsonResponse(200, challengeBody))
      .mockResolvedValueOnce(
        jsonResponse(200, {
          a2t: issuedToken,
          expiresIn: 900,
          exp: NOW_SEC + 1,
        }),
      );

    await harness.session.ensureA2T();
    harness.nowSec.value += 2;

    await expect(harness.session.ensureA2T()).resolves.toBe(issuedToken);
    expect(harness.fetchMock).toHaveBeenCalledTimes(2);
  });

  it('accepts the temporary absolute expiry response', async () => {
    const harness = createHarness();
    harness.fetchMock
      .mockResolvedValueOnce(jsonResponse(200, challengeBody))
      .mockResolvedValueOnce(
        jsonResponse(200, {
          a2t: issuedToken,
          exp: NOW_SEC + 900,
          profileId: PROFILE_ID,
        }),
      );

    await expect(harness.session.ensureA2T()).resolves.toBe(issuedToken);
  });

  it('reloads the device key once when signing finds it missing', async () => {
    let signs = 0;
    const harness = createHarness({
      signDeviceProof: async () => {
        signs += 1;
        if (signs === 1) {
          throw new P256DeviceKeyUnavailableError();
        }
        return Uint8Array.from({ length: 64 }, () => 7);
      },
    });
    mockIssue(harness.fetchMock);

    const a2t = await harness.session.ensureA2T();

    expect(a2t).toBe(issuedToken);
    expect(signs).toBe(2);
    expect(harness.fetchMock).toHaveBeenCalledTimes(2);
  });

  it('stops issuance when the device key is still missing after a reload', async () => {
    let reads = 0;
    const harness = createHarness({
      getDeviceKey: async () => {
        reads += 1;
        return reads < 3 ? material() : null;
      },
      peekDeviceKey: () => material(),
      signDeviceProof: async () => {
        throw new P256DeviceKeyUnavailableError();
      },
    });
    harness.fetchMock.mockResolvedValueOnce(jsonResponse(200, challengeBody));

    await expect(harness.session.ensureA2T()).rejects.toThrow(
      'P-256 device key is not available',
    );

    expect(reads).toBe(3);
    expect(harness.fetchMock).toHaveBeenCalledTimes(1);
  });

  it('stops issuance when a reload returns a different device key', async () => {
    let reads = 0;
    const harness = createHarness({
      getDeviceKey: async () => {
        reads += 1;
        return reads < 3 ? material('device-a') : material('device-b');
      },
      peekDeviceKey: () => material('device-a'),
      signDeviceProof: async () => {
        throw new P256DeviceKeyUnavailableError();
      },
    });
    harness.fetchMock.mockResolvedValueOnce(jsonResponse(200, challengeBody));

    await expect(harness.session.ensureA2T()).rejects.toThrow(
      'P-256 device key is not available',
    );

    expect(harness.fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not reload the device key when signing fails for another reason', async () => {
    let reads = 0;
    const harness = createHarness({
      getDeviceKey: async () => {
        reads += 1;
        return material();
      },
      signDeviceProof: async () => {
        throw new Error('sign failed');
      },
    });
    harness.fetchMock.mockResolvedValueOnce(jsonResponse(200, challengeBody));

    await expect(harness.session.ensureA2T()).rejects.toThrow('sign failed');

    expect(reads).toBe(2);
  });

  it('skips issuance when the issuer URL is missing', async () => {
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
    const signSrpMessage = jest.fn(async () => 'srp-signature');
    const harness = createHarness({ signSrpMessage });
    signSrpMessage.mockImplementation(async () => {
      harness.session.clear();
      return 'srp-signature';
    });
    harness.fetchMock.mockResolvedValueOnce(jsonResponse(200, challengeBody));

    const error = await harness.session
      .ensureA2T()
      .catch((caught: unknown) => caught);

    expect(isA2tSessionCleared(error)).toBe(true);
    expect(isA2tSessionCleared(new Error('issuer down'))).toBe(false);
  });
});
