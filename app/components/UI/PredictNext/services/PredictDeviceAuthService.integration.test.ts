import { p256 } from '@noble/curves/nist';
import { sha256 } from '@noble/hashes/sha2';

import SecureKeychain from '../../../../core/SecureKeychain';
import { buildPredictDeviceAuthIntegrationHarness } from '../../../../../tests/integration/harnesses/predict-next';
import { loadVenueProfile } from '../auth/venueSigningProfiles';
import { deviceSigningBase } from '../auth/signing/deviceRequestSigner';
import { createP256DeviceKey } from '../auth/p256DeviceKey';
import { KALSHI_AUTHENTICATION_PROFILE } from '../auth/venueAuthProfiles';
import type { signP256 } from '../auth/p256QuickCrypto';

const deviceCrypto: { signP256: typeof signP256 } = jest.requireActual(
  '../auth/p256QuickCrypto',
);

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

// The mobile TypeScript library target is ES2022, before Promise.withResolvers.
const deferred = <T>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

describe('PredictDeviceAuthService integration', () => {
  const originalFetch = global.fetch;
  const originalIssuerUrl = process.env.MM_PREDICT_A2T_URL;
  let stored: string | null;
  let secureItems: Map<string, string>;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.MM_PREDICT_A2T_URL = 'https://issuer.example';
    stored = null;
    secureItems = new Map();
    jest
      .mocked(SecureKeychain.getSecureItem)
      .mockImplementation(async (scope) => {
        const value = secureItems.get(scope.service ?? '');
        return value ? { key: 'device-key', value } : null;
      });
    (SecureKeychain.setSecureItem as jest.Mock).mockImplementation(
      async (_key: string, value: string, scope: { service: string }) => {
        secureItems.set(scope.service, value);
        if (scope.service.includes('.device-key.')) {
          stored = value;
        }
        return true;
      },
    );
    jest
      .mocked(SecureKeychain.clearSecureScope)
      .mockImplementation(async (scope) => {
        secureItems.delete(scope.service ?? '');
        if (scope.service?.includes('.device-key.')) {
          stored = null;
        }
        return true;
      });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.MM_PREDICT_A2T_URL = originalIssuerUrl;
    jest.restoreAllMocks();
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

  it('cryptographically binds a reconciliation read to the server challenge', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(tokenResponse('opaque-a2t'));
    const harness = buildPredictDeviceAuthIntegrationHarness();
    const proposed = {
      method: 'GET' as const,
      path: '/trade-api/v2/portfolio/orders',
      query: 'limit=200&ticker=MKT-1',
      requestId: 'a1b2c3d4-1111-4222-8333-444455556666',
    };
    const profile = await loadVenueProfile();
    if (!profile) {
      throw new Error('bundled signing profile unavailable');
    }

    const signed = await harness.messenger.call(
      'PredictDeviceAuthService:signRead',
      proposed,
    );
    const envelope = JSON.parse(
      Buffer.from(signed?.value ?? '', 'base64url').toString('utf8'),
    );
    const signature = envelope.signatures[0];
    const base = deviceSigningBase({
      profile,
      request: {
        name: 'proposal',
        class: 'read',
        method: proposed.method,
        path: proposed.path,
        query: proposed.query,
        body: '',
      },
      context: envelope.credential,
      requestId: proposed.requestId,
      signatureParams: signature.signatureInput.slice('kalshi='.length),
    });
    const raw = Buffer.from(
      signature.signature.slice('kalshi=:'.length, -1),
      'base64',
    );

    expect(signature.requestId).toBe(proposed.requestId);
    expect(signature.signatureInput).toContain(`nonce="${proposed.requestId}"`);
    expect(
      p256.verify(
        raw,
        sha256(new TextEncoder().encode(base)),
        Buffer.from(envelope.credential.deviceKey, 'base64url'),
      ),
    ).toBe(true);
    expect(
      p256.verify(
        raw,
        sha256(
          new TextEncoder().encode(
            base.replace(
              proposed.requestId,
              'b1b2c3d4-1111-4222-8333-444455556666',
            ),
          ),
        ),
        Buffer.from(envelope.credential.deviceKey, 'base64url'),
      ),
    ).toBe(false);
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

  it.each(['operation', 'read'] as const)(
    'does not return a %s envelope after a lock and unlock during native signing',
    async (lane) => {
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce(tokenResponse('opaque-a2t'));
      const harness = buildPredictDeviceAuthIntegrationHarness();
      await harness.messenger.call('PredictDeviceAuthService:getA2t');
      const cryptoStarted = deferred<void>();
      const cryptoFinished = deferred<void>();
      const sign = deviceCrypto.signP256;
      const signer = jest
        .spyOn(deviceCrypto, 'signP256')
        .mockImplementationOnce(async (key, bytes) => {
          const signature = await sign(key, bytes);
          cryptoStarted.resolve();
          await cryptoFinished.promise;
          return signature;
        });
      const pending =
        lane === 'operation'
          ? harness.messenger.call(
              'PredictDeviceAuthService:signOperation',
              'order.place',
              {
                inputs: {
                  marketId: 'MKT-1',
                  idempotencyKey: 'a1b2c3d4-1111-4222-8333-444455556666',
                  action: 'buy',
                  outcome: 'yes',
                  amountCents: 5000,
                },
                values: { count: '10.00', price: '0.5000' },
                confirmed: true,
              },
            )
          : harness.messenger.call('PredictDeviceAuthService:signRead', {
              method: 'GET',
              path: '/trade-api/v2/portfolio/orders',
              query: '',
            });
      await cryptoStarted.promise;
      harness.keyringState.isUnlocked = false;
      harness.emit('KeyringController:lock');
      harness.keyringState.isUnlocked = true;
      cryptoFinished.resolve();

      await expect(pending).resolves.toBeUndefined();
      expect(signer).toHaveBeenCalledTimes(1);
    },
  );

  it('fences a real keychain load that completes after reset', async () => {
    const harness = buildPredictDeviceAuthIntegrationHarness();
    await harness.messenger.call('PredictDeviceAuthService:reset');
    const first = await harness.messenger.call(
      'PredictDeviceAuthService:ensureDeviceKey',
    );
    const persisted = stored;
    harness.service.clear();
    const started = deferred<void>();
    const loaded = deferred<{ key: string; value: string } | null>();
    jest.mocked(SecureKeychain.getSecureItem).mockImplementationOnce(() => {
      started.resolve();
      return loaded.promise;
    });
    const pending = harness.messenger.call(
      'PredictDeviceAuthService:ensureDeviceKey',
    );
    await started.promise;
    const reset = harness.messenger.call('PredictDeviceAuthService:reset');
    const key = createP256DeviceKey(KALSHI_AUTHENTICATION_PROFILE.deviceKey);
    expect(key.get()).toBeNull();
    await expect(
      harness.messenger.call('PredictDeviceAuthService:ensureDeviceKey'),
    ).resolves.toBeNull();
    loaded.resolve(persisted ? { key: 'device-key', value: persisted } : null);

    await expect(pending).resolves.toBeNull();
    await reset;
    expect(key.get()).toBeNull();
    expect(stored).toBeNull();
    const replacement = await harness.messenger.call(
      'PredictDeviceAuthService:ensureDeviceKey',
    );
    expect(replacement?.publicKey).not.toBe(first?.publicKey);
  });
});
