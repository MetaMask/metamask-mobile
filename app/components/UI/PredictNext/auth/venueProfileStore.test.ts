import {
  emptyVenueProfiles,
  venueProfileCacheKey,
  VenueProfileStore,
  type PersistedVenueProfiles,
  type VenueProfileStorage,
} from './venueProfileStore';
import {
  TEST_VENUE_PROFILE_RAW,
  TEST_VENUE_REVOKED_RAW,
} from '../../../../../tests/fixtures/predict/venueProfiles';
import { VENUE_PROFILE_REGISTRY_URL } from './venueProfileRegistryUrl';

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
      targetVersion: 1,
      revokedRaw: TEST_VENUE_REVOKED_RAW,
      revokedEtag: '"revoked"',
      profiles: { '1': TEST_VENUE_PROFILE_RAW },
      floor: 1,
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

  it('does not read, write or clear official storage for an override URL', async () => {
    const storage = memoryStorage('official cache');
    const store = new VenueProfileStore({
      environment: 'dev',
      profileId: PROFILE_ID,
      registryUrl: 'http://localhost:8787/profiles',
      storage,
    });

    await expect(store.load()).resolves.toBeUndefined();
    await store.save(emptyVenueProfiles());
    await store.clear();

    expect(storage.getItem).not.toHaveBeenCalled();
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.removeItem).not.toHaveBeenCalled();
    expect(storage.value()).toBe('official cache');
  });

  it('persists when an explicit URL exactly matches the official registry', async () => {
    const storage = memoryStorage();
    const store = new VenueProfileStore({
      environment: 'dev',
      profileId: PROFILE_ID,
      registryUrl: VENUE_PROFILE_REGISTRY_URL,
      storage,
    });

    await store.save(emptyVenueProfiles());

    expect(storage.setItem).toHaveBeenCalledWith(
      KEY,
      JSON.stringify(emptyVenueProfiles()),
    );
  });
});
