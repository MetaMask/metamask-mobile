import {
  emptyVenueProfiles,
  venueProfileCacheKey,
  VenueProfileStore,
  type PersistedVenueProfiles,
  type VenueProfileStorage,
} from './venueProfileStore';

const PROFILE_ID = 'kalshi-demo-signing';
const KEY = 'predict.venue-profiles.dev.kalshi-demo-signing';

function memoryStorage(initial: string | null = null) {
  let value = initial;
  const storage: VenueProfileStorage & { value: () => string | null } = {
    value: () => value,
    getItem: jest.fn(async () => value),
    setItem: jest.fn(async (_key: string, next: string) => {
      value = next;
    }),
    removeItem: jest.fn(async () => {
      value = null;
    }),
  };
  return storage;
}

const storeWith = (storage: VenueProfileStorage) =>
  new VenueProfileStore({
    environment: 'dev',
    profileId: PROFILE_ID,
    storage,
  });

describe('venueProfileStore', () => {
  it('keys the cache by cluster and profile id', () => {
    expect(venueProfileCacheKey('dev', PROFILE_ID)).toBe(KEY);
    expect(venueProfileCacheKey('uat', PROFILE_ID)).toBe(
      'predict.venue-profiles.uat.kalshi-demo-signing',
    );
  });

  it('round-trips a saved snapshot', async () => {
    const storage = memoryStorage();
    const saved: PersistedVenueProfiles = {
      targetVersion: 2,
      revokedRaw: '{"revokedVersions":[3]}',
      revokedEtag: '"revoked"',
      profiles: { '1': '{"version":1}', '2': '{"version":2}' },
      floor: 2,
      fetchedAt: 1_700_000_000,
    };

    await storeWith(storage).save(saved);

    expect(storage.setItem).toHaveBeenCalledWith(KEY, JSON.stringify(saved));
    await expect(storeWith(storage).load()).resolves.toEqual(saved);
  });

  it('returns undefined for a missing or corrupt cache entry', async () => {
    await expect(storeWith(memoryStorage()).load()).resolves.toBeUndefined();
    await expect(
      storeWith(memoryStorage('not JSON')).load(),
    ).resolves.toBeUndefined();
    await expect(
      storeWith(memoryStorage('null')).load(),
    ).resolves.toBeUndefined();
  });

  it('drops fields that are not the expected type', async () => {
    const raw = JSON.stringify({
      targetVersion: 1.5,
      revokedRaw: 7,
      revokedEtag: null,
      profiles: { '1': '{"version":1}', '2': 7, bad: 'x' },
      floor: -3,
      fetchedAt: 'yesterday',
    });

    await expect(storeWith(memoryStorage(raw)).load()).resolves.toEqual({
      profiles: { '1': '{"version":1}' },
      floor: 0,
    });
  });

  it('treats a storage read failure as no cache', async () => {
    const storage = memoryStorage();
    storage.getItem = jest.fn(async () => {
      throw new Error('MMKV unavailable');
    });

    await expect(storeWith(storage).load()).resolves.toBeUndefined();
  });

  it('swallows cache write and clear failures', async () => {
    const storage = memoryStorage();
    storage.setItem = jest.fn(async () => {
      throw new Error('disk full');
    });
    storage.removeItem = jest.fn(async () => {
      throw new Error('disk full');
    });
    const store = storeWith(storage);

    await expect(store.save(emptyVenueProfiles())).resolves.toBeUndefined();
    await expect(store.clear()).resolves.toBeUndefined();
  });

  it('clears the cache entry', async () => {
    const storage = memoryStorage('{}');
    const store = storeWith(storage);

    await store.clear();

    expect(storage.removeItem).toHaveBeenCalledWith(KEY);
    expect(storage.value()).toBeNull();
  });
});
