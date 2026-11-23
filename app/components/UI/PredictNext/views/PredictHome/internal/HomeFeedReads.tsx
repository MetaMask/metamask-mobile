import React, { useMemo, useState, type ReactElement } from 'react';
import { useFeed } from '../../../hooks/useFeed';
import { MAX_HOME_FEED_READS } from '../../../contracts/v1/venueCatalog';
import type {
  PredictEvent,
  PredictFeedId,
  PredictFeedKey,
  PredictVenueId,
} from '../../../types';
import { assignHomeReadSlots, type HomeFeedReadPlan } from './homeSections';

/**
 * How many read steps the chain always renders: the most Feeds the catalog
 * parser lets Home read. A constant, so the chain's depth never changes and
 * nothing below it remounts when the server reorders, adds or removes a
 * section; only the Feed each step reads changes.
 */
const HOME_FEED_READ_DEPTH = MAX_HOME_FEED_READS;
const NO_EVENTS: readonly PredictEvent[] = [];
const NO_READS: readonly HomeFeedRead[] = [];
const NO_PARAMS = { limit: 0 };

/** One Feed read of Home's plan. */
export interface HomeFeedRead {
  feedKey: PredictFeedKey;
  feedId: PredictFeedId | undefined;
  /** The first page's Events up to the read's limit, in backend order. */
  events: readonly PredictEvent[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

interface HomeFeedReadsProps {
  venueId: PredictVenueId;
  /** The Feeds to read, in order; at most {@link HOME_FEED_READ_DEPTH}. */
  plan: readonly HomeFeedReadPlan[];
  /** Holds every read, shown as loading, until the plan's sizes are final. */
  isHeld?: boolean;
  /** Receives one read per plan entry, in slot order (see
   * {@link assignHomeReadSlots}); consumers find a read by its Feed key. */
  children: (reads: readonly HomeFeedRead[]) => ReactElement;
}

interface HomeFeedReadStepProps
  extends Omit<HomeFeedReadsProps, 'children' | 'plan'> {
  /** The read of each step, by step index; undefined reads nothing. */
  slots: readonly (HomeFeedReadPlan | undefined)[];
  index: number;
  reads: readonly HomeFeedRead[];
  render: HomeFeedReadsProps['children'];
}

/**
 * Reads plan entry `index`, then hands the reads so far to the next step.
 * Hooks cannot run in a loop (the React Compiler skips a component that
 * does), so each read is its own component. Every step renders whether or not
 * the plan has an entry for it; a step past the plan reads nothing and adds
 * no read.
 */
const HomeFeedReadStep = ({
  venueId,
  slots,
  isHeld = false,
  index,
  reads,
  render,
}: HomeFeedReadStepProps) => {
  const planned = slots[index];
  const limit = planned?.limit;
  const params = useMemo(
    () => (limit === undefined ? NO_PARAMS : { limit }),
    [limit],
  );
  const query = useFeed(venueId, planned?.feedId, params, {
    enabled: !isHeld,
  });
  const { data, isError, refetch } = query;
  // A held read sends nothing; it shows as loading only while it has a Feed
  // to read, so a step past the plan or a key the Venue lacks never holds.
  const isLoading =
    query.isLoading || (isHeld && planned?.feedId !== undefined);
  const events = useMemo(
    () =>
      limit === undefined
        ? NO_EVENTS
        : (data?.pages[0]?.events.slice(0, limit) ?? NO_EVENTS),
    [data, limit],
  );
  const feedKey = planned?.feedKey;
  const feedId = planned?.feedId;
  const nextReads = useMemo<readonly HomeFeedRead[]>(
    () =>
      feedKey === undefined
        ? reads
        : [
            ...reads,
            {
              feedKey,
              feedId,
              events,
              isLoading,
              isError,
              refetch: () => refetch(),
            },
          ],
    [reads, feedKey, feedId, events, isLoading, isError, refetch],
  );

  return index + 1 < HOME_FEED_READ_DEPTH ? (
    <HomeFeedReadStep
      venueId={venueId}
      slots={slots}
      isHeld={isHeld}
      index={index + 1}
      reads={nextReads}
      render={render}
    />
  ) : (
    render(nextReads)
  );
};

/**
 * Reads every Feed Home's sections need and renders `children` with the
 * results, so Home holds live data for all sections in one place. The reads
 * follow the catalog, but the components that make them do not: a fixed chain
 * of {@link HOME_FEED_READ_DEPTH} steps, one read each.
 */
export const HomeFeedReads = ({
  venueId,
  plan,
  isHeld,
  children,
}: HomeFeedReadsProps) => {
  // Each Feed keeps its step while the plan changes, so a layout the server
  // reorders or extends switches no step to another Feed and reads nothing
  // again. Derived state, updated during render.
  const [slots, setSlots] = useState(() =>
    assignHomeReadSlots([], plan, HOME_FEED_READ_DEPTH),
  );
  const nextSlots = assignHomeReadSlots(slots, plan, HOME_FEED_READ_DEPTH);
  if (nextSlots !== slots) {
    setSlots(nextSlots);
  }

  return (
    <HomeFeedReadStep
      venueId={venueId}
      slots={nextSlots}
      isHeld={isHeld}
      index={0}
      reads={NO_READS}
      render={children}
    />
  );
};
