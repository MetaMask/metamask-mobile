import {
  array,
  boolean,
  is,
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
  PREDICT_FEED_KEYS,
  PREDICT_VENUE_ACTIONS,
  type PredictFeedId,
  type PredictFeedKey,
  type PredictVenueAction,
  type PredictVenueCatalog,
  type PredictVenueId,
} from '../../types';

const nonEmptyString = refine(
  string(),
  'NonEmptyString',
  (value) => value.length > 0,
);

// Unknown fields are ignored, and unknown actions and Feed keys are dropped
// below, so the schema accepts any string there. A known field with the wrong
// shape still rejects the catalog, except `categories`: it only drives Home's
// chip row, so `parseCategories` drops what it can't use instead.
const venueCatalogSchema = type({
  venueId: nonEmptyString,
  actions: array(string()),
  feeds: record(string(), unknown()),
  categories: optional(unknown()),
  searchSupported: boolean(),
});

const KNOWN_ACTIONS: ReadonlySet<string> = new Set(PREDICT_VENUE_ACTIONS);
const KNOWN_FEED_KEYS: ReadonlySet<string> = new Set(PREDICT_FEED_KEYS);

const invalidCatalog = (reason: string) =>
  PredictError.from(PredictErrorCode.INVALID_RESPONSE, {
    message: `Invalid Venue catalog: ${reason}.`,
  });

/**
 * The Categories whose entry is a Feed key in the parsed `feeds`, in catalog
 * order, without repeats. Anything else is dropped and logged, never thrown:
 * a non-string entry, a key that is unknown or not in `feeds`, a repeat, or a
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
      Object.prototype.hasOwnProperty.call(feeds, entry) &&
      !categories.includes(entry as PredictFeedKey);
    if (isUsable) {
      categories.push(entry as PredictFeedKey);
    } else {
      dropped.push(entry);
    }
  }
  if (dropped.length > 0) {
    Logger.log(
      `[PredictNext] Dropped ${dropped.length} Venue catalog ${
        dropped.length === 1 ? 'Category' : 'Categories'
      } for ${venueId}`,
      { dropped },
    );
  }
  return categories;
};

/**
 * Parses a Venue catalog for `expectedVenueId`. Unknown actions and Feed keys
 * are dropped, and so is a Category whose Feed key was dropped or is absent. Anything structurally wrong, a known Feed key without a Feed
 * ID, or a catalog for another Venue throws `INVALID_RESPONSE`, so a caller
 * that fails closed enables nothing.
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

  const feeds: Partial<Record<PredictFeedKey, PredictFeedId>> = {};
  for (const [key, feedId] of Object.entries(value.feeds)) {
    if (!KNOWN_FEED_KEYS.has(key)) {
      continue;
    }
    if (!is(feedId, nonEmptyString)) {
      throw invalidCatalog(`Feed key ${key} has no Feed ID`);
    }
    feeds[key as PredictFeedKey] = feedId as PredictFeedId;
  }

  return {
    venueId: expectedVenueId,
    actions,
    feeds,
    categories: parseCategories(value.categories, feeds, expectedVenueId),
    searchSupported: value.searchSupported,
  };
};
