import { p256 } from '@noble/curves/nist';
import { sha256 } from '@noble/hashes/sha2';

import SecureKeychain from '../../../../core/SecureKeychain';
import { buildPredictDeviceAuthIntegrationHarness } from '../../../../../tests/integration/harnesses/predict-next';
import { loadVenueProfile } from '../auth/venueSigningProfiles';
import { deviceSigningBase } from '../auth/signing/deviceRequestSigner';

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

describe('PredictDeviceAuthService integration', () => {
  const originalFetch = global.fetch;
  const originalIssuerUrl = process.env.MM_A2T_URL;
  let stored: string | null;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.MM_A2T_URL = 'https://issuer.example';
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
    process.env.MM_A2T_URL = originalIssuerUrl;
  });

  it('issues once, reuses the cache, and follows Engine lifecycle boundaries', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(200, {
          challengeId: '11111111-1111-4111-8111-111111111111',
          srpMessage: 'metamask:nonce:0xabc',
          expiresIn: 120,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse(200, { a2t: 'opaque-a2t', expiresIn: 900 }),
      )
      .mockResolvedValueOnce(
        jsonResponse(200, {
          challengeId: '22222222-2222-4222-8222-222222222222',
          srpMessage: 'metamask:nonce-2:0xabc',
          expiresIn: 120,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse(200, { a2t: 'replacement-a2t', expiresIn: 900 }),
      );
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
    expect(fetchMock).toHaveBeenCalledTimes(2);

    harness.authenticationState.isSignedIn = false;
    harness.emit('AuthenticationController:stateChange');

    await expect(
      harness.messenger.call('PredictDeviceAuthService:getA2t'),
    ).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);

    harness.authenticationState.isSignedIn = true;
    harness.authenticationState.srpSessionData[
      'entropy-source-id'
    ].profile.canonicalProfileId = 'replacement-profile-id';
    harness.emit('AuthenticationController:profileSignIn');

    await expect(
      harness.messenger.call('PredictDeviceAuthService:getA2t'),
    ).resolves.toBe('replacement-a2t');
    expect(fetchMock).toHaveBeenCalledTimes(4);

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
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(200, {
          challengeId: '11111111-1111-4111-8111-111111111111',
          srpMessage: 'metamask:nonce:0xabc',
          expiresIn: 120,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse(200, { a2t: 'opaque-a2t', expiresIn: 900 }),
      );
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
      .mockResolvedValueOnce(
        jsonResponse(200, {
          challengeId: '11111111-1111-4111-8111-111111111111',
          srpMessage: 'metamask:nonce:0xabc',
          expiresIn: 120,
        }),
      )
      .mockResolvedValueOnce(jsonResponse(503, { message: 'unavailable' }));
    global.fetch = fetchMock;
    const harness = buildPredictDeviceAuthIntegrationHarness();

    await expect(
      harness.messenger.call('PredictDeviceAuthService:ensureDeviceKey'),
    ).resolves.not.toBeNull();
    await expect(
      harness.messenger.call('PredictDeviceAuthService:getA2t'),
    ).rejects.toThrow('A2T request failed with status 503');
    expect(fetchMock).toHaveBeenCalledTimes(2);
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
      .mockResolvedValueOnce(
        jsonResponse(200, {
          challengeId: '11111111-1111-4111-8111-111111111111',
          srpMessage: 'metamask:first:0xabc',
          expiresIn: 120,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse(200, { a2t: 'first-a2t', expiresIn: 61 }),
      )
      .mockResolvedValueOnce(
        jsonResponse(200, {
          challengeId: '22222222-2222-4222-8222-222222222222',
          srpMessage: 'metamask:second:0xabc',
          expiresIn: 120,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse(200, { a2t: 'second-a2t', expiresIn: 900 }),
      );
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
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it.each(['lock', 'reset'] as const)(
    'does not let issuance refill the cache after %s',
    async (clearBoundary) => {
      let releaseChallenge: (response: Response) => void = () => undefined;
      const pendingChallenge = new Promise<Response>((resolve) => {
        releaseChallenge = resolve;
      });
      let markChallengeStarted: () => void = () => undefined;
      const challengeStarted = new Promise<void>((resolve) => {
        markChallengeStarted = resolve;
      });
      const fetchMock = jest
        .fn()
        .mockImplementationOnce(() => {
          markChallengeStarted();
          return pendingChallenge;
        })
        .mockResolvedValueOnce(
          jsonResponse(200, {
            challengeId: '22222222-2222-4222-8222-222222222222',
            srpMessage: 'metamask:fresh:0xabc',
            expiresIn: 120,
          }),
        )
        .mockResolvedValueOnce(
          jsonResponse(200, { a2t: 'fresh-a2t', expiresIn: 900 }),
        );
      global.fetch = fetchMock;
      const harness = buildPredictDeviceAuthIntegrationHarness();

      const staleIssuance = harness.messenger.call(
        'PredictDeviceAuthService:getA2t',
      );
      await challengeStarted;
      if (clearBoundary === 'lock') {
        harness.keyringState.isUnlocked = false;
        harness.emit('KeyringController:lock');
        harness.keyringState.isUnlocked = true;
      } else {
        await harness.messenger.call('PredictDeviceAuthService:reset');
      }
      releaseChallenge(
        jsonResponse(200, {
          challengeId: '11111111-1111-4111-8111-111111111111',
          srpMessage: 'metamask:stale:0xabc',
          expiresIn: 120,
        }),
      );

      await expect(staleIssuance).rejects.toThrow('A2T session was cleared');
      await expect(
        harness.messenger.call('PredictDeviceAuthService:getA2t'),
      ).resolves.toBe('fresh-a2t');
      expect(fetchMock).toHaveBeenCalledTimes(3);
    },
  );
});
