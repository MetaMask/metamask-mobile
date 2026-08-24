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
  FetchFeedParams,
  PredictEvent,
  PredictFeed,
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
const amount = refine(string(), 'PredictAmount', (value) =>
  /^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value),
);
const hexColor = refine(string(), 'PredictHexColor', (value) =>
  /^#[0-9a-f]{6}$/i.test(value),
);
const httpsUrl = refine(string(), 'PredictHttpsUrl', (value) => {
  if (!/^https:\/\//i.test(value)) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname.length > 0;
  } catch {
    return false;
  }
});
const status = enums([
  'initialized',
  'active',
  'inactive',
  'closed',
  'determined',
  'disputed',
  'amended',
  'finalized',
] as const);
const venueStatus = enums(['available', 'degraded', 'unavailable'] as const);
const side = enums(['yes', 'no'] as const);
const gameSelection = enums(['home', 'away', 'draw'] as const);
const gameStatus = enums([
  'scheduled',
  'in_progress',
  'delayed',
  'suspended',
  'postponed',
  'completed',
  'canceled',
] as const);

const teamSchema = object({
  name: string(),
  abbreviation: optional(string()),
  logoUrl: optional(httpsUrl),
  primaryColor: optional(hexColor),
});

const gameSchema = object({
  status: gameStatus,
  homeTeam: teamSchema,
  awayTeam: teamSchema,
  score: optional(
    object({
      home: string(),
      away: string(),
    }),
  ),
  period: optional(string()),
  clock: optional(string()),
  observedAt: timestamp,
});

const sportsContextSchema = object({
  sport: object({ id: entityId, label: string() }),
  competition: optional(object({ id: entityId, label: string() })),
  game: optional(gameSchema),
});

const settlementSourceSchema = object({
  name: string(),
  url: httpsUrl,
});

const outcomeSchema = object({
  id: entityId,
  side,
  label: string(),
  askPrice: optional(decimal),
  bidPrice: optional(decimal),
  gameSelection: optional(gameSelection),
});

const binaryOutcomes = refine(
  tuple([outcomeSchema, outcomeSchema]),
  'BinaryOutcomes',
  (outcomes) => new Set(outcomes.map((outcome) => outcome.side)).size === 2,
);

const marketSchema = object({
  id: entityId,
  question: string(),
  rules: optional(string()),
  outcomes: binaryOutcomes,
  status,
  volume: optional(amount),
  volume24h: optional(amount),
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
  category: optional(string()),
  volume: optional(amount),
  volume24h: optional(amount),
  imageUrl: optional(httpsUrl),
  sports: optional(sportsContextSchema),
  settlementSources: optional(array(settlementSourceSchema)),
  markets: nonEmptyMarkets,
});

const feedSchema = object({
  venueId,
  id: entityId,
  title: string(),
  events: array(eventSchema),
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

export const parsePredictFeed = (value: unknown): PredictFeed =>
  parse(value, feedSchema) as unknown as PredictFeed;

export const parsePredictMarket = (value: unknown): PredictMarket =>
  parse(value, marketSchema) as unknown as PredictMarket;

export const parsePredictVenueStatus = (value: unknown): PredictVenueStatus =>
  parse(value, venueStatusSchema) as unknown as PredictVenueStatus;

export const parseFetchFeedParams = (value: unknown): FetchFeedParams =>
  parse(value, eventsParamsSchema);
