import type { KalshiDevicePublicMaterial } from './kalshiDeviceKey';
import {
  A2tSession,
  a2tPopMessage,
  type A2tIssuedSummary,
  type A2tSessionDependencies,
} from './a2tSession';

const PROFILE_ID = 'profile-1';
const SRP_IDENTIFIER = '0xabc';
const CHALLENGE_ID = '11111111-1111-4111-8111-111111111111';
const NOW_SEC = 1_700_000_000;

const material = (
  publicKey = 'device-public-key',
): KalshiDevicePublicMaterial => ({
  publicRaw: Uint8Array.from([0x04]),
  publicKey,
  saltRaw: Uint8Array.from([1]),
  salt: 'device-salt',
});

const jwtPart = (value: unknown): string =>
  Buffer.from(JSON.stringify(value))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/[=]+$/u, '');

const issuedToken =
  jwtPart({ alg: 'ES256', typ: 'JWT', kid: 'a2t-issuer-1' }) +
  '.' +
  jwtPart({
    iss: 'https://poc-issuer.metamask.local',
    sub: PROFILE_ID,
    aud: 'kalshi-demo-audience-placeholder',
    iat: NOW_SEC,
    exp: NOW_SEC + 900,
    nonce: 'nonce-claim',
  }) +
  '.sig';

const challengeBody = {
  challengeId: CHALLENGE_ID,
  srpMessage: `metamask:nonce-1:${SRP_IDENTIFIER}`,
  expiresIn: 120,
};

const issuedBody = {
  a2t: issuedToken,
  exp: NOW_SEC + 900,
  profileId: PROFILE_ID,
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
  device: KalshiDevicePublicMaterial;
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
    getIssuerUrl: () => 'http://127.0.0.1:3333',
    getAccessToken: async () => 'mm-token',
    getCanonicalProfileId: () => PROFILE_ID,
    getSrpIdentifier: async () => SRP_IDENTIFIER,
    signSrpMessage: async () => 'srp-signature',
    getDeviceKey: async () => key,
    peekDeviceKey: () => key,
    signDeviceProof: () => Uint8Array.from({ length: 64 }, () => 7),
    fetch: fetchMock,
    now: () => nowSec.value,
    nowMs: () => nowMs.value,
    sleep: async () => undefined,
    logIssued: () => undefined,
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
    const logIssued = jest.fn();
    const harness = createHarness({
      getDeviceKey: async () => {
        deviceReads += 1;
        return deviceReads < 2 ? null : key;
      },
      peekDeviceKey: () => null,
      logIssued,
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
    expect(logIssued).toHaveBeenCalledWith(
      expect.objectContaining({
        a2t: issuedToken,
        profileId: PROFILE_ID,
        exp: NOW_SEC + 900,
        expiresInSec: 900,
        header: { alg: 'ES256', typ: 'JWT', kid: 'a2t-issuer-1' },
        claims: {
          iss: 'https://poc-issuer.metamask.local',
          sub: PROFILE_ID,
          aud: 'kalshi-demo-audience-placeholder',
          iat: NOW_SEC,
          exp: NOW_SEC + 900,
          nonce: 'nonce-claim',
        },
      } satisfies A2tIssuedSummary),
    );
  });

  it('signs the SRP message and the device proof for that challenge', async () => {
    const signSrpMessage = jest.fn(async () => 'srp-signature');
    const signDeviceProof = jest.fn(() =>
      Uint8Array.from({ length: 64 }, () => 1),
    );
    const harness = createHarness({ signSrpMessage, signDeviceProof });
    mockIssue(harness.fetchMock);

    await harness.session.ensureA2T();

    expect(signSrpMessage).toHaveBeenCalledWith(
      `metamask:nonce-1:${SRP_IDENTIFIER}`,
    );
    expect(signDeviceProof).toHaveBeenCalledWith(
      a2tPopMessage(CHALLENGE_ID, 'device-public-key', 'device-salt'),
    );
  });

  it('reuses a cached A2T when the device key is loaded again', async () => {
    const key = material();
    let visible: KalshiDevicePublicMaterial | null = key;
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
    mockIssue(harness.fetchMock);

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
    const harness = createHarness({
      getAccessToken: async () => {
        throw new Error('MetaMask access token was not available');
      },
    });

    await expect(harness.session.ensureA2T()).rejects.toThrow(
      'MetaMask access token was not available',
    );
    expect(harness.fetchMock).not.toHaveBeenCalled();
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
});
