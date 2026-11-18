import {
  PREDICT_SURFACE_FEED_KEYS,
  resolveSurfaceFeeds,
  type PredictSurfaceFeed,
  type PredictVenueCapabilities,
} from '../../../capabilities';
import type { HardwareTier } from '../../../../../../util/deviceCapability/types';
import type { NetworkTier } from '../../../../../../hooks/useNetworkTier';

/** A Homepage discovery slot that a Feed fills. */
export type HomeDiscoverySlotId =
  keyof typeof PREDICT_SURFACE_FEED_KEYS.homepageSlots;

/**
 * Every Homepage discovery slot in display order, whether or not the Venue
 * supports it. A module constant, so the read chain built over it keeps the
 * same depth for the component's lifetime.
 */
export const HOME_DISCOVERY_SLOT_IDS = Object.keys(
  PREDICT_SURFACE_FEED_KEYS.homepageSlots,
) as readonly HomeDiscoverySlotId[];

/**
 * The slots the Venue's descriptor supports, limited to `slotIds` and in
 * their order. A slot whose Feed key the Venue lacks is absent: it is never
 * filled from another Feed or Venue. When the Venue supports none of
 * `slotIds` (a Polymarket assignment shown under Kalshi), every slot it
 * supports applies, as the renderer's bundled fallback does for an empty
 * slot.
 */
export const resolveHomeDiscoverySlots = (
  capabilities: PredictVenueCapabilities,
  slotIds: readonly HomeDiscoverySlotId[] = HOME_DISCOVERY_SLOT_IDS,
): PredictSurfaceFeed<HomeDiscoverySlotId>[] => {
  const supported = resolveSurfaceFeeds(
    capabilities,
    PREDICT_SURFACE_FEED_KEYS.homepageSlots,
  );
  const assigned = [...new Set(slotIds)].flatMap((slotId) =>
    supported.filter(({ sectionId }) => sectionId === slotId),
  );
  return assigned.length > 0 ? assigned : supported;
};

/**
 * The slot a UI Slots `predict-homepage-market-slots` item names, if a Feed
 * fills it. Pinned Event items name one Polymarket Event and have no Feed, so
 * no next Venue can show them.
 */
export const homeDiscoverySlotForUiSlotItem = (
  item: { type: 'event' } | { type: 'series'; seriesId: string },
): HomeDiscoverySlotId | undefined =>
  item.type === 'series' && item.seriesId === 'btc-up-or-down-5m'
    ? 'btc-up-down'
    : undefined;

/** Events each slot shows by default. */
export const HOME_DISCOVERY_EVENTS_PER_SLOT = 2;

/**
 * Events each slot shows on this device. Low-end hardware gets a short list
 * and a slow cellular link fewer previews (device-capability UX matrix).
 * Unknown tiers keep the product default.
 */
export const getHomeDiscoveryEventsPerSlot = (
  hardwareTier: HardwareTier | null,
  networkTier: NetworkTier | null,
): number =>
  hardwareTier === 'LOW' || networkTier === 'SLOW_CELLULAR'
    ? 1
    : HOME_DISCOVERY_EVENTS_PER_SLOT;
