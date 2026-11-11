import React, { useMemo, type ReactElement } from 'react';
import { useFeed } from '../../../hooks/useFeed';
import type { PredictSurfaceFeed } from '../../../capabilities';
import type {
  PredictEvent,
  PredictFeedId,
  PredictVenueId,
} from '../../../types';
import {
  HOME_DISCOVERY_EVENTS_PER_SLOT,
  HOME_DISCOVERY_SLOT_IDS,
  type HomeDiscoverySlotId,
} from './homeDiscoverySlots';

/** The same params as the PredictNext Home preview, so a slot and the Home
 * section of the same Feed share one cache entry. */
const FEED_PARAMS = { limit: HOME_DISCOVERY_EVENTS_PER_SLOT };
const NO_EVENTS: readonly PredictEvent[] = [];
const NO_READS: readonly HomeDiscoveryFeedRead[] = [];

/** One discovery slot's Feed read. */
export interface HomeDiscoveryFeedRead {
  slotId: HomeDiscoverySlotId;
  /** Undefined when the slot is not shown; nothing is read. */
  feedId: PredictFeedId | undefined;
  /** The first page's Events, in backend order. Kept through a failed refresh. */
  events: readonly PredictEvent[];
  /** No data yet and a read in flight or paused (offline, or no usable
   * network). */
  isLoading: boolean;
  isError: boolean;
}

interface HomeDiscoveryFeedReadsProps {
  venueId: PredictVenueId;
  /** The slots to read, from `resolveHomeDiscoverySlots`. */
  slotFeeds: readonly PredictSurfaceFeed<HomeDiscoverySlotId>[];
  /** False pauses every read (no usable network); cached Events stay. */
  isEnabled: boolean;
  /** Receives one read per shown slot, in {@link HOME_DISCOVERY_SLOT_IDS}
   * order. */
  children: (reads: readonly HomeDiscoveryFeedRead[]) => ReactElement | null;
}

interface StepProps extends Omit<HomeDiscoveryFeedReadsProps, 'children'> {
  index: number;
  reads: readonly HomeDiscoveryFeedRead[];
  render: HomeDiscoveryFeedReadsProps['children'];
}

/**
 * Reads one slot's Feed, then hands the reads so far to the next slot. Hooks
 * cannot run in a loop, so each slot is its own component, chained over
 * {@link HOME_DISCOVERY_SLOT_IDS} (a module constant) so the depth never
 * changes when Venue support does. The same pattern as PredictNext Home's
 * `HomeFeedReads`.
 */
const HomeDiscoveryFeedReadStep = ({
  venueId,
  slotFeeds,
  isEnabled,
  index,
  reads,
  render,
}: StepProps) => {
  const slotId = HOME_DISCOVERY_SLOT_IDS[index];
  const feedId = slotFeeds.find((feed) => feed.sectionId === slotId)?.feedId;
  const { data, isPending, isError } = useFeed(venueId, feedId, FEED_PARAMS, {
    enabled: isEnabled,
  });
  const events = data?.pages[0]?.events ?? NO_EVENTS;
  const isLoading = feedId !== undefined && isPending && !isError;
  const nextReads = useMemo<readonly HomeDiscoveryFeedRead[]>(
    () =>
      feedId === undefined
        ? reads
        : [...reads, { slotId, feedId, events, isLoading, isError }],
    [reads, slotId, feedId, events, isLoading, isError],
  );

  return index + 1 < HOME_DISCOVERY_SLOT_IDS.length ? (
    <HomeDiscoveryFeedReadStep
      venueId={venueId}
      slotFeeds={slotFeeds}
      isEnabled={isEnabled}
      index={index + 1}
      reads={nextReads}
      render={render}
    />
  ) : (
    render(nextReads)
  );
};

/** Reads the Feed of every shown discovery slot and renders `children`
 * with the results, so the carousel can hold live data in one place. */
export const HomeDiscoveryFeedReads = ({
  venueId,
  slotFeeds,
  isEnabled,
  children,
}: HomeDiscoveryFeedReadsProps) =>
  HOME_DISCOVERY_SLOT_IDS.length === 0 ? (
    children(NO_READS)
  ) : (
    <HomeDiscoveryFeedReadStep
      venueId={venueId}
      slotFeeds={slotFeeds}
      isEnabled={isEnabled}
      index={0}
      reads={NO_READS}
      render={children}
    />
  );
