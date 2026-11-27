import {
  array,
  boolean,
  enums,
  is,
  literal,
  optional,
  record,
  refine,
  string,
  type,
  unknown,
} from '@metamask/superstruct';
import Logger from '../../../../../util/Logger';
import { PredictError, PredictErrorCode } from '../../errors';
import {
  PREDICT_VENUE_ACTIONS,
  PREDICT_VENUE_ENVIRONMENTS,
  type PredictFeedId,
  type PredictFeedKey,
  type PredictHomeSection,
  type PredictVenueAction,
  type PredictVenueCatalog,
  type PredictVenueFeedScreen,
  type PredictVenueFeedScreenTab,
  type PredictVenueHome,
  type PredictVenueId,
} from '../../types';

const nonEmptyString = refine(
  string(),
  'NonEmptyString',
  (value) => value.length > 0,
);

const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const kebabCase = refine(string(), 'KebabCase', (value) =>
  KEBAB_CASE.test(value),
);

const venueEnvironmentSchema = enums(PREDICT_VENUE_ENVIRONMENTS);

// Unknown fields are ignored, and unknown actions are dropped below, so the
// schema accepts any string there. A known field with the wrong shape still
// rejects the catalog, except the ones that drive single entries: `feeds`
// entries, `categories`, `screens` and `home` drop what they can't use instead.
const venueCatalogSchema = type({
  venueId: nonEmptyString,
  environment: optional(venueEnvironmentSchema),
  actions: array(string()),
  feeds: record(string(), unknown()),
  categories: optional(unknown()),
  searchSupported: boolean(),
  screens: optional(unknown()),
  home: optional(unknown()),
});

const feedScreenTabSchema = type({
  id: kebabCase,
  title: nonEmptyString,
  feed: string(),
});

const feedScreenSchema = type({
  id: kebabCase,
  title: nonEmptyString,
  subtitle: optional(unknown()),
  tabs: array(unknown()),
});

const homeSchema = type({ sections: array(unknown()) });

const trendingSectionSchema = type({
  kind: literal('trending'),
  sources: array(unknown()),
  screen: optional(kebabCase),
});

const gamesRowSectionSchema = type({
  kind: literal('games-row'),
  id: kebabCase,
  title: nonEmptyString,
  feed: string(),
  screen: optional(kebabCase),
});

const categoriesSectionSchema = type({ kind: literal('categories') });

const feedPreviewSectionSchema = type({
  kind: literal('feed-preview'),
  id: kebabCase,
  title: nonEmptyString,
  feed: string(),
  screen: kebabCase,
});

/** Most Home sections mobile shows, and most Feeds they read together: Home
 * reads its Feeds through a chain of this fixed depth (`HomeFeedReads`). */
export const MAX_HOME_SECTIONS = 8;
export const MAX_HOME_FEED_READS = 8;

const KNOWN_ACTIONS: ReadonlySet<string> = new Set(PREDICT_VENUE_ACTIONS);

const hasOwn = (object: object, key: string) =>
  Object.prototype.hasOwnProperty.call(object, key);

const logDropped = (
  venueId: PredictVenueId,
  dropped: readonly unknown[],
  [singular, plural]: readonly [string, string],
) => {
  if (dropped.length > 0) {
    Logger.log(
      `[PredictNext] Dropped ${dropped.length} Venue catalog ${
        dropped.length === 1 ? singular : plural
      } for ${venueId}`,
      { dropped },
    );
  }
};

const invalidCatalog = (reason: string) =>
  PredictError.from(PredictErrorCode.INVALID_RESPONSE, {
    message: `Invalid Venue catalog: ${reason}.`,
  });

/**
 * The Categories whose entry is a Feed key in the parsed `feeds`, in catalog
 * order, without repeats. Anything else is dropped and logged, never thrown:
 * a non-string entry, a key that is not in `feeds`, a repeat, or a
 * `categories` that is not an array. A missing field is a catalog from before
 * PRED-1485 and means no Categories.
 */
const parseCategories = (
  value: unknown,
  feeds: Partial<Record<PredictFeedKey, PredictFeedId>>,
  venueId: PredictVenueId,
): PredictFeedKey[] => {
  if (value === undefined) {
    return [];
  }
  const categories: PredictFeedKey[] = [];
  const dropped: unknown[] = Array.isArray(value) ? [] : [value];
  const entries: unknown[] = Array.isArray(value) ? value : [];
  for (const entry of entries) {
    const isUsable =
      typeof entry === 'string' &&
      hasOwn(feeds, entry) &&
      !categories.includes(entry);
    if (isUsable) {
      categories.push(entry);
    } else {
      dropped.push(entry);
    }
  }
  logDropped(venueId, dropped, ['Category', 'Categories']);
  return categories;
};

/**
 * Feed ID by Feed key. The Predict API owns the vocabulary (PRED-1522), so
 * any kebab-case key is kept. A key that is not kebab-case, or has no Feed
 * ID, is dropped and logged, never thrown: one bad entry must not take every
 * Predict surface down with the catalog.
 */
