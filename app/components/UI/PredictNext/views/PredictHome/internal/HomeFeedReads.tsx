import React, { useMemo, type ReactElement } from 'react';
import { useFeed } from '../../../hooks/useFeed';
import {
  PREDICT_SURFACE_FEED_KEYS,
  type PredictSurfaceFeed,
} from '../../../capabilities';
import type { FeedScreenId } from '../../../navigation/feedScreens';
import type {
  PredictEvent,
  PredictFeedId,
  PredictVenueId,
} from '../../../types';

type HomeSectionKeys = typeof PREDICT_SURFACE_FEED_KEYS.nextHomeSections;

/**
 * Home's sections in display order: every row of the surface table, whether
 * or not the Venue supports it. Each section opens the Feed Screen of the same
 * ID, so a row without a Feed Screen does not compile.
 */
export const HOME_SECTION_IDS: readonly FeedScreenId[] = Object.keys(
  PREDICT_SURFACE_FEED_KEYS.nextHomeSections,
) as (keyof HomeSectionKeys)[];

export const PREVIEW_LIMIT = 2;
const PREVIEW_PARAMS = { limit: PREVIEW_LIMIT };
const NO_EVENTS: readonly PredictEvent[] = [];
const NO_READS: readonly HomeFeedRead[] = [];

/** One Home section's preview Feed read. */
export interface HomeFeedRead {
  sectionId: FeedScreenId;
  /** Undefined when the Venue lacks the section's Feed key; nothing is read. */
  feedId: PredictFeedId | undefined;
  /** The first {@link PREVIEW_LIMIT} Events, in backend order. */
  events: readonly PredictEvent[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

interface HomeFeedReadsProps {
  venueId: PredictVenueId;
  /** The sections the Venue supports, from `resolveSurfaceFeeds`. */
  sectionFeeds: readonly PredictSurfaceFeed<FeedScreenId>[];
  /** Receives one read per {@link HOME_SECTION_IDS} entry, in order. */
  children: (reads: readonly HomeFeedRead[]) => ReactElement;
}

interface HomeFeedReadStepProps extends Omit<HomeFeedReadsProps, 'children'> {
  index: number;
  reads: readonly HomeFeedRead[];
  render: HomeFeedReadsProps['children'];
}

/**
 * Reads one section's Feed, then hands the reads so far to the next section.
 * Hooks cannot run in a loop, so each section is its own component. The
 * chain follows {@link HOME_SECTION_IDS}, a module constant, so its depth
 * never changes and nothing below it remounts when Venue support changes.
 */
const HomeFeedReadStep = ({
  venueId,
  sectionFeeds,
  index,
  reads,
  render,
}: HomeFeedReadStepProps) => {
  const sectionId = HOME_SECTION_IDS[index];
  const feedId = sectionFeeds.find(
    (feed) => feed.sectionId === sectionId,
  )?.feedId;
  const { data, isLoading, isError, refetch } = useFeed(
    venueId,
    feedId,
    PREVIEW_PARAMS,
  );
  const events = useMemo(
    () => data?.pages[0]?.events.slice(0, PREVIEW_LIMIT) ?? NO_EVENTS,
    [data],
  );
  const nextReads = useMemo<readonly HomeFeedRead[]>(
    () => [
      ...reads,
      {
        sectionId,
        feedId,
        events,
        isLoading,
        isError,
        refetch: () => refetch(),
      },
    ],
    [reads, sectionId, feedId, events, isLoading, isError, refetch],
  );

  return index + 1 < HOME_SECTION_IDS.length ? (
    <HomeFeedReadStep
      venueId={venueId}
      sectionFeeds={sectionFeeds}
      index={index + 1}
      reads={nextReads}
      render={render}
    />
  ) : (
    render(nextReads)
  );
};

/**
 * Reads the preview Feed of every Home section and renders `children` with
 * the results, so Home can hold live data for all sections in one place.
 */
export const HomeFeedReads = ({
  venueId,
  sectionFeeds,
  children,
}: HomeFeedReadsProps) =>
  HOME_SECTION_IDS.length === 0 ? (
    children(NO_READS)
  ) : (
    <HomeFeedReadStep
      venueId={venueId}
      sectionFeeds={sectionFeeds}
      index={0}
      reads={NO_READS}
      render={children}
    />
  );
