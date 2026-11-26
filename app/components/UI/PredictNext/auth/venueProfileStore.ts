import StorageWrapper from '../../../../store/storage-wrapper';
import { VENUE_PROFILE_REGISTRY_URL } from './venueProfileRegistryUrl';

/** Persisted cache for one Predict cluster and profile id. */
export interface PersistedVenueProfiles {
  targetVersion?: number;
  revokedRaw?: string;
  revokedEtag?: string;
  /** Raw profile bytes keyed by version, exactly as served. */
  profiles: Record<string, string>;
  /** Highest profile version used. Never decreases. */
  floor: number;
  /** When the refresh last completed. */
  fetchedAt?: number;
}

const EMPTY: PersistedVenueProfiles = { profiles: {}, floor: 0 };

export interface VenueProfileStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export const venueProfileCacheKey = (
  environment: 'dev' | 'uat',
  profileId: string,
): string => `predict.venue-profiles.${environment}.${profileId}`;

const parseProfiles = (value: unknown): Record<string, string> => {
  const profiles: Record<string, string> = {};
  if (typeof value !== 'object' || value === null) {
    return profiles;
  }
  for (const [version, profile] of Object.entries(value)) {
    if (
      typeof profile === 'string' &&
      /^[1-9]\d*$/u.test(version) &&
      Number.isSafeInteger(Number(version))
    ) {
      profiles[version] = profile;
    }
  }
  return profiles;
};

const parseFloor = (value: unknown): number =>
  typeof value === 'number' && Number.isSafeInteger(value)
    ? Math.max(0, value)
    : 0;

/**
 * MMKV-backed cache of raw registry bytes and the admitted floor. Overrides
 * are memory-only so local registry state cannot replace the official cache.
 */
export class VenueProfileStore {
  readonly #storage: VenueProfileStorage | undefined;
  readonly #environment: 'dev' | 'uat';
  readonly #profileId: string;

  constructor({
    environment,
    profileId,
    registryUrl = VENUE_PROFILE_REGISTRY_URL,
    storage = StorageWrapper,
  }: {
    environment: 'dev' | 'uat';
    profileId: string;
    registryUrl?: string;
    storage?: VenueProfileStorage;
  }) {
    this.#storage =
      registryUrl === VENUE_PROFILE_REGISTRY_URL ? storage : undefined;
    this.#environment = environment;
    this.#profileId = profileId;
  }

  async load(): Promise<PersistedVenueProfiles | undefined> {
    if (!this.#storage) {
      return undefined;
    }
    let raw: string | null;
    try {
      raw = await this.#storage.getItem(this.#key());
    } catch {
      return undefined;
    }
    if (raw === null) {
      return undefined;
    }
    try {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null) {
        return undefined;
      }
      const value = parsed as Partial<PersistedVenueProfiles>;
      return {
        ...(typeof value.targetVersion === 'number' &&
        Number.isSafeInteger(value.targetVersion) &&
        value.targetVersion > 0
          ? { targetVersion: value.targetVersion }
          : {}),
        ...(typeof value.revokedRaw === 'string'
          ? { revokedRaw: value.revokedRaw }
          : {}),
        ...(typeof value.revokedEtag === 'string'
          ? { revokedEtag: value.revokedEtag }
          : {}),
        profiles: parseProfiles(value.profiles),
        floor: parseFloor(value.floor),
        ...(typeof value.fetchedAt === 'number'
          ? { fetchedAt: value.fetchedAt }
          : {}),
      };
    } catch {
      return undefined;
    }
  }

  async save(value: PersistedVenueProfiles): Promise<void> {
    if (!this.#storage) {
      return;
    }
    try {
      await this.#storage.setItem(this.#key(), JSON.stringify(value));
    } catch {
      // A cache write failure only means the next launch re-fetches.
    }
  }

  async clear(): Promise<void> {
    if (!this.#storage) {
      return;
    }
    try {
      await this.#storage.removeItem(this.#key());
    } catch {
      // Nothing to do: the cache is an optimization.
    }
  }

  #key(): string {
    return venueProfileCacheKey(this.#environment, this.#profileId);
  }
}

export const emptyVenueProfiles = (): PersistedVenueProfiles => ({
  ...EMPTY,
  profiles: {},
});
