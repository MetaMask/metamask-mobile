import StorageWrapper from '../../../../store/storage-wrapper';

/** Persisted cache for one registry environment and profile id. */
export interface PersistedVenueProfiles {
  policyRaw?: string;
  policyEtag?: string;
  /** Raw profile bytes keyed by version, exactly as served. */
  profiles: Record<string, string>;
  /** Highest `currentVersion` ever admitted. Never decreases. */
  floor: number;
  /** When the policy was last fetched from the registry. */
  fetchedAt?: number;
}

const EMPTY: PersistedVenueProfiles = { profiles: {}, floor: 0 };

export interface VenueProfileStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export const venueProfileCacheKey = (
  environment: string,
  profileId: string,
): string => `predict.venue-profiles.${environment}.${profileId}`;

/**
 * MMKV-backed cache of raw registry bytes and the admitted floor. It holds
 * no secrets: the policy and profiles are public and already in the bundle.
 */
export class VenueProfileStore {
  readonly #storage: VenueProfileStorage;
  readonly #environment: string;
  readonly #profileId: string;

  constructor({
    environment,
    profileId,
    storage = StorageWrapper,
  }: {
    environment: string;
    profileId: string;
    storage?: VenueProfileStorage;
  }) {
    this.#storage = storage;
    this.#environment = environment;
    this.#profileId = profileId;
  }

  async load(): Promise<PersistedVenueProfiles | undefined> {
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
      const profiles: Record<string, string> = {};
      if (typeof value.profiles === 'object' && value.profiles !== null) {
        for (const [version, profile] of Object.entries(value.profiles)) {
          if (typeof profile === 'string') {
            profiles[version] = profile;
          }
        }
      }
      return {
        ...(typeof value.policyRaw === 'string'
          ? { policyRaw: value.policyRaw }
          : {}),
        ...(typeof value.policyEtag === 'string'
          ? { policyEtag: value.policyEtag }
          : {}),
        profiles,
        floor:
          typeof value.floor === 'number' && Number.isSafeInteger(value.floor)
            ? Math.max(0, value.floor)
            : 0,
        ...(typeof value.fetchedAt === 'number'
          ? { fetchedAt: value.fetchedAt }
          : {}),
      };
    } catch {
      return undefined;
    }
  }

  async save(value: PersistedVenueProfiles): Promise<void> {
    try {
      await this.#storage.setItem(this.#key(), JSON.stringify(value));
    } catch {
      // A cache write failure only means the next launch re-fetches.
    }
  }

  async clear(): Promise<void> {
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
