import {
  array,
  enums,
  mask,
  number,
  object,
  optional,
  refine,
  string,
  tuple,
  type Struct,
} from '@metamask/superstruct';
import { PredictError, PredictErrorCode } from '../../errors';
import type {
  FetchEventsParams,
  PaginatedResult,
  PredictEvent,
  PredictMarket,
  PredictVenueStatus,
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
const decimal = refine(
  string(),
  'PredictDecimal',
  (value) => /^(?:0(?:\.\d+)?|1(?:\.0+)?)$/.test(value) && Number(value) <= 1,
);
const status = enums([
  'upcoming',
  'open',
  'closed',
  'resolved',
  'unavailable',
] as const);
const venueStatus = enums(['available', 'degraded', 'unavailable'] as const);
const side = enums(['yes', 'no'] as const);

const outcomeSchema = object({
  id: entityId,
  side,
  label: string(),
  askPrice: optional(decimal),
  bidPrice: optional(decimal),
});

const binaryOutcomes = refine(
  tuple([outcomeSchema, outcomeSchema]),
  'BinaryOutcomes',
  (outcomes) => new Set(outcomes.map((outcome) => outcome.side)).size === 2,
);

const marketSchema = object({
  id: entityId,
  question: string(),
  outcomes: binaryOutcomes,
  status,
  createdAt: optional(timestamp),
  updatedAt: optional(timestamp),
  opensAt: optional(timestamp),
  closesAt: optional(timestamp),
  resolvesAt: optional(timestamp),
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

const eventsPageSchema = object({
  items: array(eventSchema),
  nextCursor: optional(string()),
});

const venueStatusSchema = object({
  venueId,
  status: venueStatus,
  checkedAt: timestamp,
});

const eventsParamsSchema = object({
  cursor: optional(string()),
  limit: optional(refine(number(), 'PositiveLimit', (value) => value > 0)),
});

function parse<T>(value: unknown, schema: Struct<T, unknown>): T {
  try {
    return mask(value, schema);
  } catch {
    throw PredictError.from(PredictErrorCode.UNKNOWN, {
      message: 'Invalid Predict API response.',
    });
  }
}

export const parsePredictEvent = (value: unknown): PredictEvent =>
  parse(value, eventSchema) as unknown as PredictEvent;

export const parsePredictEventsPage = (
  value: unknown,
): PaginatedResult<PredictEvent> =>
  parse(value, eventsPageSchema) as unknown as PaginatedResult<PredictEvent>;

export const parsePredictMarket = (value: unknown): PredictMarket =>
  parse(value, marketSchema) as unknown as PredictMarket;

export const parsePredictVenueStatus = (value: unknown): PredictVenueStatus =>
  parse(value, venueStatusSchema) as unknown as PredictVenueStatus;

export const parseFetchEventsParams = (value: unknown): FetchEventsParams =>
  parse(value, eventsParamsSchema);