const parseFeeds = (
  value: Record<string, unknown>,
  venueId: PredictVenueId,
): Partial<Record<PredictFeedKey, PredictFeedId>> => {
  const feeds: Partial<Record<PredictFeedKey, PredictFeedId>> = {};
  const dropped: string[] = [];
  for (const [key, feedId] of Object.entries(value)) {
    if (is(key, kebabCase) && is(feedId, nonEmptyString)) {
      feeds[key] = feedId as PredictFeedId;
    } else {
      dropped.push(key);
    }
  }
  logDropped(venueId, dropped, ['Feed', 'Feeds']);
  return feeds;
};

/**
 * One screen's usable tabs, in catalog order: a tab must be well formed, on
 * a Feed key in the parsed `feeds`, and not repeat an earlier tab's ID.
 */
const parseFeedScreenTabs = (
  tabs: readonly unknown[],
  feeds: Partial<Record<PredictFeedKey, PredictFeedId>>,
  dropped: unknown[],
): PredictVenueFeedScreenTab[] => {
  const parsed: PredictVenueFeedScreenTab[] = [];
  for (const tab of tabs) {
    const isUsable =
      is(tab, feedScreenTabSchema) &&
      hasOwn(feeds, tab.feed) &&
      !parsed.some(({ id }) => id === tab.id);
    if (isUsable) {
      parsed.push({ id: tab.id, title: tab.title, feed: tab.feed });
    } else {
      dropped.push(tab);
    }
  }
  return parsed;
};

/**
 * The Feed Screens, in catalog order (PRED-1525). A malformed or repeated
 * screen, a malformed tab, a tab on a Feed key missing from `feeds`, and a
 * screen left without tabs are dropped and logged, never thrown. A missing
 * field is a catalog from before PRED-1525 and means no screens.
 */
const parseFeedScreens = (
  value: unknown,
  feeds: Partial<Record<PredictFeedKey, PredictFeedId>>,
  venueId: PredictVenueId,
): PredictVenueFeedScreen[] => {
  if (value === undefined) {
    return [];
  }
  const screens: PredictVenueFeedScreen[] = [];
  const droppedScreens: unknown[] = Array.isArray(value) ? [] : [value];
  const droppedTabs: unknown[] = [];
  const entries: unknown[] = Array.isArray(value) ? value : [];
  for (const entry of entries) {
    if (
      !is(entry, feedScreenSchema) ||
      screens.some(({ id }) => id === entry.id)
    ) {
      droppedScreens.push(entry);
      continue;
    }
    const tabs = parseFeedScreenTabs(entry.tabs, feeds, droppedTabs);
    if (tabs.length === 0) {
      droppedScreens.push(entry);
      continue;
    }
    screens.push({
      id: entry.id,
      title: entry.title,
      ...(is(entry.subtitle, nonEmptyString)
        ? { subtitle: entry.subtitle }
        : {}),
      tabs,
    });
  }
  logDropped(venueId, droppedTabs, ['Feed Screen tab', 'Feed Screen tabs']);
  logDropped(venueId, droppedScreens, ['Feed Screen', 'Feed Screens']);
  return screens;
};

/**
 * One Home section as mobile can use it, or undefined when it is malformed,
 * of an unknown kind, or reads a Feed key missing from `feeds`. Trending
 * keeps its sources in `feeds`, without repeats, and pushes the others to
 * `dropped`; it is unusable without one.
 */
const parseHomeSection = (
  entry: unknown,
  feeds: Partial<Record<PredictFeedKey, PredictFeedId>>,
  dropped: unknown[],
): PredictHomeSection | undefined => {
  const withScreen = (screen: string | undefined): { screen?: string } =>
    screen === undefined ? {} : { screen };
  if (is(entry, trendingSectionSchema)) {
    const sources: PredictFeedKey[] = [];
    for (const source of entry.sources) {
      if (
        typeof source === 'string' &&
        hasOwn(feeds, source) &&
        !sources.includes(source)
      ) {
        sources.push(source);
      } else {
        dropped.push(source);
      }
    }
    return sources.length > 0
      ? { kind: 'trending', sources, ...withScreen(entry.screen) }
      : undefined;
  }
  if (is(entry, gamesRowSectionSchema) && hasOwn(feeds, entry.feed)) {
    const { id, title, feed, screen } = entry;
    return { kind: 'games-row', id, title, feed, ...withScreen(screen) };
  }
  if (is(entry, categoriesSectionSchema)) {
    return { kind: 'categories' };
  }
  if (is(entry, feedPreviewSectionSchema) && hasOwn(feeds, entry.feed)) {
    const { id, title, feed, screen } = entry;
    return { kind: 'feed-preview', id, title, feed, screen };
  }
  return undefined;
};

/** The Feed keys a Home section reads, in read order. */
export const getHomeSectionFeedKeys = (
  section: PredictHomeSection,
): readonly PredictFeedKey[] => {
  switch (section.kind) {
    case 'trending':
      return section.sources;
    case 'games-row':
    case 'feed-preview':
      return [section.feed];
    default:
      return [];
  }
};

/** Whether `section` repeats an earlier section's ID, or is a second
 * Trending or Categories, which have no ID. */
