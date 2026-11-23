import {
  VENUE_PROFILE_ID,
  VenueProfileResolver,
  venueProfileSha256,
} from './venueSigningProfiles';
import {
  BUNDLED_V1_RAW,
  BUNDLED_REVOKED_RAW,
} from './venue-profiles/kalshi-demo-signing.raw';
import type { RemoteVenueProfileClient } from './RemoteVenueProfileClient';
import {
  VenueProfileStore,
  venueProfileCacheKey,
  type VenueProfileStorage,
} from './venueProfileStore';

const profileWith = (version: number, patch: object = {}): string =>
  JSON.stringify({ ...JSON.parse(BUNDLED_V1_RAW), version, ...patch });
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

class FakeClient {
  result:
    | { status: 'modified'; raw: string; etag?: string }
    | { status: 'not-modified'; etag?: string } = {
    status: 'modified',
    raw: BUNDLED_REVOKED_RAW,
    etag: '"revoked"',
  };
  readonly bodies = new Map<number, string>();
  readonly fetched: number[] = [];
  readonly fetchRevoked = jest.fn(async () => this.result);
  async fetchProfile({ version }: { version: number }): Promise<string> {
    this.fetched.push(version);
    const raw = this.bodies.get(version);
    if (raw === undefined) {
      throw new Error('not found');
    }
    return raw;
  }
}

