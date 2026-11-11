import { getEventGame } from '../../../events/game';
import {
  NFL_FEED_SCREEN_ID,
  type FeedScreenId,
} from '../../../navigation/feedScreens';
import type { PredictEntityId, PredictEvent } from '../../../types';

/** Most cards the Trending carousel shows. */
const TRENDING_LIMIT = 5;
/** Most Trending cards one read fills before the rest fill the carousel. */
const TRENDING_PER_READ = 2;
/** Most cards the Sports row shows. */
const SPORTS_LIMIT = 6;

/** What the rows are chosen from: a Home section's read and its Events. */
interface HomeFeedReadEvents {
  sectionId: FeedScreenId;
  events: readonly PredictEvent[];
}

export interface HomeFeedRows<TRead extends HomeFeedReadEvents> {
  /** The Trending carousel's Events, in display order. */
  trending: PredictEvent[];
  /** The Sports row's Events, in NFL read order. */
  sports: PredictEvent[];
  /** The reads Home shows as sections below the rows, minus row Events. */
  sections: TRead[];
}

const isLiveGame = (event: PredictEvent) =>
  getEventGame(event)?.status === 'in_progress';

/**
 * Trending takes game Events only, from every read. Live Games rank first,
 * then read order: read by read, each in backend order. Each read fills at
 * most two cards, then the best of the rest fill the carousel to five, so
 * one league cannot take every card while another has Games. The carousel
 * shows its Events in rank order.
 */
const selectTrendingEvents = (
  reads: readonly HomeFeedReadEvents[],
): PredictEvent[] => {
  const seen = new Set<PredictEntityId>();
  const games: { event: PredictEvent; readIndex: number }[] = [];
  reads.forEach(({ events }, readIndex) => {
    for (const event of events) {
      if (getEventGame(event) && !seen.has(event.id)) {
        seen.add(event.id);
        games.push({ event, readIndex });
      }
    }
  });
  // Splitting keeps read order among the live Games and among the rest.
  const ranked = [
    ...games.filter(({ event }) => isLiveGame(event)),
    ...games.filter(({ event }) => !isLiveGame(event)),
  ];

  const picked = new Set<PredictEvent>();
  const pickedPerRead = new Map<number, number>();
  for (const { event, readIndex } of ranked) {
    const count = pickedPerRead.get(readIndex) ?? 0;
    if (picked.size < TRENDING_LIMIT && count < TRENDING_PER_READ) {
      picked.add(event);
      pickedPerRead.set(readIndex, count + 1);
    }
  }
  for (const { event } of ranked) {
    if (picked.size < TRENDING_LIMIT) {
      picked.add(event);
    }
  }
  return ranked.flatMap(({ event }) => (picked.has(event) ? [event] : []));
};

/**
 * Chooses the Events of Home's rows from its Feed reads. Trending ranks game
 * Events from every read (see {@link selectTrendingEvents}). Sports shows the
 * NFL read's game Events that Trending does not, up to six. The reads from
 * `sectionsFrom` on stay sections of their own. No Event shows twice: each
 * row drops the Events a row above it shows.
 */
export const selectHomeFeedRows = <TRead extends HomeFeedReadEvents>(
  reads: readonly TRead[],
  sectionsFrom: number,
): HomeFeedRows<TRead> => {
  const trending = selectTrendingEvents(reads);
  const shown = new Set(trending.map(({ id }) => id));
  const takeUnshown = (
    events: readonly PredictEvent[],
    limit = Number.POSITIVE_INFINITY,
  ) => {
    const taken: PredictEvent[] = [];
    for (const event of events) {
      if (taken.length === limit) {
        break;
      }
      if (!shown.has(event.id)) {
        shown.add(event.id);
        taken.push(event);
      }
    }
    return taken;
  };

  const nflGames =
    reads
      .find(({ sectionId }) => sectionId === NFL_FEED_SCREEN_ID)
      ?.events.filter((event) => getEventGame(event)) ?? [];
  const sports = takeUnshown(nflGames, SPORTS_LIMIT);
  const sections = reads
    .slice(sectionsFrom)
    .map((read) => ({ ...read, events: takeUnshown(read.events) }));

  return { trending, sports, sections };
};
