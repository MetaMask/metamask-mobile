import { POLYMARKET_STATIC_VENUE_CATALOG } from '../config/venueCatalogs';
import { parsePredictVenueCatalog } from '../contracts/v1/venueCatalog';
import type { PredictConfiguredVenue } from '../implementation/types';
import type {
  PredictFeedId,
  PredictFeedKey,
  PredictVenueAction,
  PredictVenueId,
} from '../types';
import type { PredictSurfaceFeed, PredictVenueCapabilities } from './types';

/**
 * Where each Venue's catalog comes from. `client` catalogs are bundled and
 * resolve synchronously; `service` catalogs are read through
 * `PredictMarketDataService:getVenueCatalog`. A Venue missing here has no
 * catalog, and never borrows another Venue's.
 */
type VenueCatalogSource =
  | { type: 'client'; catalog: unknown }
  | { type: 'service' };

interface VenueCapabilitySource {
  displayName: string;
  catalog: VenueCatalogSource;
}

const VENUE_CAPABILITY_SOURCES: Record<
  PredictConfiguredVenue,
  VenueCapabilitySource
> = {
  // Client config until PRED-1356.
  polymarket: {
    displayName: 'Polymarket',
    catalog: { type: 'client', catalog: POLYMARKET_STATIC_VENUE_CATALOG },
  },
  // The adapter serves KALSHI_STATIC_VENUE_CATALOG until PRED-1403.
  kalshi: { displayName: 'Kalshi', catalog: { type: 'service' } },
};

export const getVenueCapabilitySource = (
  venueId: PredictVenueId,
): VenueCapabilitySource | undefined =>
  Object.prototype.hasOwnProperty.call(VENUE_CAPABILITY_SOURCES, venueId)
    ? VENUE_CAPABILITY_SOURCES[venueId as PredictConfiguredVenue]
    : undefined;

/** The catalog read's state, as the hook observes it. */
export interface VenueCatalogRead {
  data: unknown;
  isError: boolean;
  retry: () => void;
}

const fromCatalog = (
  venueId: PredictVenueId,
  displayName: string,
  catalog: unknown,
): PredictVenueCapabilities => {
  try {
    return {
      status: 'ready',
      descriptor: {
        ...parsePredictVenueCatalog(catalog, venueId),
        displayName,
      },
    };
  } catch {
    return { status: 'unavailable', reason: 'invalid_catalog' };
  }
};

/**
 * Resolves a Venue's capabilities. A cached valid catalog wins over a failed
 * refresh; with no catalog, a failure enables nothing until a retry succeeds.
 */
export const resolveVenueCapabilities = (
  venueId: PredictVenueId,
  read: VenueCatalogRead,
): PredictVenueCapabilities => {
  const source = getVenueCapabilitySource(venueId);
  if (!source) {
    return { status: 'unavailable', reason: 'unknown_venue' };
  }
  if (source.catalog.type === 'client') {
    return fromCatalog(venueId, source.displayName, source.catalog.catalog);
  }
  if (read.data !== undefined) {
    return fromCatalog(venueId, source.displayName, read.data);
  }
  if (read.isError) {
    return { status: 'unavailable', reason: 'error', retry: read.retry };
  }
  return { status: 'loading' };
};

export const canPerformVenueAction = (
  capabilities: PredictVenueCapabilities,
  action: PredictVenueAction,
): boolean =>
  capabilities.status === 'ready' &&
  capabilities.descriptor.actions.includes(action);

export const getVenueFeedId = (
  capabilities: PredictVenueCapabilities,
  feedKey: PredictFeedKey,
): PredictFeedId | undefined =>
  capabilities.status === 'ready'
    ? capabilities.descriptor.feeds[feedKey]
    : undefined;

export const isVenueSearchSupported = (
  capabilities: PredictVenueCapabilities,
): boolean =>
  capabilities.status === 'ready' && capabilities.descriptor.searchSupported;

/**
 * The sections or tabs of one surface, in table order, whose Feed key the
 * Venue supports. Absent keys produce no entry, so the section is not
 * rendered; nothing falls back to another Feed or Venue.
 */
export const resolveSurfaceFeeds = <TSectionId extends string>(
  capabilities: PredictVenueCapabilities,
  table: Readonly<Record<TSectionId, PredictFeedKey>>,
): PredictSurfaceFeed<TSectionId>[] =>
  (Object.keys(table) as TSectionId[]).flatMap((sectionId) => {
    const feedKey = table[sectionId];
    const feedId = getVenueFeedId(capabilities, feedKey);
    return feedId ? [{ sectionId, feedKey, feedId }] : [];
  });
