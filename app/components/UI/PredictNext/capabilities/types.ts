import type {
  PredictFeedId,
  PredictFeedKey,
  PredictVenueCatalog,
} from '../types';

/**
 * A Venue's product-level support: the catalog plus the client-owned display
 * name. Support only. Rollout, Venue Status, eligibility, and Account
 * Readiness are separate inputs, and the backend authorizes every write.
 */
export interface PredictVenueDescriptor extends PredictVenueCatalog {
  displayName: string;
}

export type PredictVenueCapabilitiesUnavailableReason =
  /** No catalog source exists for this Venue. Never another Venue's. */
  | 'unknown_venue'
  /** The catalog was malformed, or described another Venue. */
  | 'invalid_catalog'
  /** The catalog read failed and no valid catalog is cached. */
  | 'error';

/**
 * Capability resolution for one Venue. Only `ready` enables anything; every
 * other state enables no action, no Feed, and no search.
 */
export type PredictVenueCapabilities =
  | { status: 'loading' }
  | { status: 'ready'; descriptor: PredictVenueDescriptor }
  | {
      status: 'unavailable';
      reason: Exclude<PredictVenueCapabilitiesUnavailableReason, 'error'>;
    }
  | { status: 'unavailable'; reason: 'error'; retry: () => void };

/** One surface section or tab whose Feed key the Venue supports. */
export interface PredictSurfaceFeed<TSectionId extends string> {
  sectionId: TSectionId;
  feedKey: PredictFeedKey;
  feedId: PredictFeedId;
}
