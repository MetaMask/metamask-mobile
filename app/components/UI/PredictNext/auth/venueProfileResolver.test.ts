import {
  VENUE_PROFILE_ID,
  VenueProfileResolver,
  validateSigningProfile,
  venueProfileSha256,
} from './venueSigningProfiles';
import {
  BUNDLED_POLICY_RAW,
  BUNDLED_V2_RAW,
  BUNDLED_V3_RAW,
} from './venue-profiles/kalshi-demo-signing.raw';
import type { RemoteVenueProfileClient } from './RemoteVenueProfileClient';
import {
  VenueProfileStore,
  type VenueProfileStorage,
} from './venueProfileStore';

const memoryStorage = (): VenueProfileStorage & { value: string | null } => ({
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

const profileWith = (version: number, patch: object = {}): string =>
  JSON.stringify({
    ...(JSON.parse(BUNDLED_V3_RAW) as object),
    version,
    ...patch,
  });

const policy = (currentVersion: number, revokedVersions: number[] = [1]) =>
  JSON.stringify({ id: VENUE_PROFILE_ID, currentVersion, revokedVersions });

class FakeClient {
  policyResult:
    | { status: 'modified'; raw: string; etag?: string }
    | { status: 'not-modified'; etag?: string } = {
    status: 'modified',
    raw: policy(3),
    etag: '"3"',
  };

  readonly bodies = new Map<number, string>();
  readonly fetched: string[] = [];

  async fetchPolicy(): Promise<typeof this.policyResult> {
    return this.policyResult;
  }

  async fetchProfile({ version }: { version: number }): Promise<string> {
    this.fetched.push(`v${version}`);
    const body = this.bodies.get(version);
    if (body === undefined) {
      throw new Error('not found');
    }
    return body;
  }
}

const build = (
  options: {
    client?: FakeClient;
    storage?: VenueProfileStorage & { value: string | null };
    now?: () => number;
  } = {},
) => {
  const storage = options.storage ?? memoryStorage();
  const store = new VenueProfileStore({
    environment: 'test',
    profileId: VENUE_PROFILE_ID,
    storage,
  });
  const client = options.client ?? new FakeClient();
  const logs: string[] = [];
  const resolver = new VenueProfileResolver({
    client: client as unknown as RemoteVenueProfileClient,
    store,
    now: options.now ?? (() => 1_000),
    log: (message) => logs.push(message),
  });
  return { resolver, client, store, storage, logs };
};

describe('VenueProfileResolver', () => {
  it('resolves the bundled version with the hash of the exact bytes', async () => {
    const { resolver } = build();

    await expect(resolver.resolve()).resolves.toEqual({
      profile: validateSigningProfile(JSON.parse(BUNDLED_V3_RAW)),
      version: 3,
      sha256: venueProfileSha256(BUNDLED_V3_RAW),
    });
  });

  it('adopts a fetched profile and raises the persisted floor', async () => {
    const client = new FakeClient();
    client.policyResult = { status: 'modified', raw: policy(4), etag: '"4"' };
    client.bodies.set(4, profileWith(4));
    const { resolver, storage } = build({ client });

    await resolver.refresh();

    await expect(resolver.resolve()).resolves.toMatchObject({
      version: 4,
      sha256: venueProfileSha256(profileWith(4)),
    });
    expect(client.fetched).toEqual(['v4']);
    expect(JSON.parse(storage.value as string)).toMatchObject({
      floor: 4,
      policyEtag: '"4"',
    });
  });

  it('falls back when the current version has no admitted copy', async () => {
    const client = new FakeClient();
    client.policyResult = {
      status: 'modified',
      raw: policy(4, [1, 4]),
      etag: '"x"',
    };
    const { resolver, logs } = build({ client });

    await resolver.refresh();

    await expect(resolver.resolve()).resolves.toMatchObject({ version: 3 });
    expect(client.fetched).toEqual(['v4']);
    expect(logs).toContain('PredictNext: venue profile revoked');
  });

  it('refuses every version revoked, keeping the floor', async () => {
    const client = new FakeClient();
    client.policyResult = {
      status: 'modified',
      raw: policy(3, [1, 3]),
      etag: '"x"',
    };
    const storage = memoryStorage();
    const { resolver } = build({ client, storage });

    await resolver.refresh();

    await expect(resolver.resolve()).resolves.toBeUndefined();
    expect(JSON.parse(storage.value as string)).toMatchObject({ floor: 3 });
  });

  it('refuses a policy that rolls the current version back', async () => {
    const client = new FakeClient();
    client.policyResult = { status: 'modified', raw: policy(2), etag: '"old"' };
    const storage = memoryStorage();
    storage.value = JSON.stringify({
      policyRaw: BUNDLED_POLICY_RAW,
      policyEtag: '"3"',
      profiles: {},
      floor: 3,
      fetchedAt: 0,
    });
    const { resolver } = build({ client, storage });

    await resolver.refresh();

    await expect(resolver.resolve()).resolves.toMatchObject({ version: 3 });
  });

  it('refuses to go below a persisted floor', async () => {
    const storage = memoryStorage();
    storage.value = JSON.stringify({
      policyRaw: policy(2),
      profiles: { 2: BUNDLED_V2_RAW },
      floor: 4,
    });
    const { resolver } = build({ storage });

    await expect(resolver.resolve()).resolves.toBeUndefined();
  });

  it('skips a fetched profile this build cannot honor and keeps the bundle', async () => {
    const client = new FakeClient();
    client.policyResult = { status: 'modified', raw: policy(4), etag: '"4"' };
    client.bodies.set(4, profileWith(4, { minDsl: 'dsl-2' }));
    const { resolver, logs } = build({ client });

    await resolver.refresh();

    await expect(resolver.resolve()).resolves.toMatchObject({ version: 3 });
    expect(logs).toContain('PredictNext: venue profile refused');
  });

  it('accepts unknown top-level keys', async () => {
    const client = new FakeClient();
    client.policyResult = { status: 'modified', raw: policy(4), etag: '"4"' };
    client.bodies.set(4, profileWith(4, { futureField: { any: 'thing' } }));
    const { resolver } = build({ client });

    await resolver.refresh();

    await expect(resolver.resolve()).resolves.toMatchObject({ version: 4 });
  });

  it('honors 304 and does not refetch a version it already holds', async () => {
    const client = new FakeClient();
    client.policyResult = { status: 'not-modified', etag: '"3"' };
    const { resolver, storage } = build({ client });

    await resolver.refresh();

    expect(client.fetched).toEqual([]);
    await expect(resolver.resolve()).resolves.toMatchObject({ version: 3 });
    expect(JSON.parse(storage.value as string)).toMatchObject({ floor: 3 });
  });

  it('serves the persisted profile when the registry is down', async () => {
    const storage = memoryStorage();
    storage.value = JSON.stringify({
      policyRaw: policy(4),
      profiles: { 4: profileWith(4) },
      floor: 4,
    });
    const client = new FakeClient();
    client.fetchPolicy = async () => {
      throw new Error('offline');
    };
    const { resolver } = build({ client, storage });

    await resolver.refresh();

    await expect(resolver.resolve()).resolves.toMatchObject({ version: 4 });
  });

  it('is due after the refresh interval and not before', async () => {
    let now = 0;
    const client = new FakeClient();
    client.policyResult = { status: 'not-modified', etag: '"3"' };
    const { resolver } = build({ client, now: () => now });

    expect(resolver.isRefreshDue()).toBe(true);
    await resolver.refresh();
    expect(resolver.isRefreshDue()).toBe(false);

    now = 15 * 60 * 1000;
    expect(resolver.isRefreshDue()).toBe(true);
  });
});
