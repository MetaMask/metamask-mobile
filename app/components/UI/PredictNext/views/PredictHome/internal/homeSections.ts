import { strings } from '../../../../../../../locales/i18n';
import {
  getVenueFeedId,
  type PredictVenueCapabilities,
} from '../../../capabilities';
import { getHomeSectionFeedKeys } from '../../../contracts/v1/venueCatalog';
import { getEventGame } from '../../../events/game';
import type {
  PredictEntityId,
  PredictEvent,
  PredictFeedId,
  PredictFeedKey,
  PredictHomeSection,
} from '../../../types';
import type { HardwareTier } from '../../../../../../util/deviceCapability/types';
import type { NetworkTier } from '../../../../../../hooks/useNetworkTier';

/** Most cards the Trending carousel shows. */
const TRENDING_LIMIT = 5;
/** Most Trending cards one read fills before the rest fill the carousel. */
const TRENDING_PER_READ = 2;
/** Most cards a games row shows. */
const GAMES_ROW_LIMIT = 6;

type FeedReadingKind = Exclude<PredictHomeSection['kind'], 'categories'>;

/**
 * How many Events one read asks for, by the kind of section that reads it.
 * A games row reads more than it may show because Trending above it can take
 * some of its Games; Trending reads up to two cards per source and a few more
 * to fill the carousel; a preview shows what it reads. Constrained devices
 * get shorter lists (device-capability UX matrix).
 */
const READ_SIZES: Record<
  FeedReadingKind,
  { standard: number; constrained: number }
> = {
  trending: { standard: 4, constrained: 2 },
  'games-row': { standard: 6, constrained: 4 },
  'feed-preview': { standard: 2, constrained: 1 },
};

/**
 * Whether Home reads short lists on this device: low-end hardware or a slow
 * cellular link. Unknown tiers keep the product default, and so does having
 * no network: React Query pauses the reads, and the cached lists stay whole.
 */
export const isHomeReadConstrained = (
  hardwareTier: HardwareTier | null,
  networkTier: NetworkTier | null,
): boolean => hardwareTier === 'LOW' || networkTier === 'SLOW_CELLULAR';

/** One Feed read Home makes. */
export interface HomeFeedReadPlan {
  feedKey: PredictFeedKey;
  /** Undefined when the Venue lacks the key; nothing is read. */
  feedId: PredictFeedId | undefined;
  limit: number;
}

/**
 * The Feeds Home reads for `sections`: each Feed key once, in the order the
 * sections first read it, asking for the most Events any section reading it
 * needs. One read serves every section on the same Feed, so a games row on a
 * Trending source shares Trending's read.
 */
export const planHomeFeedReads = (
  sections: readonly PredictHomeSection[],
  capabilities: PredictVenueCapabilities,
  isConstrained: boolean,
): HomeFeedReadPlan[] => {
  const plan: HomeFeedReadPlan[] = [];
  for (const section of sections) {
    if (section.kind === 'categories') {
      continue;
    }
    const sizes = READ_SIZES[section.kind];
    const limit = isConstrained ? sizes.constrained : sizes.standard;
    for (const feedKey of getHomeSectionFeedKeys(section)) {
      const planned = plan.find((read) => read.feedKey === feedKey);
      if (planned) {
        planned.limit = Math.max(planned.limit, limit);
      } else {
        plan.push({
          feedKey,
          feedId: getVenueFeedId(capabilities, feedKey),
          limit,
        });
      }
    }
  }
  return plan;
};

/** What the sections are chosen from: one Feed read and its Events. */
export interface HomeFeedReadEvents {
  feedKey: PredictFeedKey;
  events: readonly PredictEvent[];
  isLoading: boolean;
  isError: boolean;
}

/** One Home section, ready to render. */
export type HomeSectionView<TRead extends HomeFeedReadEvents> =
  | {
      kind: 'trending';
      key: string;
      screen?: string;
      events: PredictEvent[];
      isLoading: boolean;
    }
  | {
      kind: 'games-row';
      key: string;
      id: string;
      title: string;
      screen?: string;
      events: PredictEvent[];
      isLoading: boolean;
    }
  | { kind: 'categories'; key: string }
  | {
      kind: 'feed-preview';
      key: string;
      id: string;
      title: string;
      screen: string;
      events: PredictEvent[];
      /** The preview's own read. */
      read: TRead | undefined;
    };

export interface HomeSections<TRead extends HomeFeedReadEvents> {
  /** In catalog order. */
  sections: HomeSectionView<TRead>[];
  /** The reads behind Trending and the games rows that failed with no
   * Events to show. A refetch that fails over cached Events is not here. */
  failedGamesReads: TRead[];
}

const isLiveGame = (event: PredictEvent): boolean =>
  getEventGame(event)?.status === 'in_progress';

/**
 * Trending takes game Events only, from its source reads. Live Games rank
 * first, then read order: read by read, each in backend order. Each read
 * fills at most two cards, then the best of the rest fill the carousel to
 * five, so one league cannot take every card while another has Games. The
 * carousel shows its Events in rank order.
 *
 * The ranking is a snapshot of the reads: it uses each Game's status as the
 * Feed returned it. A Game that goes live through streamed data keeps its
 * place, and shows its live status, until the next Feed read ranks it again.
 * Home neither re-ranks on live updates nor refetches to pick them up.
 */
