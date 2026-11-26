import {
  TEST_VENUE_PROFILE_RAW,
  TEST_VENUE_REVOKED_RAW,
} from '../../../../../tests/fixtures/predict/venueProfiles';
import {
  VENUE_PROFILE_ID,
  VENUE_PROFILE_ACQUISITION_TIMEOUT_MS,
  VenueProfileResolver,
  venueProfileSha256,
} from './venueSigningProfiles';
import type { RemoteVenueProfileClient } from './RemoteVenueProfileClient';
import {
  VenueProfileStore,
  venueProfileCacheKey,
  type VenueProfileStorage,
} from './venueProfileStore';

// The app's ES2022 library target does not include Promise.withResolvers.
// Timer-driven request doubles below run only while Jest fake timers are active.
const profileWith = (version: number, patch: object = {}): string =>
  JSON.stringify({ ...JSON.parse(TEST_VENUE_PROFILE_RAW), version, ...patch });
const revoked = (versions: number[] = []) =>
  JSON.stringify({ id: VENUE_PROFILE_ID, revokedVersions: versions });
type MemoryStorage = VenueProfileStorage & { value: string | null };
const memoryStorage = (): MemoryStorage => ({
  value: null,
  async getItem() {
    return this.value;
  },
  async setItem(_key, value) {
    this.value = value;
  },
  async removeItem() {
    this.value = null;
  },
});
const cachedStorage = (version = 1): MemoryStorage => ({
  ...memoryStorage(),
  value: JSON.stringify({
    targetVersion: version,
    revokedRaw: TEST_VENUE_REVOKED_RAW,
    revokedEtag: '"cached"',
    profiles: { [version]: profileWith(version) },
    floor: version,
  }),
});

class FakeClient {
  result:
    | { status: 'modified'; raw: string; etag?: string }
    | { status: 'not-modified'; etag?: string } = {
    status: 'modified',
    raw: TEST_VENUE_REVOKED_RAW,
    etag: '"revoked"',
  };
  readonly bodies = new Map<number, string>([[1, TEST_VENUE_PROFILE_RAW]]);
  readonly fetched: number[] = [];
  readonly fetchRevoked = jest.fn(async () => this.result);
  readonly fetchProfile = jest.fn(
    async ({ version }: { version: number; signal?: AbortSignal }) => {
      this.fetched.push(version);
      const raw = this.bodies.get(version);
      if (raw === undefined) {
        throw new Error('not found');
      }
      return raw;
    },
  );
}

type GetSigningProfile = (options?: {
  signal?: AbortSignal;
}) => Promise<{ id: string; version: number }>;

const build = (
  options: {
    storage?: MemoryStorage;
    client?: FakeClient;
    target?: number;
    now?: () => number;
    environment?: 'dev' | 'uat';
    registryUrl?: string;
    getSigningProfile?: GetSigningProfile;
  } = {},
) => {
  const storage = options.storage ?? memoryStorage();
  const store = new VenueProfileStore({
    environment: options.environment ?? 'dev',
    profileId: VENUE_PROFILE_ID,
    registryUrl: options.registryUrl,
    storage,
  });
  const client = options.client ?? new FakeClient();
  const getSigningProfile = jest.fn(
    options.getSigningProfile ??
      (async () => ({
        id: VENUE_PROFILE_ID,
        version: options.target ?? 1,
      })),
  );
  const log = jest.fn();
  const resolver = new VenueProfileResolver({
    client: client as unknown as RemoteVenueProfileClient,
    store,
    getSigningProfile,
    log,
    now: options.now,
  });
  return { resolver, client, storage, store, getSigningProfile, log };
};

