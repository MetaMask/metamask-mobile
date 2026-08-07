import {
  array,
  enums,
  number,
  object,
  optional,
  refine,
  string,
  tuple,
  type Struct,
  create,
} from '@metamask/superstruct';
import { PredictError, PredictErrorCode } from '../../errors';
import type {
  PredictEvent,
  PredictEventSummary,
  PredictMarket,
} from '../../types';

const timestamp = refine(
  string(),
  'PredictTimestamp',
  (value) =>
    !Number.isNaN(Date.parse(value)) &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value),
);

const venueId = refine(string(), 'PredictVenueId', (value) => value.length > 0);
const entityId = refine(
  string(),
  'PredictEntityId',
  (value) => value.length > 0,
);
const status = enums([
  'upcoming',
  'open',
  'closed',
  'resolved',
  'unavailable',
] as const);
const side = enums(['yes', 'no'] as const);

const outcomeSchema = object({
  venueId,
  id: entityId,
  marketId: entityId,
  side,
  label: string(),
});

const binaryOutcomes = refine(
  tuple([outcomeSchema, outcomeSchema]),
  'BinaryOutcomes',
  (outcomes) => new Set(outcomes.map((outcome) => outcome.side)).size === 2,
);

const marketSchema = object({
  venueId,
  id: entityId,
  eventId: entityId,
  question: string(),
  outcomes: binaryOutcomes,
  status,
  createdAt: optional(timestamp),
  updatedAt: optional(timestamp),
  opensAt: optional(timestamp),
  closesAt: optional(timestamp),
  resolvesAt: optional(timestamp),
});

const eventSummarySchema = object({
  venueId,
  id: entityId,
  title: string(),
  subtitle: optional(string()),
  startsAt: optional(timestamp),
  closesAt: optional(timestamp),
  updatedAt: optional(timestamp),
});

const nonEmptyMarkets = refine(
  array(marketSchema),
  'NonEmptyMarkets',
  (markets) => markets.length > 0,
);

const eventSchema = object({
  venueId,
  id: entityId,
  title: string(),
  subtitle: optional(string()),
  startsAt: optional(timestamp),
  closesAt: optional(timestamp),
  updatedAt: optional(timestamp),
  description: optional(string()),
  markets: nonEmptyMarkets,
});

const eventsParamsSchema = object({
  cursor: optional(string()),
  limit: optional(refine(number(), 'PositiveLimit', (value) => value > 0)),
});

function parse<T>(value: unknown, schema: Struct<T, unknown>): T {
  try {
    return create(value, schema);
  } catch (error) {
    throw PredictError.from(PredictErrorCode.UNKNOWN, {
      message: `Invalid Predict API response: ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
  }
}

export const parsePredictEventSummary = (value: unknown): PredictEventSummary =>
  parse(value, eventSummarySchema) as unknown as PredictEventSummary;

export const parsePredictEvent = (value: unknown): PredictEvent =>
  parse(value, eventSchema) as unknown as PredictEvent;

export const parsePredictMarket = (value: unknown): PredictMarket =>
  parse(value, marketSchema) as unknown as PredictMarket;

export const parseFetchEventsParams = (value: unknown) =>
  parse(value, eventsParamsSchema);
