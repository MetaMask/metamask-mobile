import {
  array,
  boolean,
  is,
  record,
  refine,
  string,
  type,
  unknown,
} from '@metamask/superstruct';
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
// shape still rejects the catalog.
const venueCatalogSchema = type({
  venueId: nonEmptyString,
  actions: array(string()),
  feeds: record(string(), unknown()),
  searchSupported: boolean(),
});

const KNOWN_ACTIONS: ReadonlySet<string> = new Set(PREDICT_VENUE_ACTIONS);
const KNOWN_FEED_KEYS: ReadonlySet<string> = new Set(PREDICT_FEED_KEYS);

const invalidCatalog = (reason: string) =>
  PredictError.from(PredictErrorCode.INVALID_RESPONSE, {
    message: `Invalid Venue catalog: ${reason}.`,
  });

/**
 * Parses a Venue catalog for `expectedVenueId`. Unknown actions and Feed keys
 * are dropped. Anything structurally wrong, a known Feed key without a Feed
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
    searchSupported: value.searchSupported,
  };
};