const selectTrendingEvents = (
  reads: readonly (readonly PredictEvent[])[],
  isShown: (event: PredictEvent) => boolean,
): PredictEvent[] => {
  const seen = new Set<PredictEntityId>();
  const games: { event: PredictEvent; readIndex: number }[] = [];
  reads.forEach((events, readIndex) => {
    for (const event of events) {
      if (getEventGame(event) && !seen.has(event.id) && !isShown(event)) {
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

/** The key a section's layout and React element are known by. */
const sectionKey = (section: PredictHomeSection): string =>
  'id' in section ? `${section.kind}-${section.id}` : section.kind;

/**
 * Chooses each Home section's Events from the Feed reads, in catalog order.
 * Trending ranks its sources' Games (see {@link selectTrendingEvents}); a
 * games row shows its Feed's Games, up to six; a preview shows its Feed's
 * Events. No Event shows twice: each section drops the Events a section
 * above it shows.
 *
 * Trending and the games rows wait for their own reads and for those of every
 * games section above them, so a row never paints Games a row above it is
 * about to take; until then they show skeletons and claim no Events. A
 * preview waits for its own read only, so a slow games read never holds it.
 * The trade-off: a preview below a games row whose Feed overlaps the row's
 * (a broad sports Feed under `nfl-games`) can paint Games the row takes once
 * it loads, and then reflows. Kalshi's layout has no such overlap.
 */
export const selectHomeSections = <TRead extends HomeFeedReadEvents>(
  sections: readonly PredictHomeSection[],
  reads: readonly TRead[],
): HomeSections<TRead> => {
  const readOf = (feedKey: PredictFeedKey): TRead | undefined =>
    reads.find((read) => read.feedKey === feedKey);
  const shown = new Set<PredictEntityId>();
  const isShown = (event: PredictEvent): boolean => shown.has(event.id);
  const show = (events: PredictEvent[]): PredictEvent[] => {
    events.forEach((event) => shown.add(event.id));
    return events;
  };
  const gamesReads: TRead[] = [];
  let isGamesAboveLoading = false;

  const views = sections.map((section): HomeSectionView<TRead> => {
    const key = sectionKey(section);
    if (section.kind === 'categories') {
      return { kind: 'categories', key };
    }
    const sectionReads = getHomeSectionFeedKeys(section).flatMap((feedKey) => {
      const read = readOf(feedKey);
      return read ? [read] : [];
    });
    if (section.kind === 'feed-preview') {
      const read = sectionReads[0];
      const events = read?.events.filter((event) => !isShown(event)) ?? [];
      return { ...section, key, events: show(events), read };
    }
    gamesReads.push(...sectionReads);
    const isLoading =
      isGamesAboveLoading || sectionReads.some((read) => read.isLoading);
    isGamesAboveLoading = isLoading;
    if (section.kind === 'trending') {
      const events = isLoading
        ? []
        : selectTrendingEvents(
            sectionReads.map((read) => read.events),
            isShown,
          );
      return {
        kind: 'trending',
        key,
        ...(section.screen ? { screen: section.screen } : {}),
        events: show(events),
        isLoading,
      };
    }
    const games = isLoading
      ? []
      : (sectionReads[0]?.events ?? [])
          .filter((event) => getEventGame(event) && !isShown(event))
          .slice(0, GAMES_ROW_LIMIT);
    return { ...section, key, events: show(games), isLoading };
  });

  const failedGamesReads = [...new Set(gamesReads)].filter(
    (read) => read.isError && read.events.length === 0,
  );
  return { sections: views, failedGamesReads };
};

/**
 * The app's translated copy for the Home sections it knows, by section ID,
 * with the English title the server serves for them. A known section whose
 * server title is that English title reads in the app's locale, so Kalshi's
 * Home reads as before. Any other title is the server's, so the server can
 * retitle a known section, or add one, without a release.
 */
const KNOWN_SECTION_TITLES: Readonly<
  Record<string, { key: string; english: string }>
> = {
  sports: { key: 'predict_next.home_feed.sports', english: 'Sports' },
  politics: {
    key: 'predict_next.home_categories.politics',
    english: 'Politics',
  },
};

export const getHomeSectionTitle = (
  sectionId: string,
  serverTitle: string,
): string => {
  const known = Object.prototype.hasOwnProperty.call(
    KNOWN_SECTION_TITLES,
    sectionId,
  )
    ? KNOWN_SECTION_TITLES[sectionId]
    : undefined;
  const value: unknown =
    known?.english === serverTitle
      ? strings(known.key, { defaultValue: serverTitle })
      : serverTitle;
  return typeof value === 'string' ? value : serverTitle;
};

const isSameRead = (
  a: HomeFeedReadPlan | undefined,
  b: HomeFeedReadPlan | undefined,
): boolean =>
  a === b ||
  (a !== undefined &&
    b !== undefined &&
    a.feedKey === b.feedKey &&
    a.feedId === b.feedId &&
    a.limit === b.limit);

/**
 * Places `plan`'s reads in `slotCount` fixed slots, keeping each Feed in the
 * slot it had in `previous` and filling free slots in plan order. A read
 * whose slot changes reads its Feed again, so this keeps a reordered,
 * trimmed or extended layout from re-reading the Feeds it already holds.
 * Returns `previous` itself when nothing changes, so it can be stored and
 * compared.
 */
export const assignHomeReadSlots = (
  previous: readonly (HomeFeedReadPlan | undefined)[],
  plan: readonly HomeFeedReadPlan[],
  slotCount: number,
): readonly (HomeFeedReadPlan | undefined)[] => {
  const slots: (HomeFeedReadPlan | undefined)[] = Array.from(
    { length: slotCount },
    (_, index) =>
      plan.find((read) => read.feedKey === previous[index]?.feedKey),
  );
  for (const read of plan) {
    if (!slots.includes(read)) {
      const free = slots.indexOf(undefined);
      if (free !== -1) {
        slots[free] = read;
      }
    }
  }
  return slots.every((read, index) => isSameRead(read, previous[index]))
    ? previous
    : slots;
};