const repeatsEarlierSection = (
  section: PredictHomeSection,
  earlier: readonly PredictHomeSection[],
): boolean =>
  earlier.some((other) =>
    'id' in section
      ? 'id' in other && other.id === section.id
      : other.kind === section.kind,
  );

/**
 * `section` trimmed to the Feed reads Home has room for, or undefined when
 * it does not fit. Home reads at most {@link MAX_HOME_FEED_READS} distinct
 * Feeds; a key an earlier section reads costs nothing. Trending keeps the
 * sources that fit, in order; any other section fits whole or not at all.
 */
const fitHomeFeedReads = (
  section: PredictHomeSection,
  readKeys: ReadonlySet<PredictFeedKey>,
): PredictHomeSection | undefined => {
  const room = MAX_HOME_FEED_READS - readKeys.size;
  const newKeys = getHomeSectionFeedKeys(section).filter(
    (key) => !readKeys.has(key),
  );
  if (newKeys.length <= room) {
    return section;
  }
  if (section.kind !== 'trending') {
    return undefined;
  }
  const fits = new Set(newKeys.slice(0, room));
  const sources = section.sources.filter(
    (key) => readKeys.has(key) || fits.has(key),
  );
  return sources.length > 0 ? { ...section, sources } : undefined;
};

/**
 * PredictNext Home's sections in catalog order (PRED-1527). The API adds
 * section kinds and fields after a build ships, so nothing here rejects the
 * catalog. A section is dropped and logged when it is malformed, of an
 * unknown kind, reads a Feed key missing from `feeds`, repeats an earlier
 * section's ID (or is a second Trending or Categories), comes after the
 * eighth kept section, or would take Home past eight distinct Feed reads (a
 * Trending keeps the sources that fit). A Trending source missing from
 * `feeds`, or repeated, is dropped and logged and the section kept. A `screen` is kept even when
 * `screens` lacks it: the header looks it up and opens nothing without it.
 * A missing field is a catalog from before PRED-1527 and means no Home
 * sections; so does a `home` that is not an object with a `sections` array,
 * which is logged.
 */
const parseHome = (
  value: unknown,
  feeds: Partial<Record<PredictFeedKey, PredictFeedId>>,
  venueId: PredictVenueId,
): PredictVenueHome | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (!is(value, homeSchema)) {
    logDropped(venueId, [value], ['Home', 'Homes']);
    return undefined;
  }
  const sections: PredictHomeSection[] = [];
  const droppedSections: unknown[] = [];
  const droppedSources: unknown[] = [];
  const readKeys = new Set<PredictFeedKey>();
  for (const entry of value.sections) {
    const parsed = parseHomeSection(entry, feeds, droppedSources);
    const section =
      parsed &&
      sections.length < MAX_HOME_SECTIONS &&
      !repeatsEarlierSection(parsed, sections)
        ? fitHomeFeedReads(parsed, readKeys)
        : undefined;
    if (!section) {
      droppedSections.push(entry);
      continue;
    }
    if (parsed && section !== parsed && section.kind === 'trending') {
      droppedSources.push(
        ...getHomeSectionFeedKeys(parsed).filter(
          (key) => !section.sources.includes(key),
        ),
      );
    }
    getHomeSectionFeedKeys(section).forEach((key) => readKeys.add(key));
    sections.push(section);
  }
  logDropped(venueId, droppedSources, ['Trending source', 'Trending sources']);
  logDropped(venueId, droppedSections, ['Home section', 'Home sections']);
  return { sections };
};

const optionalHome = (
  home: PredictVenueHome | undefined,
): { home?: PredictVenueHome } => (home ? { home } : {});

/**
 * Parses a Venue catalog for `expectedVenueId`. Unknown actions are dropped.
 * Feed entries, Categories, Feed Screens and Home sections are checked one by
 * one, and a bad one is dropped and logged (see their parsers). Anything else structurally
 * wrong, or a catalog for another Venue, throws `INVALID_RESPONSE`, so a
 * caller that fails closed enables nothing.
 */
export const parsePredictVenueCatalog = (
  value: unknown,
  expectedVenueId: PredictVenueId,
): PredictVenueCatalog => {
  if (!is(value, venueCatalogSchema) || Array.isArray(value.feeds)) {
    throw invalidCatalog('malformed');
  }
  if (value.venueId !== expectedVenueId) {
    throw invalidCatalog(`expected ${expectedVenueId}, got ${value.venueId}`);
  }

  const actions = [
    ...new Set(value.actions.filter((action) => KNOWN_ACTIONS.has(action))),
  ] as PredictVenueAction[];

  const feeds = parseFeeds(value.feeds, expectedVenueId);

  return {
    venueId: expectedVenueId,
    ...(value.environment !== undefined
      ? { environment: value.environment }
      : {}),
    actions,
    feeds,
    categories: parseCategories(value.categories, feeds, expectedVenueId),
    searchSupported: value.searchSupported,
    screens: parseFeedScreens(value.screens, feeds, expectedVenueId),
    ...optionalHome(parseHome(value.home, feeds, expectedVenueId)),
  };
};