describe('VenueProfileResolver', () => {
  it('reports snapshot changes, including revocation, to refresh callers', async () => {
    const { resolver, client } = build();
    await expect(resolver.refresh()).resolves.toBe(true);
    await expect(resolver.refresh()).resolves.toBe(false);
    client.result = { status: 'modified', raw: revoked([1]) };
    await expect(resolver.refreshAfterRefusal()).resolves.toBe(true);
    await expect(resolver.refreshAfterRefusal()).resolves.toBe(false);
  });

  it('logs an unavailable target once until the target changes', async () => {
    const { resolver, getSigningProfile, log } = build({ target: 4 });
    await resolver.refresh();
    await resolver.resolve();
    await resolver.resolve();
    expect(
      log.mock.calls.filter(
        ([message]) => message === 'PredictNext: venue profile unavailable',
      ),
    ).toHaveLength(1);
    getSigningProfile.mockResolvedValue({ id: VENUE_PROFILE_ID, version: 5 });
    await resolver.refresh();
    expect(
      log.mock.calls.filter(
        ([message]) => message === 'PredictNext: venue profile unavailable',
      ),
    ).toHaveLength(2);
  });

  it('returns no profile from a fresh cache without making network requests', async () => {
    const { resolver, client, getSigningProfile } = build();

    const snapshot = await resolver.resolve();

    expect(snapshot).toBeUndefined();
    expect(getSigningProfile).not.toHaveBeenCalled();
    expect(client.fetchRevoked).not.toHaveBeenCalled();
    expect(client.fetchProfile).not.toHaveBeenCalled();
  });

  it('returns immediately with no profile when remote clients are unavailable', async () => {
    const resolver = new VenueProfileResolver({ log: jest.fn() });

    const snapshot = await resolver.ensure();

    expect(snapshot).toBeUndefined();
  });

  it('downloads the exact v1 bytes on first acquisition', async () => {
    const { resolver, client, storage, getSigningProfile } = build();

    const snapshot = await resolver.ensure();

    expect(snapshot).toMatchObject({
      version: 1,
      sha256: venueProfileSha256(TEST_VENUE_PROFILE_RAW),
    });
    expect(getSigningProfile).toHaveBeenCalledTimes(1);
    expect(client.fetchRevoked).toHaveBeenCalledTimes(1);
    expect(client.fetched).toEqual([1]);
    expect(JSON.parse(String(storage.value))).toMatchObject({
      targetVersion: 1,
      revokedRaw: TEST_VENUE_REVOKED_RAW,
      profiles: { 1: TEST_VENUE_PROFILE_RAW },
      floor: 0,
    });
  });

  it('uses a valid downloaded cache before attempting any acquisition', async () => {
    const { resolver, client, getSigningProfile } = build({
      storage: cachedStorage(4),
    });

    const snapshot = await resolver.ensure();

    expect(snapshot).toMatchObject({ version: 4 });
    expect(getSigningProfile).not.toHaveBeenCalled();
    expect(client.fetchRevoked).not.toHaveBeenCalled();
  });

  it.each(['target', 'revocations', 'profile'] as const)(
    'cannot sign on a fresh install when the %s request fails',
    async (stage) => {
      const { resolver, client, getSigningProfile } = build();
      if (stage === 'target') {
        getSigningProfile.mockRejectedValue(new Error('offline'));
      } else if (stage === 'revocations') {
        client.fetchRevoked.mockRejectedValue(new Error('offline'));
      } else {
        client.bodies.clear();
      }

      const snapshot = await resolver.ensure();

      expect(snapshot).toBeUndefined();
      if (stage !== 'profile') {
        expect(client.fetchProfile).not.toHaveBeenCalled();
      }
    },
  );

  it.each([
    { status: 'modified' as const, raw: 'not JSON' },
    { status: 'not-modified' as const, etag: '"unadopted"' },
  ])(
    'requires a valid revocation body before a cold download: %j',
    async (result) => {
      const { resolver, client, storage } = build();
      client.result = result;

      const snapshot = await resolver.ensure();

      expect(snapshot).toBeUndefined();
      expect(client.fetchProfile).not.toHaveBeenCalled();
      expect(JSON.parse(String(storage.value)).revokedEtag).toBeUndefined();
    },
  );

  it('downloads a newer target without raising the persisted floor', async () => {
    const { resolver, client, storage, getSigningProfile } = build({
      target: 4,
    });
    client.bodies.set(4, profileWith(4));

    await resolver.refresh();

    expect(getSigningProfile).toHaveBeenCalledTimes(1);
    await expect(resolver.resolve()).resolves.toMatchObject({
      version: 4,
      sha256: venueProfileSha256(profileWith(4)),
    });
    expect(JSON.parse(String(storage.value))).toMatchObject({
      targetVersion: 4,
      floor: 0,
      revokedRaw: TEST_VENUE_REVOKED_RAW,
      revokedEtag: '"revoked"',
    });
  });

  it('keeps the last downloaded version until an unpublished target can be fetched', async () => {
    const { resolver, client } = build({ storage: cachedStorage(), target: 4 });

    await resolver.refresh();

    await expect(resolver.resolve()).resolves.toMatchObject({ version: 1 });
    expect(client.fetched).toEqual([4]);
    client.result = { status: 'not-modified' };
    client.bodies.set(4, profileWith(4));

    await resolver.refresh();
    await resolver.refresh();

    await expect(resolver.resolve()).resolves.toMatchObject({ version: 4 });
    expect(client.fetched).toEqual([4, 4]);
    expect(client.fetchRevoked).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: VENUE_PROFILE_ID, etag: '"revoked"' }),
    );
  });

  it('does not fetch a revoked target', async () => {
    const { resolver, client } = build({ storage: cachedStorage(), target: 4 });
    client.result = { status: 'modified', raw: revoked([4]) };
    client.bodies.set(4, profileWith(4));

    await resolver.refresh();

    await expect(resolver.resolve()).resolves.toMatchObject({ version: 1 });
    expect(client.fetched).toEqual([]);
  });

  it('becomes unavailable when its only downloaded profile is revoked', async () => {
    const { resolver, client, storage } = build({ storage: cachedStorage() });
    client.result = { status: 'modified', raw: revoked([1]) };

    await resolver.refresh();

    await expect(resolver.resolve()).resolves.toBeUndefined();
    expect(JSON.parse(String(storage.value)).floor).toBe(1);
  });

  it('ignores a target below the persisted floor', async () => {
    const { resolver, log, storage } = build({
      storage: cachedStorage(4),
      target: 1,
    });

    await resolver.refresh();

    await expect(resolver.resolve()).resolves.toMatchObject({ version: 4 });
    expect(log).toHaveBeenCalledWith(
      'PredictNext: venue profile refused',
      'profile_below_floor',
    );
    expect(JSON.parse(String(storage.value))).toMatchObject({
      targetVersion: 4,
      floor: 4,
    });
  });

  it('shares one refresh between concurrent cold acquisitions and refresh callers', async () => {
    const { resolver, client, getSigningProfile } = build();

    const snapshots = await Promise.all([
      resolver.ensure(),
      resolver.ensure(),
      resolver.refresh(),
    ]);

    expect(snapshots.slice(0, 2)).toEqual([
      expect.objectContaining({ version: 1 }),
      expect.objectContaining({ version: 1 }),
    ]);
    expect(getSigningProfile).toHaveBeenCalledTimes(1);
    expect(client.fetchRevoked).toHaveBeenCalledTimes(1);
    expect(client.fetched).toEqual([1]);
  });

  it('preserves the official downloaded cache during target and registry outages', async () => {
    const storage = cachedStorage(4);
    const { resolver, client, getSigningProfile } = build({ storage });
    getSigningProfile.mockRejectedValue(new Error('offline'));
    client.fetchRevoked.mockRejectedValue(new Error('offline'));

    await resolver.refresh();

    await expect(resolver.resolve()).resolves.toMatchObject({ version: 4 });
    expect(JSON.parse(String(storage.value))).toMatchObject({
      targetVersion: 4,
      revokedRaw: TEST_VENUE_REVOKED_RAW,
      revokedEtag: '"cached"',
      profiles: { 4: profileWith(4) },
      floor: 4,
    });
  });

  it('keeps the last used cached version across restart when the new target is missing', async () => {
    const storage = cachedStorage(4);
    storage.value = JSON.stringify({
      ...JSON.parse(String(storage.value)),
      targetVersion: 5,
    });
    const { resolver } = build({ storage });

    const snapshot = await resolver.resolve();

    expect(snapshot).toMatchObject({ version: 4 });
  });

  it('does not lower the floor when no eligible profile remains', async () => {
    const storage = cachedStorage(4);
    storage.value = JSON.stringify({
      ...JSON.parse(String(storage.value)),
      revokedRaw: revoked([4]),
      profiles: {},
    });
    const { resolver } = build({ storage, target: 1 });

    await resolver.refresh();

    await expect(resolver.resolve()).resolves.toBeUndefined();
    expect(JSON.parse(String(storage.value)).floor).toBe(4);
  });

  it.each([{ minDsl: 'dsl-2' }, { id: 'other' }, { version: 5 }])(
    'rejects incompatible downloaded profiles without a local fallback: %j',
    async (patch) => {
      const { resolver, client } = build({ target: 4 });
      client.bodies.set(4, profileWith(4, patch));

      const snapshot = await resolver.ensure();

      expect(snapshot).toBeUndefined();
    },
  );

  it.each(['not JSON', profileWith(3), profileWith(4, { minDsl: 'dsl-2' })])(
    'refetches corrupt cached bytes at the same floor: %s',
    async (raw) => {
      const storage = cachedStorage(4);
      storage.value = JSON.stringify({
        ...JSON.parse(String(storage.value)),
        profiles: { 4: raw },
      });
      const { resolver, client } = build({ storage, target: 4 });
      client.bodies.set(4, profileWith(4));

      await expect(resolver.resolve()).resolves.toBeUndefined();
      const snapshot = await resolver.ensure();

      expect(snapshot).toMatchObject({ version: 4 });
      expect(client.fetched).toEqual([4]);
      expect(JSON.parse(String(storage.value)).floor).toBe(4);
    },
  );

  it('preserves revocations and ETag on malformed or regressing responses', async () => {
    const { resolver, client, storage } = build({ storage: cachedStorage() });
    client.result = { status: 'modified', raw: revoked([1]), etag: '"grown"' };
    await resolver.refresh();

    for (const raw of ['not JSON', revoked()]) {
      client.result = { status: 'modified', raw, etag: '"rejected"' };
      await resolver.refresh();

      await expect(resolver.resolve()).resolves.toBeUndefined();
      expect(JSON.parse(String(storage.value))).toMatchObject({
        revokedRaw: revoked([1]),
        revokedEtag: '"grown"',
      });
    }
  });

  it('drops a cached ETag when the cached revocation list cannot be parsed', async () => {
    const storage = cachedStorage();
    storage.value = JSON.stringify({
      ...JSON.parse(String(storage.value)),
      revokedRaw: 'not JSON',
      revokedEtag: '"stale"',
    });
    const { resolver, client } = build({ storage });

    await resolver.refresh();

    expect(client.fetchRevoked).toHaveBeenCalledWith(
      expect.objectContaining({ id: VENUE_PROFILE_ID, etag: undefined }),
    );
    await expect(resolver.resolve()).resolves.toMatchObject({ version: 1 });
    expect(JSON.parse(String(storage.value)).revokedEtag).toBe('"revoked"');
  });

  it('isolates cluster cache keys while each cluster downloads its target', async () => {
    const dev = build({ target: 2, environment: 'dev' });
    dev.client.bodies.set(2, profileWith(2));
    const uat = build({ environment: 'uat' });

    await Promise.all([dev.resolver.ensure(), uat.resolver.ensure()]);

    await expect(dev.resolver.resolve()).resolves.toMatchObject({ version: 2 });
    await expect(uat.resolver.resolve()).resolves.toMatchObject({ version: 1 });
    expect(venueProfileCacheKey('dev', VENUE_PROFILE_ID)).not.toBe(
      venueProfileCacheKey('uat', VENUE_PROFILE_ID),
    );
  });

  it('keeps an override memory-only without poisoning the official cache', async () => {
    const storage = cachedStorage();
    const officialBytes = storage.value;
    const override = build({
      storage,
      target: 4,
      registryUrl: 'http://localhost:8787/profiles',
    });
    override.client.bodies.set(4, profileWith(4));
    override.client.result = { status: 'modified', raw: revoked([1]) };

    await expect(override.resolver.resolve()).resolves.toBeUndefined();
    await override.resolver.ensure();
    await override.store.clear();

    await expect(override.resolver.resolve()).resolves.toMatchObject({
      version: 4,
    });
    expect(storage.value).toBe(officialBytes);
    const official = build({ storage });
    await expect(official.resolver.resolve()).resolves.toMatchObject({
      version: 1,
    });
  });

  it('keeps captured bytes eligible after a refresh changes only the target', async () => {
    const { resolver } = build({ storage: cachedStorage(), target: 4 });
    const snapshot = await resolver.resolve();
    if (!snapshot) {
      throw new Error('Expected cached profile');
    }

    await resolver.refresh();

    expect(snapshot).toBeDefined();
    expect(resolver.isSnapshotEligible(snapshot)).toBe(true);
    expect(resolver.isSnapshotEligible({ ...snapshot, sha256: 'other' })).toBe(
      false,
    );
  });

  it('rejects a captured snapshot after its version is revoked', async () => {
    const { resolver, client } = build({ storage: cachedStorage() });
    const snapshot = await resolver.resolve();
    if (!snapshot) {
      throw new Error('Expected cached profile');
    }
    client.result = { status: 'modified', raw: revoked([1]) };

    await resolver.refresh();

    expect(resolver.isSnapshotEligible(snapshot)).toBe(false);
  });

  it('rejects a captured snapshot after a newer version raises the floor', async () => {
    const { resolver, client } = build({ storage: cachedStorage(), target: 4 });
    const snapshot = await resolver.resolve();
    if (!snapshot) {
      throw new Error('Expected cached profile');
    }
    client.bodies.set(4, profileWith(4));

    await resolver.refresh();
    expect(resolver.isSnapshotEligible(snapshot)).toBe(true);
    await resolver.confirmVenueProfileVersion(4);

    expect(resolver.isSnapshotEligible(snapshot)).toBe(false);
    const current = await resolver.resolve();
    if (!current) {
      throw new Error('Expected refreshed profile');
    }
    expect(resolver.isSnapshotEligible(current)).toBe(true);
  });

  it('rejects a captured snapshot after in-memory state is reset', async () => {
    const { resolver } = build({ storage: cachedStorage() });
    const snapshot = await resolver.resolve();
    if (!snapshot) {
      throw new Error('Expected cached profile');
    }

    resolver.reset();

    expect(resolver.isSnapshotEligible(snapshot)).toBe(false);
  });

  it.each(['target', 'revocations', 'profile'] as const)(
    'bounds cold acquisition when the %s request ignores cancellation',
    async (stage) => {
      jest.useFakeTimers();
      try {
        const { resolver, client, getSigningProfile } = build();
        if (stage === 'target') {
          getSigningProfile.mockImplementation(
            async () =>
              new Promise<{ id: string; version: number }>(() => undefined),
          );
        } else if (stage === 'revocations') {
          client.fetchRevoked.mockImplementation(
            async () => new Promise<FakeClient['result']>(() => undefined),
          );
        } else {
          client.fetchProfile.mockImplementation(
            async () => new Promise<string>(() => undefined),
          );
        }

        const acquiring = resolver.ensure();
        await jest.advanceTimersByTimeAsync(
          VENUE_PROFILE_ACQUISITION_TIMEOUT_MS + 1,
        );

        await expect(acquiring).resolves.toBeUndefined();
        await expect(resolver.resolve()).resolves.toBeUndefined();
      } finally {
        jest.useRealTimers();
      }
    },
  );

  it('uses one total deadline across target, revocations and profile download', async () => {
    jest.useFakeTimers();
    try {
      const { resolver, client, getSigningProfile } = build();
      getSigningProfile.mockImplementation(async () => {
        await new Promise<void>((resolve) => setTimeout(resolve, 4_000));
        return { id: VENUE_PROFILE_ID, version: 1 };
      });
      client.fetchRevoked.mockImplementation(async () => {
        await new Promise<void>((resolve) => setTimeout(resolve, 4_000));
        return client.result;
      });
      client.fetchProfile.mockImplementation(async () => {
        await new Promise<void>((resolve) => setTimeout(resolve, 4_000));
        return TEST_VENUE_PROFILE_RAW;
      });

      const acquiring = resolver.ensure();
      await jest.advanceTimersByTimeAsync(
        VENUE_PROFILE_ACQUISITION_TIMEOUT_MS + 1,
      );

      await expect(acquiring).resolves.toBeUndefined();
      await jest.advanceTimersByTimeAsync(4_000);
      await expect(resolver.resolve()).resolves.toBeUndefined();
    } finally {
      jest.useRealTimers();
    }
  });

  it('aborts a hung target lookup and releases the shared refresh for retry', async () => {
    jest.useFakeTimers();
    try {
      let signal: AbortSignal | undefined;
      const { resolver, getSigningProfile } = build({
        getSigningProfile: async (options) => {
          signal = options?.signal;
          return new Promise<{ id: string; version: number }>(() => undefined);
        },
      });

      const refreshing = resolver.refresh();
      await jest.advanceTimersByTimeAsync(
        VENUE_PROFILE_ACQUISITION_TIMEOUT_MS + 1,
      );

      await expect(refreshing).resolves.toBe(false);
      expect(signal?.aborted).toBe(true);
      getSigningProfile.mockResolvedValue({ id: VENUE_PROFILE_ID, version: 1 });

      await expect(resolver.ensure()).resolves.toMatchObject({ version: 1 });
    } finally {
      jest.useRealTimers();
    }
  });

  it('keeps downloaded bytes usable when a background refresh exceeds its deadline', async () => {
    jest.useFakeTimers();
    try {
      const { resolver, client } = build({ storage: cachedStorage(4) });
      client.fetchRevoked.mockImplementation(
        async () => new Promise<FakeClient['result']>(() => undefined),
      );

      const refreshing = resolver.refresh();
      await jest.advanceTimersByTimeAsync(
        VENUE_PROFILE_ACQUISITION_TIMEOUT_MS + 1,
      );
      await refreshing;

      await expect(resolver.ensure()).resolves.toMatchObject({ version: 4 });
    } finally {
      jest.useRealTimers();
    }
  });

  it('is due after the unchanged refresh interval', async () => {
    let now = 0;
    const { resolver } = build({ now: () => now });
    expect(resolver.isRefreshDue()).toBe(true);

    await resolver.refresh();

    expect(resolver.isRefreshDue()).toBe(false);
    now = 15 * 60 * 1000;
    expect(resolver.isRefreshDue()).toBe(true);
  });
});