const build = (
  options: {
    storage?: MemoryStorage;
    client?: FakeClient;
    target?: number;
    now?: () => number;
    environment?: 'dev' | 'uat';
  } = {},
) => {
  const storage = options.storage ?? memoryStorage();
  const store = new VenueProfileStore({
    environment: options.environment ?? 'dev',
    profileId: VENUE_PROFILE_ID,
    storage,
  });
  const client = options.client ?? new FakeClient();
  const getSigningProfile = jest.fn(async () => ({
    id: VENUE_PROFILE_ID,
    version: options.target ?? 1,
  }));
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
  it('resolves the exact bundled bytes without a network request', async () => {
    const { resolver, getSigningProfile } = build();
    await expect(resolver.resolve()).resolves.toMatchObject({
      version: 1,
      sha256: venueProfileSha256(BUNDLED_V1_RAW),
    });
    expect(getSigningProfile).not.toHaveBeenCalled();
  });

  it('gets the target from predict-api, downloads it, and persists the floor', async () => {
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
      floor: 4,
      revokedRaw: BUNDLED_REVOKED_RAW,
      revokedEtag: '"revoked"',
    });
  });

  it('keeps the last used version when the target is not yet published and retries the missing download', async () => {
    const { resolver, client } = build({ target: 4 });
    await resolver.refresh();
    await expect(resolver.resolve()).resolves.toMatchObject({ version: 1 });
    client.result = { status: 'not-modified' };
    client.bodies.set(4, profileWith(4));
    await resolver.refresh();
    await expect(resolver.resolve()).resolves.toMatchObject({ version: 4 });
    expect(client.fetched).toEqual([4, 4]);
    await resolver.refresh();
    expect(client.fetched).toEqual([4, 4]);
    expect(client.fetchRevoked).toHaveBeenLastCalledWith({
      id: VENUE_PROFILE_ID,
      etag: '"revoked"',
    });
  });

  it('never signs with a revoked target', async () => {
    const { resolver, client } = build({ target: 4 });
    client.result = { status: 'modified', raw: revoked([4]) };
    client.bodies.set(4, profileWith(4));
    await resolver.refresh();
    await expect(resolver.resolve()).resolves.toMatchObject({ version: 1 });
    expect(client.fetched).toEqual([]);
  });

  it('becomes unavailable when the only held profile is revoked', async () => {
    const { resolver, client, storage } = build();
    client.result = { status: 'modified', raw: revoked([1]) };
    await resolver.refresh();
    await expect(resolver.resolve()).resolves.toBeUndefined();
    expect(JSON.parse(String(storage.value)).floor).toBe(1);
  });

  it('refuses a target below the floor instead of signing with the previous version', async () => {
    const { resolver, client, getSigningProfile, log, storage } = build({
      target: 4,
    });
    client.bodies.set(4, profileWith(4));
    await resolver.refresh();
    getSigningProfile.mockResolvedValue({ id: VENUE_PROFILE_ID, version: 1 });
    await resolver.refresh();
    await expect(resolver.resolve()).resolves.toBeUndefined();
    expect(log).toHaveBeenCalledWith(
      'PredictNext: venue profile refused',
      'profile_below_floor',
    );
    expect(JSON.parse(String(storage.value)).floor).toBe(4);
  });

  it('keeps the last target when predict-api is unreachable', async () => {
    const { resolver, client, getSigningProfile } = build({ target: 4 });
    client.bodies.set(4, profileWith(4));
    await resolver.refresh();
    getSigningProfile.mockRejectedValue(new Error('offline'));
    await resolver.refresh();
    await expect(resolver.resolve()).resolves.toMatchObject({ version: 4 });
  });

  it('uses persisted bytes during registry and predict-api outages, then the bundle with an empty cache', async () => {
    const storage = memoryStorage();
    storage.value = JSON.stringify({
      targetVersion: 4,
      revokedRaw: revoked(),
      profiles: { 4: profileWith(4) },
      floor: 4,
    });
    const cached = build({ storage });
    cached.getSigningProfile.mockRejectedValue(new Error('offline'));
    cached.client.fetchRevoked.mockRejectedValue(new Error('offline'));
    await cached.resolver.refresh();
    await expect(cached.resolver.resolve()).resolves.toMatchObject({
      version: 4,
    });
    const empty = build();
    empty.getSigningProfile.mockRejectedValue(new Error('offline'));
    empty.client.fetchRevoked.mockRejectedValue(new Error('offline'));
    await empty.resolver.refresh();
    await expect(empty.resolver.resolve()).resolves.toMatchObject({
      version: 1,
    });
  });

  it('keeps the last used cached version across restart when the new target is missing', async () => {
    const storage = memoryStorage();
    storage.value = JSON.stringify({
      targetVersion: 5,
      revokedRaw: revoked(),
      profiles: { 4: profileWith(4) },
      floor: 4,
    });
    const { resolver } = build({ storage });
    await expect(resolver.resolve()).resolves.toMatchObject({ version: 4 });
  });

  it('does not lower a persisted floor when no eligible profile remains', async () => {
    const storage = memoryStorage();
    storage.value = JSON.stringify({
      targetVersion: 4,
      revokedRaw: revoked([4]),
      profiles: {},
      floor: 4,
    });
    const { resolver, getSigningProfile } = build({ storage });
    getSigningProfile.mockRejectedValue(new Error('offline'));
    await resolver.refresh();
    await expect(resolver.resolve()).resolves.toBeUndefined();
    expect(JSON.parse(String(storage.value)).floor).toBe(4);
  });

  it('rejects an incompatible or mismatched profile and keeps the bundle', async () => {
    for (const patch of [
      { minDsl: 'dsl-2' },
      { id: 'other' },
      { version: 5 },
    ]) {
      const { resolver, client } = build({ target: 4 });
      client.bodies.set(4, profileWith(4, patch));
      await resolver.refresh();
      await expect(resolver.resolve()).resolves.toMatchObject({ version: 1 });
    }
  });

  it('preserves revocations on malformed or regressing registry responses', async () => {
    const { resolver, client } = build();
    client.result = { status: 'modified', raw: revoked([1]) };
    await resolver.refresh();
    for (const raw of ['not JSON', revoked()]) {
      client.result = { status: 'modified', raw };
      await resolver.refresh();
      await expect(resolver.resolve()).resolves.toBeUndefined();
    }
  });

  it('isolates cluster cache keys and supports a future dev fixture while uat stays bundled', async () => {
    // Synthetic future profile fixture, not an old bundled profile.
    const nextVersion = 2;
    const dev = build({ target: nextVersion, environment: 'dev' });
    dev.client.bodies.set(nextVersion, profileWith(nextVersion));
    const uat = build({ environment: 'uat' });
    await dev.resolver.refresh();
    await uat.resolver.refresh();
    await expect(dev.resolver.resolve()).resolves.toMatchObject({
      version: nextVersion,
    });
    await expect(uat.resolver.resolve()).resolves.toMatchObject({ version: 1 });
    expect(venueProfileCacheKey('dev', VENUE_PROFILE_ID)).toBe(
      `predict.venue-profiles.dev.${VENUE_PROFILE_ID}`,
    );
    expect(venueProfileCacheKey('uat', VENUE_PROFILE_ID)).toBe(
      `predict.venue-profiles.uat.${VENUE_PROFILE_ID}`,
    );
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
