import SecureKeychain from '../../../../core/SecureKeychain';
import { buildPredictDeviceAuthIntegrationHarness } from '../../../../../tests/integration/harnesses/predict-next';

jest.mock('../../../../core/SecureKeychain', () => ({
  setSecureItem: jest.fn(),
  getSecureItem: jest.fn(),
  clearSecureScope: jest.fn(),
  ACCESSIBLE: {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
  },
}));

const jsonResponse = (status: number, body: unknown): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as Response;

const tokenResponse = (accessToken: string, expiresIn = 900): Response =>
  jsonResponse(200, {
    access_token: accessToken,
    expires_in: expiresIn,
    token_type: 'bearer',
  });

describe('PredictDeviceAuthService integration', () => {
  const originalFetch = global.fetch;
  const originalIssuerUrl = process.env.MM_PREDICT_A2T_URL;
  let stored: string | null;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.MM_PREDICT_A2T_URL = 'https://issuer.example';
    stored = null;
    jest
      .mocked(SecureKeychain.getSecureItem)
      .mockImplementation(async () =>
        stored ? { key: 'device-key', value: stored } : null,
      );
    (SecureKeychain.setSecureItem as jest.Mock).mockImplementation(
      async (_key: string, value: string) => {
        stored = value;
        return true;
      },
    );
    jest
      .mocked(SecureKeychain.clearSecureScope)
      .mockImplementation(async () => {
        stored = null;
        return true;
      });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.MM_PREDICT_A2T_URL = originalIssuerUrl;
  });

  it('issues once, reuses the cache, and follows Engine lifecycle boundaries', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(tokenResponse('opaque-a2t'))
      .mockResolvedValueOnce(tokenResponse('replacement-a2t'));
    global.fetch = fetchMock;
    const harness = buildPredictDeviceAuthIntegrationHarness();

    await expect(
      harness.messenger.call('PredictDeviceAuthService:ensureDeviceKey'),
    ).resolves.not.toBeNull();
    await expect(
      Promise.all([
        harness.messenger.call('PredictDeviceAuthService:getA2t'),
        harness.messenger.call('PredictDeviceAuthService:getA2t'),
      ]),
    ).resolves.toEqual(['opaque-a2t', 'opaque-a2t']);
    await expect(
      harness.messenger.call('PredictDeviceAuthService:getA2t'),
    ).resolves.toBe('opaque-a2t');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [tokenUrl, request] = fetchMock.mock.calls[0] as [
      string,
      RequestInit,
    ];
    const body = JSON.parse(String(request.body)) as {
      device_public_key: string;
      salt: string;
    };
    expect(tokenUrl).toBe('https://issuer.example/api/v2/kalshi/token');
    expect(request.method).toBe('POST');
    expect(request.headers).toEqual(
      expect.objectContaining({
        Authorization: 'Bearer access-token',
      }),
    );
    expect(Object.keys(body)).toEqual(['device_public_key', 'salt']);
    expect(body.device_public_key.length).toBeGreaterThan(0);
    expect(body.salt.length).toBeGreaterThan(0);

    harness.authenticationState.isSignedIn = false;
    harness.emit('AuthenticationController:stateChange');

    await expect(
      harness.messenger.call('PredictDeviceAuthService:getA2t'),
    ).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    harness.authenticationState.isSignedIn = true;
    harness.authenticationState.srpSessionData[
      'entropy-source-id'
    ].profile.canonicalProfileId = 'replacement-profile-id';
    harness.emit('AuthenticationController:profileSignIn');

    await expect(
      harness.messenger.call('PredictDeviceAuthService:getA2t'),
    ).resolves.toBe('replacement-a2t');
    expect(fetchMock).toHaveBeenCalledTimes(2);

    harness.featureFlagState.remoteFeatureFlags.predictConfig.enabled = false;
    harness.emit('RemoteFeatureFlagController:stateChange');
    await expect(
      harness.messenger.call('PredictDeviceAuthService:getA2t'),
    ).resolves.toBeUndefined();

    harness.featureFlagState.remoteFeatureFlags.predictConfig.enabled = true;
    harness.keyringState.isUnlocked = false;
    harness.emit('KeyringController:lock');
    await expect(
      harness.messenger.call('PredictDeviceAuthService:ensureDeviceKey'),
    ).resolves.toBeNull();

    await harness.messenger.call('PredictDeviceAuthService:reset');
    expect(SecureKeychain.clearSecureScope).toHaveBeenCalled();
    expect(stored).toBeNull();
  });

  it('fails issuance without caching an issuer error', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(503, { message: 'unavailable' }));
    global.fetch = fetchMock;
    const harness = buildPredictDeviceAuthIntegrationHarness();

    await expect(
      harness.messenger.call('PredictDeviceAuthService:ensureDeviceKey'),
    ).resolves.not.toBeNull();
    await expect(
      harness.messenger.call('PredictDeviceAuthService:getA2t'),
    ).rejects.toThrow('A2T request failed with status 503');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('restores the persisted key across service instances and rotates it on reset', async () => {
    const firstHarness = buildPredictDeviceAuthIntegrationHarness();
    await firstHarness.messenger.call('PredictDeviceAuthService:reset');
    const firstKey = await firstHarness.messenger.call(
      'PredictDeviceAuthService:ensureDeviceKey',
    );
    firstHarness.service.clear();

    const restartedHarness = buildPredictDeviceAuthIntegrationHarness();
    const restoredKey = await restartedHarness.messenger.call(
      'PredictDeviceAuthService:ensureDeviceKey',
    );
    expect(restoredKey).toEqual(firstKey);

    await restartedHarness.messenger.call('PredictDeviceAuthService:reset');
    const rotatedKey = await restartedHarness.messenger.call(
      'PredictDeviceAuthService:ensureDeviceKey',
    );
    expect(rotatedKey?.publicKey).not.toBe(firstKey?.publicKey);
  });

  it('refreshes an A2T inside the profile refresh margin', async () => {
    let now = 1_000;
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(tokenResponse('first-a2t', 61))
      .mockResolvedValueOnce(tokenResponse('second-a2t'));
    global.fetch = fetchMock;
    const harness = buildPredictDeviceAuthIntegrationHarness({
      now: () => now,
      nowMs: () => now * 1_000,
    });

    await expect(
      harness.messenger.call('PredictDeviceAuthService:getA2t'),
    ).resolves.toBe('first-a2t');
    now += 2;
    await expect(
      harness.messenger.call('PredictDeviceAuthService:getA2t'),
    ).resolves.toBe('second-a2t');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each(['lock', 'reset'] as const)(
    'does not let issuance refill the cache after %s',
    async (clearBoundary) => {
      let releaseToken: (response: Response) => void = () => undefined;
      const pendingToken = new Promise<Response>((resolve) => {
        releaseToken = resolve;
      });
      let markTokenStarted: () => void = () => undefined;
      const tokenStarted = new Promise<void>((resolve) => {
        markTokenStarted = resolve;
      });
      const fetchMock = jest
        .fn()
        .mockImplementationOnce(() => {
          markTokenStarted();
          return pendingToken;
        })
        .mockResolvedValueOnce(tokenResponse('fresh-a2t'));
      global.fetch = fetchMock;
      const harness = buildPredictDeviceAuthIntegrationHarness();

      const staleIssuance = harness.messenger.call(
        'PredictDeviceAuthService:getA2t',
      );
      await tokenStarted;
      if (clearBoundary === 'lock') {
        harness.keyringState.isUnlocked = false;
        harness.emit('KeyringController:lock');
        harness.keyringState.isUnlocked = true;
      } else {
        await harness.messenger.call('PredictDeviceAuthService:reset');
      }
      releaseToken(tokenResponse('stale-a2t'));

      await expect(staleIssuance).rejects.toThrow('A2T session was cleared');
      await expect(
        harness.messenger.call('PredictDeviceAuthService:getA2t'),
      ).resolves.toBe('fresh-a2t');
      expect(fetchMock).toHaveBeenCalledTimes(2);
    },
  );
});
